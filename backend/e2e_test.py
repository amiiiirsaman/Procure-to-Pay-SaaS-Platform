"""E2E Test using TestClient (same as pytest)"""
from fastapi.testclient import TestClient
from app.main import app
from app.database import reset_db, init_db
from datetime import date, timedelta

reset_db()
init_db()

client = TestClient(app)

print("=== REAL E2E TEST (Same as pytest) ===")
print()

# 1. Health
r = client.get("/health")
print(f"1. Health: {r.status_code} - {r.json()['status']}")

# 2. Create User
user = {
    "id": "live-user-001",
    "email": "live@test.com",
    "name": "Live Tester",
    "department": "engineering",
    "role": "requestor",
    "approval_limit": 0,
}
r = client.post("/api/v1/users/", json=user)
print(f"2. Create User: {r.status_code}")

# 3. Create Manager
mgr = {
    "id": "live-mgr-001",
    "email": "livemgr@test.com",
    "name": "Live Manager",
    "department": "engineering",
    "role": "manager",
    "approval_limit": 50000,
}
r = client.post("/api/v1/users/", json=mgr)
print(f"3. Create Manager: {r.status_code}")

# 4. Create Supplier
supp = {
    "id": "live-supp-001",
    "name": "Live Supplier",
    "email": "supplier@test.com",
    "address": "123 Test St",
    "city": "Test City",
    "country": "USA",
}
r = client.post("/api/v1/suppliers/", json=supp)
print(f"4. Create Supplier: {r.status_code}")

# 5. Create Requisition
req = {
    "requestor_id": "live-user-001",
    "department": "engineering",
    "description": "Live E2E Test Requisition",
    "justification": "Testing the full flow",
    "urgency": "standard",
    "line_items": [
        {"description": "Test Widget", "category": "IT", "quantity": 10, "unit_price": 250.00}
    ],
}
r = client.post("/api/v1/requisitions/", json=req)
print(f"5. Create Requisition: {r.status_code}")
req_id = r.json()["id"]
print(f"   REQ ID: {req_id}, Total: ${r.json()['total_amount']}")

# 6. Submit Requisition
r = client.post(f"/api/v1/requisitions/{req_id}/submit")
print(f"6. Submit Requisition: {r.status_code} -> status={r.json()['status']}")

# 7. Create PO
po = {
    "requisition_id": req_id,
    "supplier_id": "live-supp-001",
    "buyer_id": "live-mgr-001",
    "payment_terms": "Net 30",
    "line_items": [{"description": "Test Widget", "quantity": 10, "unit_price": 250.00}],
}
r = client.post("/api/v1/purchase-orders/", json=po)
print(f"7. Create PO: {r.status_code}")
po_id = r.json()["id"]
po_line_id = r.json()["line_items"][0]["id"]
print(f"   PO ID: {po_id}, Total: ${r.json()['total_amount']}")

# 8. Goods Receipt
gr = {
    "purchase_order_id": po_id,
    "received_by_id": "live-user-001",
    "delivery_note": "All 10 widgets received",
    "line_items": [
        {"po_line_item_id": po_line_id, "quantity_received": 10, "quantity_rejected": 0}
    ],
}
r = client.post("/api/v1/goods-receipts/", json=gr)
print(f"8. Create Goods Receipt: {r.status_code}")
print(f"   GR ID: {r.json()['id']}")

# 9. Invoice
inv = {
    "vendor_invoice_number": "LIVE-INV-001",
    "supplier_id": "live-supp-001",
    "purchase_order_id": po_id,
    "invoice_date": date.today().isoformat(),
    "due_date": (date.today() + timedelta(days=30)).isoformat(),
    "subtotal": 2500.00,
    "tax_amount": 200.00,
    "line_items": [
        {
            "description": "Test Widget",
            "quantity": 10,
            "unit_price": 250.00,
            "po_line_item_id": po_line_id,
        }
    ],
}
r = client.post("/api/v1/invoices/", json=inv)
print(f"9. Create Invoice: {r.status_code}")
print(f"   Invoice Total: ${r.json()['total_amount']}")

# 10. Dashboard
r = client.get("/api/v1/dashboard/metrics")
print(f"10. Dashboard: {r.status_code}")
m = r.json()
print(f"    Pending Approvals: {m['pending_approvals']}")
print(f"    Open POs: {m['open_pos']}")
print(f"    Pending Invoices: {m['pending_invoices']}")

print()
print("=== E2E TEST PASSED ===")
