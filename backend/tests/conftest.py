"""
Pytest configuration and shared fixtures for P2P SaaS Platform tests.
"""

import os
import sys
from datetime import date, datetime, timedelta
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db, engine
from app.main import app
from app.models.enums import (
    Department,
    DocumentStatus,
    RiskLevel,
    UserRole,
    Urgency,
)
from app.models.user import User
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.requisition import Requisition, RequisitionLineItem
from app.models.purchase_order import PurchaseOrder, POLineItem
from app.models.invoice import Invoice, InvoiceLineItem


# ============= Test Database Configuration =============

@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a test database session with transaction rollback."""
    from app.database import reset_db
    
    # Reset database for each test
    reset_db()
    
    # Create a new session for each test
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        # Rollback any uncommitted changes and close
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with overridden database dependency."""
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# ============= Sample Data Fixtures =============


@pytest.fixture
def sample_user(db_session):
    """Create a sample user."""
    user = User(
        id="user-001",
        email="john.doe@example.com",
        name="John Doe",
        department=Department.ENGINEERING,
        role=UserRole.REQUESTOR,
        approval_limit=0.0,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_manager(db_session):
    """Create a sample manager."""
    manager = User(
        id="manager-001",
        email="jane.smith@example.com",
        name="Jane Smith",
        department=Department.ENGINEERING,
        role=UserRole.MANAGER,
        approval_limit=5000.0,
        is_active=True,
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)
    return manager


@pytest.fixture
def sample_director(db_session):
    """Create a sample director."""
    director = User(
        id="director-001",
        email="bob.johnson@example.com",
        name="Bob Johnson",
        department=Department.ENGINEERING,
        role=UserRole.DIRECTOR,
        approval_limit=25000.0,
        is_active=True,
    )
    db_session.add(director)
    db_session.commit()
    db_session.refresh(director)
    return director


@pytest.fixture
def sample_supplier(db_session):
    """Create a sample supplier."""
    supplier = Supplier(
        id="supplier-001",
        name="Acme Corp",
        tax_id="12-3456789",
        contact_name="Alice Contact",
        contact_email="alice@acme.com",
        contact_phone="555-1234",
        address_line1="123 Main St",
        city="New York",
        state="NY",
        postal_code="10001",
        country="USA",
        payment_terms="Net 30",
        status="active",
        risk_score=0.2,
        risk_level=RiskLevel.LOW,
        bank_verified=True,
    )
    db_session.add(supplier)
    db_session.commit()
    db_session.refresh(supplier)
    return supplier


@pytest.fixture
def high_risk_supplier(db_session):
    """Create a high-risk supplier."""
    supplier = Supplier(
        id="supplier-002",
        name="Risky Vendor LLC",
        status="active",
        risk_score=0.85,
        risk_level=RiskLevel.HIGH,
        bank_verified=False,
    )
    db_session.add(supplier)
    db_session.commit()
    db_session.refresh(supplier)
    return supplier


@pytest.fixture
def sample_product(db_session, sample_supplier):
    """Create a sample product."""
    product = Product(
        id="product-001",
        name="Office Laptop",
        description="High-performance laptop for office use",
        category="IT Equipment",
        sku="LAPTOP-001",
        unit_price=1500.00,
        currency="USD",
        preferred_supplier_id=sample_supplier.id,
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def sample_requisition(db_session, sample_user, sample_product):
    """Create a sample requisition."""
    requisition = Requisition(
        number="REQ-000001",
        status=DocumentStatus.DRAFT,
        requestor_id=sample_user.id,
        department=Department.ENGINEERING,
        description="Office equipment purchase",
        justification="New hire needs equipment",
        urgency=Urgency.STANDARD,
        needed_by_date=date.today() + timedelta(days=14),
        total_amount=3000.00,
        currency="USD",
        created_by=sample_user.id,
    )
    db_session.add(requisition)
    db_session.flush()

    line_item = RequisitionLineItem(
        requisition_id=requisition.id,
        line_number=1,
        description="Office Laptop",
        category="IT Equipment",
        product_id=sample_product.id,
        quantity=2,
        unit_price=1500.00,
        total=3000.00,
    )
    db_session.add(line_item)
    db_session.commit()
    db_session.refresh(requisition)
    return requisition


@pytest.fixture
def sample_purchase_order(db_session, sample_requisition, sample_supplier, sample_manager):
    """Create a sample purchase order."""
    po = PurchaseOrder(
        number="PO-000001",
        status=DocumentStatus.APPROVED,
        requisition_id=sample_requisition.id,
        supplier_id=sample_supplier.id,
        buyer_id=sample_manager.id,
        subtotal=3000.00,
        tax_amount=0.0,
        shipping_amount=0.0,
        total_amount=3000.00,
        currency="USD",
        payment_terms="Net 30",
        created_by=sample_manager.id,
    )
    db_session.add(po)
    db_session.flush()

    line_item = POLineItem(
        purchase_order_id=po.id,
        line_number=1,
        description="Office Laptop",
        quantity=2,
        unit_price=1500.00,
        total=3000.00,
    )
    db_session.add(line_item)
    db_session.commit()
    db_session.refresh(po)
    return po


@pytest.fixture
def sample_invoice(db_session, sample_purchase_order, sample_supplier):
    """Create a sample invoice."""
    invoice = Invoice(
        number="INV-000001",
        vendor_invoice_number="ACME-2024-001",
        status=DocumentStatus.PENDING_APPROVAL,
        supplier_id=sample_supplier.id,
        purchase_order_id=sample_purchase_order.id,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        subtotal=3000.00,
        tax_amount=0.0,
        total_amount=3000.00,
        currency="USD",
        created_by="system",
    )
    db_session.add(invoice)
    db_session.flush()

    po_line = sample_purchase_order.line_items[0]
    line_item = InvoiceLineItem(
        invoice_id=invoice.id,
        line_number=1,
        description="Office Laptop",
        quantity=2,
        unit_price=1500.00,
        total=3000.00,
        po_line_item_id=po_line.id,
    )
    db_session.add(line_item)
    db_session.commit()
    db_session.refresh(invoice)
    return invoice


# ============= Mock Fixtures =============


@pytest.fixture
def mock_bedrock_client():
    """Create a mock Bedrock runtime client."""
    with patch("boto3.client") as mock_client:
        mock_runtime = MagicMock()
        mock_response = {
            "body": MagicMock(
                read=MagicMock(
                    return_value=b'{"output": {"message": {"content": [{"text": "{\\"status\\": \\"approved\\"}"}]}}}'
                )
            )
        }
        mock_runtime.invoke_model.return_value = mock_response
        mock_client.return_value = mock_runtime
        yield mock_runtime


@pytest.fixture
def mock_websocket_callback():
    """Create a mock WebSocket callback for agent testing."""
    return AsyncMock()


# ============= Request Data Fixtures =============


@pytest.fixture
def requisition_create_data() -> dict:
    """Sample requisition creation data."""
    return {
        "requestor_id": "user-001",
        "department": "engineering",
        "description": "Office supplies for Q1",
        "justification": "Regular quarterly supplies",
        "urgency": "standard",
        "needed_by_date": (date.today() + timedelta(days=14)).isoformat(),
        "line_items": [
            {
                "description": "Printer Paper",
                "category": "Office Supplies",
                "quantity": 10,
                "unit_price": 25.00,
            },
            {
                "description": "Ink Cartridges",
                "category": "Office Supplies",
                "quantity": 5,
                "unit_price": 50.00,
            },
        ],
    }


@pytest.fixture
def po_create_data(sample_supplier, sample_manager) -> dict:
    """Sample PO creation data."""
    return {
        "supplier_id": sample_supplier.id,
        "buyer_id": sample_manager.id,
        "payment_terms": "Net 30",
        "line_items": [
            {
                "description": "Office Laptop",
                "quantity": 2,
                "unit_price": 1500.00,
            },
        ],
    }


@pytest.fixture
def invoice_create_data(sample_supplier) -> dict:
    """Sample invoice creation data."""
    return {
        "vendor_invoice_number": "TEST-INV-001",
        "supplier_id": sample_supplier.id,
        "invoice_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=30)).isoformat(),
        "subtotal": 1500.00,
        "tax_amount": 112.50,
        "line_items": [
            {
                "description": "Office Laptop",
                "quantity": 1,
                "unit_price": 1500.00,
            },
        ],
    }
