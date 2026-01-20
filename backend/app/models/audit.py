"""
Audit log model for P2P Platform.
"""

from sqlalchemy import Column, String, Integer, Text, DateTime
from datetime import datetime

from ..database import Base


class AuditLog(Base):
    """Immutable audit log entry."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Who
    user_id = Column(String(50), nullable=False, index=True)
    user_name = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # What
    action = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
    document_type = Column(String(50), nullable=False, index=True)  # requisition, po, invoice, etc.
    document_id = Column(String(50), nullable=False, index=True)
    document_number = Column(String(50), nullable=True)

    # Details
    field_changes = Column(Text, nullable=True)  # JSON: [{"field": "status", "old": "draft", "new": "pending"}]
    details = Column(Text, nullable=True)  # Additional context

    # Hash chain for immutability
    previous_hash = Column(String(64), nullable=True)
    record_hash = Column(String(64), nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.id}: {self.action} {self.document_type} {self.document_id}>"

    @classmethod
    def create_entry(
        cls,
        user_id: str,
        action: str,
        document_type: str,
        document_id: str,
        document_number: str = None,
        user_name: str = None,
        user_role: str = None,
        ip_address: str = None,
        field_changes: str = None,
        details: str = None,
    ) -> "AuditLog":
        """Factory method to create an audit entry."""
        return cls(
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            ip_address=ip_address,
            action=action,
            document_type=document_type,
            document_id=str(document_id),
            document_number=document_number,
            field_changes=field_changes,
            details=details,
        )
