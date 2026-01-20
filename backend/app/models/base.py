"""
Base model with common fields for audit tracking.
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional, Set

from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import RelationshipProperty


class DictMixin:
    """
    Mixin that provides to_dict() serialization for SQLAlchemy models.
    
    Handles:
    - Basic Python types (str, int, float, bool)
    - datetime/date objects (ISO format strings)
    - Decimal (float conversion)
    - Enums (value extraction)
    - Nested relationships (optional, shallow by default)
    """

    def to_dict(
        self,
        include_relationships: bool = False,
        exclude: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        """
        Convert model instance to dictionary.

        Args:
            include_relationships: If True, include related objects (shallow)
            exclude: Set of column names to exclude

        Returns:
            Dictionary representation of the model
        """
        exclude = exclude or set()
        result = {}

        # Get all column attributes
        for column in self.__table__.columns:
            if column.name in exclude:
                continue

            value = getattr(self, column.name, None)
            result[column.name] = self._serialize_value(value)

        # Optionally include relationships (shallow only)
        if include_relationships:
            for key, prop in self.__mapper__.relationships.items():
                if key in exclude:
                    continue
                
                related = getattr(self, key, None)
                if related is None:
                    result[key] = None
                elif isinstance(related, list):
                    # One-to-many: serialize each item
                    result[key] = [
                        item.to_dict() if hasattr(item, 'to_dict') else str(item)
                        for item in related
                    ]
                else:
                    # Many-to-one: serialize single item
                    result[key] = (
                        related.to_dict() if hasattr(related, 'to_dict') else str(related)
                    )

        return result

    @staticmethod
    def _serialize_value(value: Any) -> Any:
        """Serialize a single value to JSON-compatible type."""
        if value is None:
            return None
        elif isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, date):
            return value.isoformat()
        elif isinstance(value, Decimal):
            return float(value)
        elif isinstance(value, Enum):
            return value.value
        elif isinstance(value, (str, int, float, bool)):
            return value
        else:
            # Fallback: convert to string
            return str(value)


class TimestampMixin(DictMixin):
    """Mixin for created_at and updated_at timestamps with serialization support."""

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class AuditMixin(TimestampMixin):
    """Mixin for full audit fields with serialization support."""

    created_by = Column(String(50), nullable=True)
    updated_by = Column(String(50), nullable=True)
