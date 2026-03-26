# Infra Monitor

Monitor de IP + dominio con diagnóstico automático y webhook para n8n.

## Estructura

```
infra-monitor/
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    └── src/app/page.tsx  (Next.js App Router)
```

## Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend (Next.js)

```bash
cd frontend
npm install
# Crea un archivo .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Abre http://localhost:3000

## En producción

- Backend: usa `uvicorn main:app --host 0.0.0.0 --port 8000` (o gunicorn con workers uvicorn)
- Frontend: `npm run build && npm start`
- Recuerda actualizar `NEXT_PUBLIC_API_URL` con la URL real del backend

## Webhook n8n

Cuando hay un problema, el backend hace POST a tu webhook con este JSON:

```json
{
  "timestamp": "2026-03-26T15:00:00Z",
  "level": "crit",
  "title": "Todo está caído",
  "ip":     { "address": "1.2.3.4", "ok": false, "status": "timeout", "ms": null },
  "domain": { "address": "https://tudominio.com", "ok": false, "status": "error", "ms": null }
}
```

`level` puede ser: `"warn"` | `"crit"` | `"recovery"`

En n8n: Webhook trigger → Switch por `level` → Send Email / Slack / WhatsApp.
