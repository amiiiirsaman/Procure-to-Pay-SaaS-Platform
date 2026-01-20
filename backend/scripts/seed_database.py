"""
Seed database with realistic test data for the P2P platform.

Usage:
    cd backend
    python -m scripts.seed_database

This creates 100+ data points across all entities.
"""

import sys
import os
from datetime import date, datetime, timedelta
from decimal import Decimal
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db, reset_db
from app.models.enums import (
    ApprovalStatus,
    Department,
    DocumentStatus,
    RiskLevel,
    UserRole,
    Urgency,
    PaymentStatus,
    MatchStatus,
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
from tests.data_generator import P2PDataGenerator


def seed_database(
    num_users: int = 20,
    num_suppliers: int = 15,
    num_products: int = 50,
    num_requisitions: int = 36,
    seed: int = 42,
    reset: bool = True,
) -> dict[str, int]:
    """Seed the database with test data.
    
    Args:
        num_users: Number of users to create
        num_suppliers: Number of suppliers to create
        num_products: Number of products to create
        num_requisitions: Number of requisitions (generates ~70% POs, ~80% of POs get invoices)
        seed: Random seed for reproducibility
        reset: Whether to drop and recreate tables
    
    Returns:
        Dictionary with counts of created entities
    """
    random.seed(seed)
    
    if reset:
        print("🗑️  Resetting database...")
        reset_db()
    else:
        print("📋 Initializing database...")
        init_db()
    
    db = SessionLocal()
    counts = {
        "users": 0,
        "suppliers": 0, 
        "products": 0,
        "requisitions": 0,
        "purchase_orders": 0,
        "goods_receipts": 0,
        "invoices": 0,
        "approvals": 0,
        "audit_logs": 0,
    }
    
    try:
        # ============= 1. Create Users =============
        print("\n👥 Creating users...")
        
        # Define user hierarchy
        user_configs = [
            # Requestors (10)
            *[{"role": UserRole.REQUESTOR, "dept": random.choice(list(Department))} for _ in range(10)],
            # Managers (4)
            {"role": UserRole.MANAGER, "dept": Department.ENGINEERING},
            {"role": UserRole.MANAGER, "dept": Department.MARKETING},
            {"role": UserRole.MANAGER, "dept": Department.SALES},
            {"role": UserRole.MANAGER, "dept": Department.OPERATIONS},
            # Directors (2)
            {"role": UserRole.DIRECTOR, "dept": Department.ENGINEERING},
            {"role": UserRole.DIRECTOR, "dept": Department.FINANCE},
            # Executives (2)
            {"role": UserRole.VP, "dept": Department.OPERATIONS},
            {"role": UserRole.CFO, "dept": Department.FINANCE},
            # Procurement (2)
            {"role": UserRole.BUYER, "dept": Department.OPERATIONS},
            {"role": UserRole.PROCUREMENT_MANAGER, "dept": Department.OPERATIONS},
        ]
        
        generator = P2PDataGenerator(seed=seed)
        users_by_role = {}
        
        for i, config in enumerate(user_configs[:num_users]):
            user_data = generator.generate_user(
                role=config["role"].value if hasattr(config["role"], "value") else config["role"],
                department=config["dept"].value if hasattr(config["dept"], "value") else config["dept"],
            )
            
            # Map approval limits
            approval_limits = {
                UserRole.REQUESTOR: 0.0,
                UserRole.BUYER: 5000.0,
                UserRole.MANAGER: 10000.0,
                UserRole.PROCUREMENT_MANAGER: 25000.0,
                UserRole.DIRECTOR: 50000.0,
                UserRole.VP: 100000.0,
                UserRole.CFO: 500000.0,
            }
            
            user = User(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data["name"],
                department=config["dept"],
                role=config["role"],
                approval_limit=approval_limits.get(config["role"], 0.0),
                is_active=True,
            )
            db.add(user)
            
            if config["role"] not in users_by_role:
                users_by_role[config["role"]] = []
            users_by_role[config["role"]].append(user)
            counts["users"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['users']} users")
        
        # ============= 2. Create Suppliers =============
        print("\n🏭 Creating suppliers...")
        
        suppliers = []
        risk_distribution = ["low"] * 10 + ["medium"] * 4 + ["high"] * 1
        
        for i in range(num_suppliers):
            risk = risk_distribution[i % len(risk_distribution)]
            sup_data = generator.generate_supplier(risk_level=risk)
            
            risk_map = {"low": RiskLevel.LOW, "medium": RiskLevel.MEDIUM, "high": RiskLevel.HIGH}
            
            supplier = Supplier(
                id=sup_data["id"],
                name=sup_data["name"],
                tax_id=sup_data.get("tax_id"),
                contact_name=sup_data.get("contact_name"),
                contact_email=sup_data.get("contact_email"),
                contact_phone=sup_data.get("contact_phone"),
                address_line1=sup_data.get("address"),
                city=sup_data.get("city"),
                state=sup_data.get("state"),
                postal_code=sup_data.get("zip_code"),
                country=sup_data.get("country", "USA"),
                payment_terms=sup_data.get("payment_terms", "Net 30"),
                bank_verified=sup_data.get("bank_verified", True),
                risk_level=risk_map.get(risk, RiskLevel.LOW),
                risk_score=round(random.uniform(0.1, 0.9), 2) if risk != "low" else round(random.uniform(0.0, 0.3), 2),
                status="active",
            )
            db.add(supplier)
            suppliers.append(supplier)
            counts["suppliers"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['suppliers']} suppliers")
        
        # ============= 3. Create Products =============
        print("\n📦 Creating products...")
        
        products = []
        for i in range(num_products):
            prod_data = generator.generate_product()
            
            product = Product(
                id=prod_data["id"],
                name=prod_data["name"],
                description=prod_data.get("description", ""),
                category=prod_data["category"],
                unit_price=Decimal(str(prod_data["unit_price"])),
                unit_of_measure=prod_data.get("unit_of_measure", "EA"),
                is_active=True,
            )
            db.add(product)
            products.append(product)
            counts["products"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['products']} products")
        
        # ============= 4. Create Requisitions =============
        print("\n📝 Creating requisitions...")
        
        requestors = users_by_role.get(UserRole.REQUESTOR, [])
        if not requestors:
            requestors = list(db.query(User).limit(5).all())
        
        requisitions = []
        status_distribution = [
            DocumentStatus.DRAFT,
            DocumentStatus.PENDING_APPROVAL,
            DocumentStatus.PENDING_APPROVAL,
            DocumentStatus.APPROVED,
            DocumentStatus.APPROVED,
            DocumentStatus.APPROVED,
            DocumentStatus.ORDERED,
            DocumentStatus.ORDERED,
            DocumentStatus.RECEIVED,
            DocumentStatus.REJECTED,
        ]
        
        for i in range(num_requisitions):
            requestor = random.choice(requestors)
            status = status_distribution[i % len(status_distribution)]
            urgency = random.choices(
                [Urgency.STANDARD, Urgency.URGENT, Urgency.EMERGENCY],
                weights=[70, 25, 5]
            )[0]
            
            # Generate line items
            num_lines = random.randint(1, 4)
            total_amount = Decimal("0.00")
            
            req = Requisition(
                number=f"REQ-{i+1:05d}",
                requestor_id=requestor.id,
                department=requestor.department,
                description=f"Requisition for {random.choice(list(P2PDataGenerator.PRODUCT_CATALOG.keys()))}",
                justification=f"Business need for project #{random.randint(100, 999)}",
                urgency=urgency,
                needed_by_date=date.today() + timedelta(days=random.randint(7, 45)),
                status=status,
                created_by=requestor.id,
                created_at=datetime.now() - timedelta(days=random.randint(1, 60)),
            )
            db.add(req)
            db.flush()
            
            # Add line items
            for line_num in range(1, num_lines + 1):
                product = random.choice(products)
                quantity = random.randint(1, 10)
                unit_price = product.unit_price * Decimal(str(random.uniform(0.9, 1.1)))
                line_total = quantity * unit_price
                total_amount += line_total
                
                line = RequisitionLineItem(
                    requisition_id=req.id,
                    line_number=line_num,
                    description=product.name,
                    category=product.category,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=unit_price,
                    total=line_total,
                    suggested_supplier_id=random.choice(suppliers).id,
                )
                db.add(line)
            
            req.total_amount = total_amount
            requisitions.append(req)
            counts["requisitions"] += 1
            
            # Create approval steps for pending/approved requisitions
            if status in [DocumentStatus.PENDING_APPROVAL, DocumentStatus.APPROVED]:
                managers = users_by_role.get(UserRole.MANAGER, [])
                if managers:
                    approval = ApprovalStep(
                        requisition_id=req.id,
                        step_number=1,
                        approver_id=random.choice(managers).id,
                        approver_role=UserRole.MANAGER,
                        required_for_amount=total_amount,
                        status=ApprovalStatus.APPROVED if status == DocumentStatus.APPROVED else ApprovalStatus.PENDING,
                        action_at=datetime.now() if status == DocumentStatus.APPROVED else None,
                    )
                    db.add(approval)
                    counts["approvals"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['requisitions']} requisitions with {counts['approvals']} approval steps")
        
        # ============= 5. Create Purchase Orders =============
        print("\n📋 Creating purchase orders...")
        
        approved_reqs = [r for r in requisitions if r.status in [DocumentStatus.APPROVED, DocumentStatus.ORDERED, DocumentStatus.RECEIVED]]
        buyers = users_by_role.get(UserRole.BUYER, []) or list(db.query(User).limit(2).all())
        
        purchase_orders = []
        for req in approved_reqs:
            supplier = random.choice(suppliers)
            buyer = random.choice(buyers)
            
            po_status = random.choice([DocumentStatus.APPROVED, DocumentStatus.ORDERED, DocumentStatus.RECEIVED])
            if req.status == DocumentStatus.RECEIVED:
                po_status = DocumentStatus.RECEIVED
            
            po = PurchaseOrder(
                number=f"PO-{counts['purchase_orders']+1:06d}",
                requisition_id=req.id,
                supplier_id=supplier.id,
                buyer_id=buyer.id,
                status=po_status,
                payment_terms=supplier.payment_terms,
                expected_delivery_date=date.today() + timedelta(days=random.randint(7, 30)),
                subtotal=req.total_amount,
                tax_amount=req.total_amount * Decimal("0.08"),
                shipping_amount=Decimal(str(random.randint(0, 50))),
                total_amount=req.total_amount * Decimal("1.08") + Decimal(str(random.randint(0, 50))),
                created_by=buyer.id,
                created_at=datetime.now() - timedelta(days=random.randint(1, 30)),
            )
            db.add(po)
            db.flush()
            
            # Copy line items from requisition
            req_lines = db.query(RequisitionLineItem).filter(RequisitionLineItem.requisition_id == req.id).all()
            for req_line in req_lines:
                po_line = POLineItem(
                    purchase_order_id=po.id,
                    line_number=req_line.line_number,
                    product_id=req_line.product_id,
                    description=req_line.description,
                    quantity=req_line.quantity,
                    unit_price=req_line.unit_price,
                    total=req_line.total,
                )
                db.add(po_line)
            
            purchase_orders.append(po)
            counts["purchase_orders"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['purchase_orders']} purchase orders")
        
        # ============= 6. Create Goods Receipts =============
        print("\n📥 Creating goods receipts...")
        
        received_pos = [po for po in purchase_orders if po.status == DocumentStatus.RECEIVED]
        warehouse_users = list(db.query(User).filter(User.role.in_([UserRole.WAREHOUSE, UserRole.BUYER])).all()) or buyers
        
        for po in received_pos[:int(len(received_pos) * 0.8)]:  # 80% of received POs have GRs
            receiver = random.choice(warehouse_users) if warehouse_users else random.choice(buyers)
            
            gr = GoodsReceipt(
                number=f"GR-{counts['goods_receipts']+1:06d}",
                purchase_order_id=po.id,
                received_by_id=receiver.id,
                received_at=datetime.now() - timedelta(days=random.randint(1, 14)),
                created_by=receiver.id,
            )
            db.add(gr)
            db.flush()
            
            # Copy line items from PO
            po_lines = db.query(POLineItem).filter(POLineItem.purchase_order_id == po.id).all()
            for po_line in po_lines:
                gr_line = GRLineItem(
                    goods_receipt_id=gr.id,
                    po_line_item_id=po_line.id,
                    quantity_received=po_line.quantity,  # Full receipt
                    quantity_rejected=0,
                )
                db.add(gr_line)
            
            counts["goods_receipts"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['goods_receipts']} goods receipts")
        
        # ============= 7. Create Invoices =============
        print("\n💰 Creating invoices...")
        
        pos_for_invoices = [po for po in purchase_orders if po.status in [DocumentStatus.RECEIVED, DocumentStatus.ORDERED]]
        
        for po in pos_for_invoices[:int(len(pos_for_invoices) * 0.85)]:  # 85% have invoices
            invoice_status = random.choices(
                [DocumentStatus.PENDING_APPROVAL, DocumentStatus.APPROVED, DocumentStatus.MATCHED, DocumentStatus.PAID],
                weights=[20, 30, 25, 25]
            )[0]
            
            # Set due dates - some overdue, some upcoming
            if random.random() < 0.15:  # 15% overdue
                due_date = date.today() - timedelta(days=random.randint(1, 30))
            else:
                due_date = date.today() + timedelta(days=random.randint(5, 45))
            
            # Risk levels
            risk = random.choices(
                [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH],
                weights=[70, 25, 5]
            )[0]
            
            invoice = Invoice(
                number=f"INV-{counts['invoices']+1:06d}",
                vendor_invoice_number=f"VINV-{random.randint(10000, 99999)}",
                purchase_order_id=po.id,
                supplier_id=po.supplier_id,
                invoice_date=date.today() - timedelta(days=random.randint(5, 30)),
                due_date=due_date,
                subtotal=po.subtotal,
                tax_amount=po.tax_amount,
                total_amount=po.total_amount,
                status=invoice_status,
                risk_level=risk,
                match_status=MatchStatus.MATCHED if invoice_status in [DocumentStatus.MATCHED, DocumentStatus.PAID] else MatchStatus.PENDING,
                payment_date=date.today() - timedelta(days=random.randint(1, 5)) if invoice_status == DocumentStatus.PAID else None,
                created_by="system",
            )
            db.add(invoice)
            db.flush()
            
            # Copy line items from PO
            po_lines = db.query(POLineItem).filter(POLineItem.purchase_order_id == po.id).all()
            for po_line in po_lines:
                inv_line = InvoiceLineItem(
                    invoice_id=invoice.id,
                    po_line_item_id=po_line.id,
                    line_number=po_line.line_number,
                    description=po_line.description,
                    quantity=po_line.quantity,
                    unit_price=po_line.unit_price,
                    total=po_line.total,
                )
                db.add(inv_line)
            
            counts["invoices"] += 1
        
        db.flush()
        print(f"   ✅ Created {counts['invoices']} invoices")
        
        # ============= 8. Create Audit Logs =============
        print("\n📜 Creating audit logs...")
        
        actions = ["CREATE", "UPDATE", "APPROVE", "REJECT", "SUBMIT", "MATCH", "PAY"]
        entities = ["requisition", "purchase_order", "invoice", "goods_receipt", "supplier"]
        
        for _ in range(50):
            all_users = list(db.query(User).all())
            user = random.choice(all_users)
            
            audit = AuditLog(
                document_type=random.choice(entities),
                document_id=str(random.randint(1, 50)),
                action=random.choice(actions),
                user_id=user.id,
                user_name=user.name,
                field_changes='{"field": "status", "old": "pending", "new": "approved"}',
                timestamp=datetime.now() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23)),
            )
            db.add(audit)
            counts["audit_logs"] += 1
        
        db.commit()
        print(f"   ✅ Created {counts['audit_logs']} audit logs")
        
        # ============= Summary =============
        total = sum(counts.values())
        print(f"\n{'='*50}")
        print(f"🎉 Database seeded successfully!")
        print(f"{'='*50}")
        print(f"   Users:           {counts['users']}")
        print(f"   Suppliers:       {counts['suppliers']}")
        print(f"   Products:        {counts['products']}")
        print(f"   Requisitions:    {counts['requisitions']}")
        print(f"   Purchase Orders: {counts['purchase_orders']}")
        print(f"   Goods Receipts:  {counts['goods_receipts']}")
        print(f"   Invoices:        {counts['invoices']}")
        print(f"   Approvals:       {counts['approvals']}")
        print(f"   Audit Logs:      {counts['audit_logs']}")
        print(f"{'='*50}")
        print(f"   TOTAL:           {total} records")
        print(f"{'='*50}\n")
        
        return counts
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed the P2P database with test data")
    parser.add_argument("--users", type=int, default=20, help="Number of users")
    parser.add_argument("--suppliers", type=int, default=15, help="Number of suppliers")
    parser.add_argument("--products", type=int, default=50, help="Number of products")
    parser.add_argument("--requisitions", type=int, default=36, help="Number of requisitions")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--no-reset", action="store_true", help="Don't reset database")
    
    args = parser.parse_args()
    
    seed_database(
        num_users=args.users,
        num_suppliers=args.suppliers,
        num_products=args.products,
        num_requisitions=args.requisitions,
        seed=args.seed,
        reset=not args.no_reset,
    )
