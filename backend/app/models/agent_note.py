"""
AgentNote model for tracking agent reasoning and flags.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..database import Base
from .base import DictMixin


class AgentNote(Base, DictMixin):
    """Tracks agent reasoning, decisions, and flags during workflow execution."""

    __tablename__ = "agent_notes"

    id = Column(Integer, primary_key=True, index=True)
    
    # Document reference
    document_type = Column(String(50), nullable=False, index=True)  # requisition, invoice, po, etc.
    document_id = Column(Integer, nullable=False, index=True)
    
    # Agent info
    agent_name = Column(String(100), nullable=False, index=True)  # fraud_agent, compliance_agent, etc.
    
    # Note content
    note = Column(Text, nullable=False)
    note_type = Column(String(50), default="info")  # info, warning, flag, decision
    
    # Context data (stored as JSON string in Text field for SQLite compatibility)
    context = Column(Text, nullable=True)
    
    # Flagging
    flagged = Column(Integer, default=0)  # 0 = no, 1 = yes
    flag_reason = Column(Text, nullable=True)
    
    # Resolution
    resolved = Column(Integer, default=0)  # 0 = no, 1 = yes
    resolved_by = Column(String(100), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)
    
    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f"<AgentNote {self.id}: {self.agent_name} on {self.document_type}/{self.document_id}>"
