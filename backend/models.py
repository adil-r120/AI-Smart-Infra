from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    scanner_config = Column(Text, nullable=True) # JSON stored as string
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    detections = relationship("Detection", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="assigned_user")

class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    object_type = Column(String(50), index=True)
    camera_id = Column(String(50), index=True)
    image_path = Column(String(255))
    is_danger = Column(Integer, default=0, index=True)
    is_redacted = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), index=True)

    # Relationships
    user = relationship("User", back_populates="detections")
    work_orders = relationship("WorkOrder", back_populates="detection", cascade="all, delete-orphan")

    # Composite Index for common dashboard query
    __table_args__ = (
        Index('idx_user_created', 'user_id', 'created_at'),
    )

class EdgeMetric(Base):
    __tablename__ = "edge_metrics"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), index=True)
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    bandwidth_saved_kb = Column(Float)
    inference_ms = Column(Float)
    privacy_compliance_score = Column(Float, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), index=True, nullable=True)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    problem_type = Column(String(50), index=True)
    description = Column(Text)
    location = Column(String(255))
    image_path = Column(String(255), nullable=True)
    status = Column(String(20), default="Pending", index=True)
    priority_level = Column(String(20), default="Medium")
    deterioration_score = Column(Float, default=0.0)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), index=True)

    user = relationship("User", back_populates="reports")

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey('detections.id', ondelete="CASCADE"), index=True)
    assigned_user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=True)
    status = Column(String(20), default="Assigned", index=True)
    priority = Column(String(20), default="Medium", index=True)
    notes = Column(Text, nullable=True)
    cost_estimate = Column(Float, default=0.0)
    assigned_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    detection = relationship("Detection", back_populates="work_orders")
    assigned_user = relationship("User", back_populates="work_orders")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    action = Column(String(100))
    table_name = Column(String(50))
    record_id = Column(Integer)
    timestamp = Column(DateTime, server_default=func.now(), index=True)

class AdminInviteToken(Base):
    __tablename__ = "admin_invite_tokens"
    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    used_by_user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=True)
    expires_at = Column(DateTime, index=True, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
