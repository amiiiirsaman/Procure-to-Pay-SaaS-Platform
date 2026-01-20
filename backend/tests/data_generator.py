"""
Test data generator for P2P SaaS Platform.

Generates realistic test datasets using Faker for:
- Users (requestors, managers, directors, etc.)
- Suppliers with varying risk profiles
- Products and catalogs
- Requisitions with line items
- Purchase orders
- Goods receipts
- Invoices
- Complete P2P document chains

Usage:
    from tests.data_generator import P2PDataGenerator
    
    generator = P2PDataGenerator(seed=42)
    dataset = generator.generate_full_dataset(
        num_users=10,
        num_suppliers=5,
        num_requisitions=20,
    )
"""

import random
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from faker import Faker


class P2PDataGenerator:
    """Generate realistic P2P test data."""

    # Product categories with typical items
    PRODUCT_CATALOG = {
        "IT Equipment": [
            ("Laptop - Dell Latitude", 1200.00, 1800.00),
            ("Laptop - HP EliteBook", 1100.00, 1700.00),
            ("Desktop Workstation", 800.00, 2500.00),
            ("Monitor 27-inch", 250.00, 500.00),
            ("Keyboard & Mouse Set", 50.00, 150.00),
            ("Docking Station", 150.00, 350.00),
            ("USB Hub", 20.00, 80.00),
            ("External SSD 1TB", 80.00, 200.00),
        ],
        "Office Supplies": [
            ("Printer Paper (Box)", 25.00, 50.00),
            ("Ballpoint Pens (100)", 15.00, 30.00),
            ("Notebooks (12-pack)", 20.00, 40.00),
            ("Sticky Notes", 10.00, 20.00),
            ("Binder Clips", 8.00, 15.00),
            ("Folders (50-pack)", 15.00, 35.00),
            ("Stapler", 10.00, 25.00),
            ("Whiteboard Markers", 12.00, 25.00),
        ],
        "Furniture": [
            ("Office Chair - Ergonomic", 300.00, 800.00),
            ("Standing Desk", 400.00, 1200.00),
            ("Filing Cabinet", 150.00, 400.00),
            ("Bookshelf", 100.00, 300.00),
            ("Conference Table", 500.00, 2000.00),
            ("Guest Chair", 100.00, 250.00),
        ],
        "Professional Services": [
            ("Consulting - Daily Rate", 800.00, 2500.00),
            ("Training Session", 500.00, 3000.00),
            ("Audit Services", 2000.00, 15000.00),
            ("Legal Review", 1000.00, 5000.00),
            ("Design Services", 500.00, 5000.00),
        ],
        "Software": [
            ("Microsoft 365 License", 100.00, 300.00),
            ("Adobe Creative Cloud", 200.00, 600.00),
            ("Slack Subscription", 50.00, 150.00),
            ("Jira License", 50.00, 100.00),
            ("Zoom Pro", 100.00, 200.00),
            ("Security Software", 50.00, 500.00),
        ],
    }

    DEPARTMENTS = ["engineering", "finance", "hr", "marketing", "operations", "sales", "it", "legal"]

    PAYMENT_TERMS = [
        "Net 30",
        "Net 45",
        "Net 60",
        "2/10 Net 30",
        "1/10 Net 45",
        "Due on Receipt",
    ]

    def __init__(self, seed: Optional[int] = None):
        """Initialize generator with optional seed for reproducibility."""
        self.fake = Faker()
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        self._user_counter = 0
        self._supplier_counter = 0
        self._product_counter = 0
        self._req_counter = 0
        self._po_counter = 0
        self._invoice_counter = 0
        self._gr_counter = 0

    def _gen_id(self, prefix: str, counter_attr: str) -> str:
        """Generate sequential ID with prefix."""
        counter = getattr(self, counter_attr)
        setattr(self, counter_attr, counter + 1)
        return f"{prefix}-{counter + 1:06d}"

    def generate_user(
        self,
        role: str = "requestor",
        department: Optional[str] = None,
        manager_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Generate a user with specified role."""
        user_id = self._gen_id("USER", "_user_counter")
        
        approval_limits = {
            "requestor": 0.0,
            "manager": 5000.0,
            "director": 25000.0,
            "vp": 50000.0,
            "cfo": 100000.0,
            "ceo": float("inf"),
            "buyer": 0.0,
            "ap_clerk": 0.0,
            "ap_manager": 50000.0,
        }

        return {
            "id": user_id,
            "email": self.fake.company_email(),
            "name": self.fake.name(),
            "department": department or random.choice(self.DEPARTMENTS),
            "role": role,
            "manager_id": manager_id,
            "approval_limit": approval_limits.get(role, 0.0),
            "is_active": True,
            "created_at": self.fake.date_time_between(start_date="-2y", end_date="-1d"),
        }

    def generate_supplier(
        self,
        risk_level: str = "low",
        is_new: bool = False,
    ) -> dict[str, Any]:
        """Generate a supplier with specified risk profile."""
        supplier_id = self._gen_id("SUP", "_supplier_counter")
        
        # Risk-based attributes
        if risk_level == "high":
            address = f"P.O. Box {random.randint(1000, 9999)}, {self.fake.city()}, {self.fake.state_abbr()}"
            days_since_creation = random.randint(7, 60)
            bank_verified = False
            performance_rating = random.uniform(2.0, 3.5)
        elif risk_level == "medium":
            address = self.fake.street_address() + ", " + self.fake.city()
            days_since_creation = random.randint(60, 180)
            bank_verified = random.choice([True, False])
            performance_rating = random.uniform(3.5, 4.2)
        else:  # low risk
            address = self.fake.street_address() + ", " + self.fake.city() + ", " + self.fake.state_abbr()
            days_since_creation = random.randint(365, 1825)  # 1-5 years
            bank_verified = True
            performance_rating = random.uniform(4.2, 5.0)

        return {
            "id": supplier_id,
            "name": self.fake.company(),
            "tax_id": self.fake.ssn(),  # Using SSN format for simplicity
            "address": address,
            "city": self.fake.city(),
            "state": self.fake.state_abbr(),
            "zip_code": self.fake.zipcode(),
            "country": "US",
            "contact_name": self.fake.name(),
            "contact_email": self.fake.company_email(),
            "contact_phone": self.fake.phone_number(),
            "payment_terms": random.choice(self.PAYMENT_TERMS),
            "bank_verified": bank_verified,
            "is_new": is_new or days_since_creation < 90,
            "risk_level": risk_level,
            "performance_rating": round(performance_rating, 2),
            "days_since_creation": days_since_creation,
            "is_active": True,
            "created_at": datetime.now() - timedelta(days=days_since_creation),
        }

    def generate_product(
        self,
        category: Optional[str] = None,
    ) -> dict[str, Any]:
        """Generate a product from catalog."""
        product_id = self._gen_id("PROD", "_product_counter")
        
        if category is None:
            category = random.choice(list(self.PRODUCT_CATALOG.keys()))
        
        products = self.PRODUCT_CATALOG.get(category, self.PRODUCT_CATALOG["Office Supplies"])
        name, min_price, max_price = random.choice(products)
        
        unit_price = round(random.uniform(min_price, max_price), 2)
        
        return {
            "id": product_id,
            "name": name,
            "description": f"{name} - {self.fake.catch_phrase()}",
            "category": category,
            "unit_price": unit_price,
            "unit_of_measure": "EA",
            "lead_time_days": random.randint(3, 21),
            "is_active": True,
        }

    def generate_requisition(
        self,
        requestor: dict[str, Any],
        suppliers: list[dict[str, Any]],
        num_lines: int = None,
        urgency: str = None,
        amount_range: tuple[float, float] = None,
    ) -> dict[str, Any]:
        """Generate a requisition with line items."""
        req_id = self._gen_id("REQ", "_req_counter")
        
        if num_lines is None:
            num_lines = random.randint(1, 5)
        
        if urgency is None:
            urgency = random.choices(
                ["low", "standard", "high", "critical"],
                weights=[10, 60, 25, 5],
            )[0]

        # Generate line items
        line_items = []
        total_amount = 0.0
        
        for i in range(num_lines):
            category = random.choice(list(self.PRODUCT_CATALOG.keys()))
            products = self.PRODUCT_CATALOG[category]
            name, min_price, max_price = random.choice(products)
            
            quantity = random.randint(1, 20)
            unit_price = round(random.uniform(min_price, max_price), 2)
            line_total = round(quantity * unit_price, 2)
            
            line_items.append({
                "line_number": i + 1,
                "description": name,
                "category": category,
                "quantity": quantity,
                "unit_price": unit_price,
                "unit_of_measure": "EA",
                "total_amount": line_total,
                "suggested_supplier_id": random.choice(suppliers)["id"] if suppliers else None,
            })
            total_amount += line_total

        # Adjust total if amount_range specified
        if amount_range:
            target = random.uniform(*amount_range)
            factor = target / total_amount if total_amount > 0 else 1
            for item in line_items:
                item["unit_price"] = round(item["unit_price"] * factor, 2)
                item["total_amount"] = round(item["quantity"] * item["unit_price"], 2)
            total_amount = sum(item["total_amount"] for item in line_items)

        needed_by_date = date.today() + timedelta(days=random.randint(7, 60))

        return {
            "id": req_id,
            "number": req_id,
            "requestor_id": requestor["id"],
            "requestor_name": requestor["name"],
            "department": requestor["department"],
            "description": f"Requisition for {line_items[0]['category']}",
            "justification": self.fake.paragraph(nb_sentences=2),
            "urgency": urgency,
            "needed_by_date": needed_by_date.isoformat(),
            "total_amount": round(total_amount, 2),
            "line_items": line_items,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }

    def generate_purchase_order(
        self,
        requisition: dict[str, Any],
        supplier: dict[str, Any],
        buyer: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate a purchase order from requisition."""
        po_id = self._gen_id("PO", "_po_counter")
        
        delivery_date = date.today() + timedelta(days=random.randint(7, 30))
        
        # Copy line items with PO-specific details
        po_lines = []
        for i, req_line in enumerate(requisition["line_items"]):
            po_lines.append({
                "line_number": i + 1,
                "requisition_line_id": req_line.get("id"),
                "description": req_line["description"],
                "quantity": req_line["quantity"],
                "unit_price": req_line["unit_price"],
                "total_amount": req_line["total_amount"],
                "quantity_received": 0,
            })

        return {
            "id": po_id,
            "number": po_id,
            "requisition_id": requisition["id"],
            "supplier_id": supplier["id"],
            "supplier_name": supplier["name"],
            "buyer_id": buyer["id"],
            "buyer_name": buyer["name"],
            "total_amount": requisition["total_amount"],
            "payment_terms": supplier["payment_terms"],
            "shipping_terms": random.choice(["FOB Origin", "FOB Destination", "DDP"]),
            "delivery_date": delivery_date.isoformat(),
            "line_items": po_lines,
            "status": "open",
            "created_at": datetime.now().isoformat(),
        }

    def generate_goods_receipt(
        self,
        purchase_order: dict[str, Any],
        variance_type: str = "exact",
    ) -> dict[str, Any]:
        """Generate a goods receipt for PO.
        
        variance_type: "exact", "under", "over", "partial", "damaged"
        """
        gr_id = self._gen_id("GR", "_gr_counter")
        
        gr_lines = []
        for po_line in purchase_order["line_items"]:
            ordered_qty = po_line["quantity"]
            
            if variance_type == "exact":
                received_qty = ordered_qty
                rejected_qty = 0
            elif variance_type == "under":
                received_qty = max(1, ordered_qty - random.randint(1, 3))
                rejected_qty = 0
            elif variance_type == "over":
                received_qty = ordered_qty + random.randint(1, 3)
                rejected_qty = 0
            elif variance_type == "partial":
                received_qty = max(1, ordered_qty // 2)
                rejected_qty = 0
            elif variance_type == "damaged":
                received_qty = ordered_qty
                rejected_qty = random.randint(1, max(1, ordered_qty // 3))
            else:
                received_qty = ordered_qty
                rejected_qty = 0

            gr_lines.append({
                "line_number": po_line["line_number"],
                "po_line_number": po_line["line_number"],
                "description": po_line["description"],
                "quantity_received": received_qty,
                "quantity_rejected": rejected_qty,
                "condition": "damaged" if rejected_qty > 0 else "good",
            })

        return {
            "id": gr_id,
            "number": gr_id,
            "purchase_order_id": purchase_order["id"],
            "receipt_date": date.today().isoformat(),
            "carrier": random.choice(["FedEx", "UPS", "DHL", "USPS", "Freight"]),
            "tracking_number": self.fake.uuid4()[:12].upper(),
            "line_items": gr_lines,
            "notes": self.fake.sentence() if variance_type != "exact" else None,
            "status": "complete" if variance_type == "exact" else "partial",
            "created_at": datetime.now().isoformat(),
        }

    def generate_invoice(
        self,
        purchase_order: dict[str, Any],
        supplier: dict[str, Any],
        goods_receipt: dict[str, Any],
        price_variance: float = 0.0,
    ) -> dict[str, Any]:
        """Generate an invoice for PO/GR.
        
        price_variance: percentage variance from PO price (e.g., 0.05 = 5%)
        """
        inv_id = self._gen_id("INV", "_invoice_counter")
        
        inv_lines = []
        total_amount = 0.0
        
        for po_line in purchase_order["line_items"]:
            # Find matching GR line
            gr_qty = 0
            for gr_line in goods_receipt["line_items"]:
                if gr_line["line_number"] == po_line["line_number"]:
                    gr_qty = gr_line["quantity_received"] - gr_line.get("quantity_rejected", 0)
                    break
            
            if gr_qty <= 0:
                continue
            
            # Apply price variance
            variance_factor = 1 + random.uniform(-price_variance, price_variance)
            unit_price = round(po_line["unit_price"] * variance_factor, 2)
            line_total = round(gr_qty * unit_price, 2)
            
            inv_lines.append({
                "line_number": po_line["line_number"],
                "po_line_number": po_line["line_number"],
                "description": po_line["description"],
                "quantity": gr_qty,
                "unit_price": unit_price,
                "total_amount": line_total,
            })
            total_amount += line_total

        invoice_date = date.today()
        
        # Calculate due date based on payment terms
        terms = supplier["payment_terms"]
        if "30" in terms:
            due_date = invoice_date + timedelta(days=30)
        elif "45" in terms:
            due_date = invoice_date + timedelta(days=45)
        elif "60" in terms:
            due_date = invoice_date + timedelta(days=60)
        else:
            due_date = invoice_date + timedelta(days=30)

        return {
            "id": inv_id,
            "number": inv_id,
            "vendor_invoice_number": f"{supplier['name'][:3].upper()}-{random.randint(10000, 99999)}",
            "purchase_order_id": purchase_order["id"],
            "goods_receipt_id": goods_receipt["id"],
            "supplier_id": supplier["id"],
            "supplier_name": supplier["name"],
            "invoice_date": invoice_date.isoformat(),
            "due_date": due_date.isoformat(),
            "payment_terms": supplier["payment_terms"],
            "subtotal": round(total_amount, 2),
            "tax_amount": round(total_amount * 0.0825, 2),  # 8.25% tax
            "total_amount": round(total_amount * 1.0825, 2),
            "line_items": inv_lines,
            "status": "pending",
            "match_status": "pending",
            "created_at": datetime.now().isoformat(),
        }

    def generate_fraud_scenario(
        self,
        scenario_type: str,
        supplier: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate a fraud test scenario.
        
        scenario_type: "duplicate", "split", "round_dollar", "rush_payment", "new_vendor"
        """
        if scenario_type == "duplicate":
            # Same invoice number submitted twice
            return {
                "type": "duplicate_invoice",
                "invoices": [
                    {
                        "vendor_invoice_number": "DUP-12345",
                        "total_amount": 5000.00,
                        "invoice_date": date.today().isoformat(),
                    },
                    {
                        "vendor_invoice_number": "DUP-12345",  # Same number
                        "total_amount": 5000.00,
                        "invoice_date": date.today().isoformat(),
                    },
                ],
            }
        elif scenario_type == "split":
            # Multiple invoices just below threshold
            threshold = 5000.00
            return {
                "type": "split_transaction",
                "invoices": [
                    {
                        "vendor_invoice_number": f"SPLIT-{i}",
                        "total_amount": threshold - random.uniform(1, 100),
                        "invoice_date": date.today().isoformat(),
                    }
                    for i in range(3)
                ],
                "threshold": threshold,
            }
        elif scenario_type == "round_dollar":
            return {
                "type": "round_dollar",
                "invoices": [
                    {"total_amount": 5000.00},
                    {"total_amount": 10000.00},
                    {"total_amount": 15000.00},
                    {"total_amount": 20000.00},
                ],
            }
        elif scenario_type == "rush_payment":
            return {
                "type": "rush_payment",
                "invoice": {
                    "vendor_invoice_number": "RUSH-001",
                    "total_amount": 25000.00,
                    "payment_requested": "immediate",
                    "justification": "Urgent supplier requirement",
                },
            }
        elif scenario_type == "new_vendor":
            return {
                "type": "new_vendor_high_value",
                "vendor": {
                    "is_new": True,
                    "days_since_creation": 14,
                    "bank_verified": False,
                    "address": "P.O. Box 9999",
                },
                "invoice": {
                    "total_amount": 50000.00,
                },
            }
        else:
            return {"type": "unknown"}

    def generate_full_dataset(
        self,
        num_users: int = 10,
        num_suppliers: int = 5,
        num_requisitions: int = 20,
        include_fraud_scenarios: bool = True,
    ) -> dict[str, Any]:
        """Generate a complete test dataset.
        
        Returns a dictionary with all generated entities.
        """
        dataset = {
            "users": [],
            "suppliers": [],
            "products": [],
            "requisitions": [],
            "purchase_orders": [],
            "goods_receipts": [],
            "invoices": [],
            "fraud_scenarios": [],
        }

        # Generate users with hierarchy
        ceo = self.generate_user(role="ceo")
        cfo = self.generate_user(role="cfo", manager_id=ceo["id"])
        dataset["users"].extend([ceo, cfo])

        # Generate department heads and staff
        departments = random.sample(self.DEPARTMENTS, min(4, len(self.DEPARTMENTS)))
        for dept in departments:
            director = self.generate_user(role="director", department=dept, manager_id=cfo["id"])
            manager = self.generate_user(role="manager", department=dept, manager_id=director["id"])
            dataset["users"].extend([director, manager])
            
            # Add requestors
            for _ in range(max(1, (num_users - 6) // len(departments))):
                requestor = self.generate_user(role="requestor", department=dept, manager_id=manager["id"])
                dataset["users"].append(requestor)

        # Add buyers and AP staff
        buyer = self.generate_user(role="buyer", department="procurement")
        ap_clerk = self.generate_user(role="ap_clerk", department="finance")
        ap_manager = self.generate_user(role="ap_manager", department="finance")
        dataset["users"].extend([buyer, ap_clerk, ap_manager])

        # Generate suppliers with varying risk
        risk_distribution = {"low": 0.6, "medium": 0.3, "high": 0.1}
        for _ in range(num_suppliers):
            risk = random.choices(
                list(risk_distribution.keys()),
                weights=list(risk_distribution.values()),
            )[0]
            supplier = self.generate_supplier(risk_level=risk)
            dataset["suppliers"].append(supplier)

        # Generate products
        for category in self.PRODUCT_CATALOG:
            for _ in range(3):
                product = self.generate_product(category=category)
                dataset["products"].append(product)

        # Generate requisitions and full document chains
        requestors = [u for u in dataset["users"] if u["role"] == "requestor"]
        
        for _ in range(num_requisitions):
            requestor = random.choice(requestors)
            requisition = self.generate_requisition(
                requestor=requestor,
                suppliers=dataset["suppliers"],
            )
            dataset["requisitions"].append(requisition)

            # 70% of requisitions get converted to POs
            if random.random() < 0.7:
                supplier = random.choice(dataset["suppliers"])
                po = self.generate_purchase_order(requisition, supplier, buyer)
                dataset["purchase_orders"].append(po)

                # 80% of POs get receipts
                if random.random() < 0.8:
                    variance = random.choices(
                        ["exact", "under", "over", "partial", "damaged"],
                        weights=[70, 10, 5, 10, 5],
                    )[0]
                    gr = self.generate_goods_receipt(po, variance_type=variance)
                    dataset["goods_receipts"].append(gr)

                    # 90% of receipts get invoices
                    if random.random() < 0.9:
                        price_var = random.choices(
                            [0.0, 0.02, 0.05, 0.10],
                            weights=[70, 15, 10, 5],
                        )[0]
                        invoice = self.generate_invoice(po, supplier, gr, price_variance=price_var)
                        dataset["invoices"].append(invoice)

        # Generate fraud scenarios if requested
        if include_fraud_scenarios:
            fraud_types = ["duplicate", "split", "round_dollar", "rush_payment", "new_vendor"]
            for fraud_type in fraud_types:
                scenario = self.generate_fraud_scenario(
                    fraud_type,
                    random.choice(dataset["suppliers"]),
                )
                dataset["fraud_scenarios"].append(scenario)

        return dataset

    def generate_compliance_test_cases(self) -> list[dict[str, Any]]:
        """Generate test cases for compliance validation."""
        return [
            {
                "name": "SOD Violation - Same requestor and approver",
                "transaction": {"total_amount": 5000.00},
                "actors": {
                    "requestor": {"id": "user-001", "role": "requestor"},
                    "approver": {"id": "user-001", "role": "manager"},  # Same person
                },
                "expected": "violation",
            },
            {
                "name": "Missing Documentation - Large purchase",
                "transaction": {"total_amount": 75000.00},
                "documents": ["invoice", "po"],  # Missing quotes, contract, etc.
                "expected": "violation",
            },
            {
                "name": "Approval Limit Exceeded",
                "transaction": {"total_amount": 10000.00},
                "approver": {"approval_limit": 5000.00},
                "expected": "violation",
            },
            {
                "name": "Valid Small Purchase",
                "transaction": {"total_amount": 500.00},
                "actors": {
                    "requestor": {"id": "user-001", "role": "requestor"},
                    "approver": {"id": "user-002", "role": "manager"},
                },
                "documents": ["invoice", "requestor_approval"],
                "expected": "compliant",
            },
        ]


# Convenience function for quick dataset generation
def generate_test_data(seed: int = 42) -> dict[str, Any]:
    """Generate a standard test dataset."""
    generator = P2PDataGenerator(seed=seed)
    return generator.generate_full_dataset()


if __name__ == "__main__":
    # Demo: Generate and print sample data
    generator = P2PDataGenerator(seed=42)
    dataset = generator.generate_full_dataset(
        num_users=10,
        num_suppliers=5,
        num_requisitions=10,
    )
    
    print(f"Generated {len(dataset['users'])} users")
    print(f"Generated {len(dataset['suppliers'])} suppliers")
    print(f"Generated {len(dataset['requisitions'])} requisitions")
    print(f"Generated {len(dataset['purchase_orders'])} purchase orders")
    print(f"Generated {len(dataset['goods_receipts'])} goods receipts")
    print(f"Generated {len(dataset['invoices'])} invoices")
    print(f"Generated {len(dataset['fraud_scenarios'])} fraud scenarios")
    
    # Print sample requisition
    if dataset["requisitions"]:
        print("\nSample Requisition:")
        import json
        print(json.dumps(dataset["requisitions"][0], indent=2, default=str))
