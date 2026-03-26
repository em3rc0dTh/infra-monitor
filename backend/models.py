from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from database import Base

class Target(Base):
    __tablename__ = "targets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), default="Nuevo Servidor")
    ip: Mapped[str] = mapped_column(String(255))
    domain: Mapped[str] = mapped_column(String(255))
    interval: Mapped[int] = mapped_column(Integer, default=60)
    webhook_url: Mapped[str] = mapped_column(String(512), nullable=True)
    notification_email: Mapped[str] = mapped_column(String(255), default="soporte@thradex.com")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    logs = relationship("Log", back_populates="target", cascade="all, delete-orphan")

class Log(Base):
    __tablename__ = "logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"))
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    ip_ok: Mapped[bool] = mapped_column(Boolean)
    ip_status: Mapped[str] = mapped_column(String(50))
    ip_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    
    domain_ok: Mapped[bool] = mapped_column(Boolean)
    domain_status: Mapped[str] = mapped_column(String(50))
    domain_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    
    diag_level: Mapped[str] = mapped_column(String(20))
    diag_title: Mapped[str] = mapped_column(String(255))
    diag_body: Mapped[str] = mapped_column(Text)

    target = relationship("Target", back_populates="logs")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
