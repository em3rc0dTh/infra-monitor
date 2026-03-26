import asyncio
import httpx
import json
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from database import init_db, get_db, SessionLocal
from models import Target, Log, User
from schemas import TargetCreate, TargetUpdate, TargetInDB, Token, LoginRequest, LogInDB
from security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from config import settings

# ── Config & State ───────────────────────────────────────────────────────────

subscribers: List[asyncio.Queue] = []
active_monitors: Dict[int, asyncio.Task] = {}
N8N_EMAIL_WEBHOOK = settings.N8N_EMAIL_WEBHOOK

# ── Helpers ───────────────────────────────────────────────────────────────────

async def probe(url: str, timeout: float = 10.0) -> dict:
    start = time.monotonic()
    try:
        if not url.startswith("http"):
            url = f"http://{url}"
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            r = await client.get(url, timeout=timeout)
        ms = round((time.monotonic() - start) * 1000)
        return {"ok": r.status_code < 500, "status": r.status_code, "ms": ms}
    except httpx.TimeoutException:
        return {"ok": False, "status": "timeout", "ms": None}
    except Exception as e:
        return {"ok": False, "status": "error", "ms": str(e)[:50]}

def diagnose(ip_ok: bool, dom_ok: bool) -> dict:
    if ip_ok and dom_ok:
        return {"level": "ok", "title": "Todo en orden",
                "body": "IP y dominio responden correctamente."}
    if ip_ok and not dom_ok:
        return {"level": "warn", "title": "Problema con el dominio",
                "body": "La VPS responde pero el dominio no. Revisa DNS, Nginx/Apache o certificado SSL."}
    if not ip_ok and not dom_ok:
        return {"level": "crit", "title": "Todo está caído",
                "body": "Ni la IP ni el dominio responden. Revisa el servidor urgente."}
    return {"level": "warn", "title": "IP sin respuesta",
            "body": "El dominio responde pero la IP directa no. Revisa el firewall."}

async def send_webhooks(target: Target, entry: dict):
    # Standard Webhook (if configured)
    if target.webhook_url:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(target.webhook_url, json=entry, timeout=8)
        except Exception: pass

    # n8n Email Webhook for alerts/recovery
    diag = entry["diag"]
    
    # Color mapping for HTML headers
    colors = {"ok": "#10b981", "warn": "#f59e0b", "crit": "#ef4444", "recovery": "#10b981"}
    color = colors.get(diag["level"], "#6366f1")

    # Generate Rich HTML Body
    html_body = f"""
    <div style="font-family: sans-serif; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; max-width: 600px;">
        <div style="background-color: {color}; padding: 24px; color: white;">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">{diag['title']}</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Incidencia en <b>{target.name}</b></p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
            <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">{diag['body']}</p>
            
            <div style="display: table; width: 100%; border-spacing: 12px 0; margin-left: -12px; margin-bottom: 24px;">
                <div style="display: table-cell; background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; width: 50%;">
                    <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Servidor IP</span>
                    <p style="margin: 4px 0; font-family: monospace; font-weight: bold; color: #1e293b;">{target.ip}</p>
                    <span style="font-size: 11px; color: {'#10b981' if entry['ip_ok'] else '#ef4444'}">{'● En línea' if entry['ip_ok'] else '○ Caído'} ({entry['ip_ms'] or '--'}ms)</span>
                </div>
                <div style="display: table-cell; background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; width: 50%;">
                    <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Dominio URL</span>
                    <p style="margin: 4px 0; font-family: monospace; font-weight: bold; color: #1e293b;">{target.domain}</p>
                    <span style="font-size: 11px; color: {'#10b981' if entry['domain_ok'] else '#ef4444'}">{'● En línea' if entry['domain_ok'] else '○ Caído'} ({entry['domain_ms'] or '--'}ms)</span>
                </div>
            </div>

            <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; color: #94a3b8; font-size: 11px;">
                Detectado a las: {entry['ts']} (Hora UTC)
            </div>
        </div>
    </div>
    """
    
    payload = {
        "timestamp": entry["ts"],
        "target_name": target.name,
        "level": diag["level"],
        "title": diag["title"],
        "subject": f"[{diag['level'].upper()}] {diag['title']} - {target.name}",
        "body": html_body, # Now sending HTML
        "email_to": target.notification_email,
        "ip": {"address": target.ip, "ok": entry["ip_ok"], "status": entry["ip_status"], "ms": entry["ip_ms"]},
        "domain": {"address": target.domain, "ok": entry["domain_ok"], "status": entry["domain_status"], "ms": entry["domain_ms"]},
    }
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(N8N_EMAIL_WEBHOOK, json=payload, timeout=8)
    except Exception: pass

async def broadcast(event: str, data: dict):
    msg = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    dead = []
    for q in subscribers:
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        if q in subscribers:
            subscribers.remove(q)

# ── Monitor Loop ─────────────────────────────────────────────────────────────

