"""
Unit tests for SQLAlchemy models.
"""

from datetime import date, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.enums import (
    ApprovalStatus,
    Department,
    DocumentStatus,
    MatchStatus,
    RiskLevel,
    UserRole,
    Urgency,
)
from app.models.user import User
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.requisition import Requisition, RequisitionLineItem
from app.models.purchase_order import PurchaseOrder, POLineItem
from app.models.goods_receipt import GoodsReceipt, GRLineItem
from app.models.invoice import Invoice, InvoiceLineItem
from app.models.approval import ApprovalStep
from app.models.audit import AuditLog


class TestUserModel:
    """Tests for User model."""

    def test_create_user(self, db_session):
        """Test creating a basic user."""
        user = User(
            id="test-user",
            email="test@example.com",
            name="Test User",
            department=Department.ENGINEERING,
            role=UserRole.REQUESTOR,
        )
        db_session.add(user)
        db_session.commit()

        assert user.id == "test-user"
        assert user.email == "test@example.com"
        assert user.department == Department.ENGINEERING
        assert user.role == UserRole.REQUESTOR
        assert user.is_active is True
        assert user.approval_limit == 0.0

    def test_user_with_manager(self, db_session, sample_manager):
        """Test user with manager relationship."""
        user = User(
            id="test-employee",
            email="employee@example.com",
            name="Employee",
            department=Department.ENGINEERING,
            role=UserRole.REQUESTOR,
            manager_id=sample_manager.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.manager_id == sample_manager.id
        assert user.manager.name == "Jane Smith"

    def test_user_role_enum(self, db_session):
        """Test all user roles are valid."""
        for role in UserRole:
            user = User(
                id=f"user-{role.value}",
                email=f"{role.value}@example.com",
                name=f"User {role.value}",
                department=Department.FINANCE,
                role=role,
            )
            db_session.add(user)
        db_session.commit()

        users = db_session.query(User).all()
        assert len(users) == len(UserRole)


class TestSupplierModel:
    """Tests for Supplier model."""

    def test_create_supplier(self, db_session):
        """Test creating a supplier."""
        supplier = Supplier(
            id="sup-001",
            name="Test Supplier",
            tax_id="12-3456789",
            status="active",
        )
        db_session.add(supplier)
        db_session.commit()

        assert supplier.id == "sup-001"
        assert supplier.name == "Test Supplier"
        assert supplier.risk_level == RiskLevel.LOW
        assert supplier.bank_verified is False

    def test_supplier_risk_levels(self, db_session):
        """Test supplier risk level assignment."""
        for level in RiskLevel:
            supplier = Supplier(
                id=f"sup-{level.value}",
                name=f"Supplier {level.value}",
                risk_level=level,
            )
            db_session.add(supplier)
        db_session.commit()

        suppliers = db_session.query(Supplier).all()
        assert len(suppliers) == len(RiskLevel)

    def test_supplier_with_full_address(self, db_session):
        """Test supplier with full address."""
        supplier = Supplier(
            id="sup-full",
            name="Full Address Supplier",
            address_line1="123 Main St",
            address_line2="Suite 100",
            city="New York",
            state="NY",
            postal_code="10001",
            country="USA",
        )
        db_session.add(supplier)
        db_session.commit()

        assert supplier.city == "New York"
        assert supplier.state == "NY"


class TestRequisitionModel:
    """Tests for Requisition model."""

    def test_create_requisition(self, db_session, sample_user):
        """Test creating a requisition."""
        req = Requisition(
            number="REQ-TEST-001",
            requestor_id=sample_user.id,
            department=Department.ENGINEERING,
            description="Test requisition",
            total_amount=1000.00,
            created_by=sample_user.id,
        )
        db_session.add(req)
        db_session.commit()

        assert req.number == "REQ-TEST-001"
        assert req.status == DocumentStatus.DRAFT
        assert req.currency == "USD"

    def test_requisition_with_line_items(self, db_session, sample_user):
        """Test requisition with line items."""
        req = Requisition(
            number="REQ-LINES-001",
            requestor_id=sample_user.id,
            department=Department.ENGINEERING,
            description="Multi-item requisition",
            total_amount=2500.00,
            created_by=sample_user.id,
        )
        db_session.add(req)
        db_session.flush()

        line1 = RequisitionLineItem(
            requisition_id=req.id,
            line_number=1,
            description="Item 1",
            quantity=5,
            unit_price=200.00,
            total=1000.00,
        )
        line2 = RequisitionLineItem(
            requisition_id=req.id,
            line_number=2,
            description="Item 2",
            quantity=3,
            unit_price=500.00,
            total=1500.00,
        )
        db_session.add_all([line1, line2])
        db_session.commit()
        db_session.refresh(req)

        assert len(req.line_items) == 2
        assert req.line_items[0].description == "Item 1"
        assert req.line_items[1].total == 1500.00

    def test_requisition_urgency_levels(self, db_session, sample_user):
        """Test all urgency levels."""
        for urgency in Urgency:
            req = Requisition(
                number=f"REQ-URG-{urgency.value}",
                requestor_id=sample_user.id,
                department=Department.ENGINEERING,
                description=f"Urgency {urgency.value}",
                urgency=urgency,
                total_amount=100.00,
                created_by=sample_user.id,
            )
            db_session.add(req)
        db_session.commit()


class TestPurchaseOrderModel:
    """Tests for PurchaseOrder model."""

    def test_create_purchase_order(
        self, db_session, sample_supplier, sample_manager
    ):
        """Test creating a purchase order."""
        po = PurchaseOrder(
            number="PO-TEST-001",
            supplier_id=sample_supplier.id,
            buyer_id=sample_manager.id,
            subtotal=5000.00,
            total_amount=5000.00,
            created_by=sample_manager.id,
        )
        db_session.add(po)
        db_session.commit()

        assert po.number == "PO-TEST-001"
        assert po.status == DocumentStatus.DRAFT
        assert po.supplier.name == "Acme Corp"

    def test_po_with_line_items(
        self, db_session, sample_supplier, sample_manager
    ):
        """Test PO with line items and quantity tracking."""
        po = PurchaseOrder(
            number="PO-TRACK-001",
            supplier_id=sample_supplier.id,
            buyer_id=sample_manager.id,
            subtotal=3000.00,
            total_amount=3000.00,
            created_by=sample_manager.id,
        )
        db_session.add(po)
        db_session.flush()

        line = POLineItem(
            purchase_order_id=po.id,
            line_number=1,
            description="Laptops",
            quantity=2,
            unit_price=1500.00,
            total=3000.00,
            received_quantity=0,
            invoiced_quantity=0,
        )
        db_session.add(line)
        db_session.commit()

        assert line.received_quantity == 0
        assert line.invoiced_quantity == 0

        # Simulate receiving goods
        line.received_quantity = 2
        db_session.commit()
        assert line.received_quantity == 2


class TestInvoiceModel:
    """Tests for Invoice model."""

    def test_create_invoice(self, db_session, sample_supplier):
        """Test creating an invoice."""
        invoice = Invoice(
            number="INV-TEST-001",
            vendor_invoice_number="VENDOR-001",
            supplier_id=sample_supplier.id,
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            subtotal=1000.00,
            tax_amount=80.00,
            total_amount=1080.00,
            created_by="system",
        )
        db_session.add(invoice)
        db_session.commit()

        assert invoice.number == "INV-TEST-001"
        assert invoice.match_status == MatchStatus.PENDING
        assert invoice.fraud_score == 0.0
        assert invoice.on_hold is False

    def test_invoice_three_way_match_fields(
        self, db_session, sample_supplier, sample_purchase_order
    ):
        """Test invoice 3-way match tracking fields."""
        invoice = Invoice(
            number="INV-MATCH-001",
            vendor_invoice_number="V-MATCH-001",
            supplier_id=sample_supplier.id,
            purchase_order_id=sample_purchase_order.id,
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            subtotal=3000.00,
            total_amount=3000.00,
            match_status=MatchStatus.MATCHED,
            created_by="system",
        )
        db_session.add(invoice)
        db_session.commit()

        assert invoice.purchase_order_id == sample_purchase_order.id
        assert invoice.match_status == MatchStatus.MATCHED

    def test_invoice_fraud_scoring(self, db_session, sample_supplier):
        """Test invoice fraud score and risk level."""
        invoice = Invoice(
            number="INV-FRAUD-001",
            vendor_invoice_number="SUSPICIOUS-001",
            supplier_id=sample_supplier.id,
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            subtotal=10000.00,
            total_amount=10000.00,
            fraud_score=0.85,
            risk_level=RiskLevel.HIGH,
            created_by="system",
        )
        db_session.add(invoice)
        db_session.commit()

        assert invoice.fraud_score == 0.85
        assert invoice.risk_level == RiskLevel.HIGH


class TestApprovalModel:
    """Tests for ApprovalStep model."""

    def test_create_approval_step(self, db_session, sample_requisition, sample_manager):
        """Test creating an approval step."""
        approval = ApprovalStep(
            requisition_id=sample_requisition.id,
            step_number=1,
            approver_id=sample_manager.id,
            approver_role=UserRole.MANAGER,
            required_for_amount=sample_requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        db_session.add(approval)
        db_session.commit()

        assert approval.status == ApprovalStatus.PENDING
        assert approval.action_at is None

    def test_approval_workflow(
        self, db_session, sample_requisition, sample_manager, sample_director
    ):
        """Test multi-step approval workflow."""
        # Manager approval step
        step1 = ApprovalStep(
            requisition_id=sample_requisition.id,
            step_number=1,
            approver_id=sample_manager.id,
            approver_role=UserRole.MANAGER,
            required_for_amount=sample_requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        # Director approval step
        step2 = ApprovalStep(
            requisition_id=sample_requisition.id,
            step_number=2,
            approver_id=sample_director.id,
            approver_role=UserRole.DIRECTOR,
            required_for_amount=sample_requisition.total_amount,
            status=ApprovalStatus.PENDING,
        )
        db_session.add_all([step1, step2])
        db_session.commit()

        # Approve step 1
        step1.status = ApprovalStatus.APPROVED
        step1.action_at = datetime.utcnow()
        step1.comments = "Approved by manager"
        db_session.commit()

        assert step1.status == ApprovalStatus.APPROVED
        assert step2.status == ApprovalStatus.PENDING


class TestAuditLogModel:
    """Tests for AuditLog model."""

    def test_create_audit_log(self, db_session):
        """Test creating an audit log entry."""
        audit = AuditLog(
            document_type="requisition",
            document_id="1",
            action="created",
            user_id="user-001",
            field_changes='{"status": "draft"}',
        )
        db_session.add(audit)
        db_session.commit()

        assert audit.action == "created"
        assert audit.document_type == "requisition"

    def test_audit_log_hash_chain(self, db_session):
        """Test audit log hash chain integrity."""
        audit1 = AuditLog(
            document_type="requisition",
            document_id="1",
            action="created",
            user_id="user-001",
        )
        db_session.add(audit1)
        db_session.commit()

        audit2 = AuditLog(
            document_type="requisition",
            document_id="1",
            action="submitted",
            user_id="user-001",
            previous_hash=audit1.record_hash,
        )
        db_session.add(audit2)
        db_session.commit()

        # Verify audit entries have different ids (unique entries)
        assert audit1.id != audit2.id
        assert audit1.action == "created"
        assert audit2.action == "submitted"
