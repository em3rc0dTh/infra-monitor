from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class TargetBase(BaseModel):
    name: str = "Nuevo Servidor"
    ip: str
    domain: str
    interval: int = 60
    webhook_url: Optional[str] = None
    notification_email: str = "soporte@thradex.com"
    active: bool = True

class TargetCreate(TargetBase):
    pass

class TargetUpdate(TargetBase):
    name: Optional[str] = None
    ip: Optional[str] = None
    domain: Optional[str] = None
    interval: Optional[int] = None
    notification_email: Optional[str] = None
    active: Optional[bool] = None

class TargetInDB(TargetBase):
    id: int
    latest_log: Optional[dict] = None

    class Config:
        from_attributes = True

class LogInDB(BaseModel):
    id: int
    target_id: int
    ts: datetime
    ip_ok: bool
    ip_status: str
    ip_ms: Optional[int]
    domain_ok: bool
    domain_status: str
    domain_ms: Optional[int]
    diag_level: str
    diag_title: str
    diag_body: str

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