async def monitor_target(target_id: int):
    prev_level = "ok"
    while True:
        async with SessionLocal() as db:
            result = await db.execute(select(Target).filter(Target.id == target_id))
            target = result.scalars().first()
            if not target or not target.active:
                break
            
            ip_res, dom_res = await asyncio.gather(
                probe(target.ip), 
                probe(target.domain if target.domain.startswith("http") else f"https://{target.domain}")
            )
            diag = diagnose(ip_res["ok"], dom_res["ok"])
            
            now = datetime.now(timezone.utc)
            log_entry = Log(
                target_id=target.id,
                ts=now,
                ip_ok=ip_res["ok"],
                ip_status=str(ip_res["status"]),
                ip_ms=ip_res["ms"],
                domain_ok=dom_res["ok"],
                domain_status=str(dom_res["status"]),
                domain_ms=dom_res["ms"],
                diag_level=diag["level"],
                diag_title=diag["title"],
                diag_body=diag["body"]
            )
            db.add(log_entry)
            await db.commit()
            
            event_data = {
                "id": target.id,
                "ts": now.isoformat(),
                "ip": ip_res,
                "domain": dom_res,
                "diag": diag,
            }
            await broadcast("check", event_data)
            
            # Send Webhook if level changed or is critical
            if diag["level"] != prev_level or diag["level"] == "crit":
                if diag["level"] != "ok" or prev_level != "ok":
                    entry_for_webhook = {
                        "ts": now.isoformat(),
                        "ip_ok": ip_res["ok"], "ip_status": str(ip_res["status"]), "ip_ms": ip_res["ms"],
                        "domain_ok": dom_res["ok"], "domain_status": str(dom_res["status"]), "domain_ms": dom_res["ms"],
                        "diag": diag
                    }
                    asyncio.create_task(send_webhooks(target, entry_for_webhook))
            
            prev_level = diag["level"]
            interval = target.interval
        
        await asyncio.sleep(interval)

# ── Lifecycle ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Create default admin if not exists
    async with SessionLocal() as db:
        result = await db.execute(select(User).filter(User.username == settings.ADMIN_USERNAME))
        if not result.scalars().first():
            print(f"--- CREATING DEFAULT ADMIN: {settings.ADMIN_USERNAME} ---")
            admin = User(username=settings.ADMIN_USERNAME, hashed_password=get_password_hash(settings.ADMIN_PASSWORD))
            db.add(admin)
            await db.commit()
            print("--- ADMIN CREATED SUCCESSFULLY ---")
        
        # Start monitors for all active targets
        result = await db.execute(select(Target).filter(Target.active))
        for target in result.scalars().all():
            active_monitors[target.id] = asyncio.create_task(monitor_target(target.id))
            
    yield
    # Cleanup
    for task in active_monitors.values():
        task.cancel()

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Routes ───────────────────────────────────────────────────────────────

@app.post("/token", response_model=Token)
async def login_for_access_token(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == req.username))
    user = result.scalars().first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ── Target Routes ─────────────────────────────────────────────────────────────

@app.get("/targets", response_model=List[TargetInDB])
async def get_targets(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Target))
    return result.scalars().all()

@app.post("/targets", response_model=TargetInDB)
async def create_target(req: TargetCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = Target(**req.dict())
    db.add(target)
    await db.commit()
    await db.refresh(target)
    
    if target.active:
        active_monitors[target.id] = asyncio.create_task(monitor_target(target.id))
    return target

@app.get("/targets/{target_id}", response_model=TargetInDB)
async def get_target(target_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Target).filter(Target.id == target_id))
    target = result.scalars().first()
    if not target: raise HTTPException(404, "Target not found")
    return target

@app.put("/targets/{target_id}", response_model=TargetInDB)
async def update_target(target_id: int, req: TargetUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Target).filter(Target.id == target_id))
    target = result.scalars().first()
    if not target: raise HTTPException(404, "Target not found")
    
    update_data = req.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(target, k, v)
    
    await db.commit()
    await db.refresh(target)
    
    # Restart or Stop monitor
    if target_id in active_monitors:
        active_monitors[target_id].cancel()
    
    if target.active:
        active_monitors[target_id] = asyncio.create_task(monitor_target(target.id))
        
    return target

@app.delete("/targets/{target_id}")
async def delete_target(target_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if target_id in active_monitors:
        active_monitors[target_id].cancel()
        del active_monitors[target_id]
        
    await db.execute(delete(Target).where(Target.id == target_id))
    await db.commit()
    return {"status": "deleted"}

@app.get("/targets/{target_id}/logs", response_model=List[LogInDB])
async def get_target_logs(target_id: int, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Log).filter(Log.target_id == target_id).order_by(Log.ts.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

# ── Real-time Stream ──────────────────────────────────────────────────────────

@app.get("/stream")
async def stream():
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    subscribers.append(q)

    # Initial snapshot to client? Or let them fetch /targets first
    
    async def event_gen():
        try:
            while True:
                msg = await asyncio.wait_for(q.get(), timeout=30)
                yield msg
        except (asyncio.TimeoutError, asyncio.CancelledError):
            pass
        finally:
            if q in subscribers:
                subscribers.remove(q)

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
