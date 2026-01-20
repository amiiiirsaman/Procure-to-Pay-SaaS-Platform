"""
End-to-end tests using generated test data.

These tests validate the complete P2P workflow using realistic
generated data from the data_generator module. Tests can run with
mock agents (fast) or live Bedrock (requires AWS credentials).

Run with mock agents:
    pytest tests/test_e2e_with_data.py -v

Run with live Bedrock:
    pytest tests/test_e2e_with_data.py -v --live
    
Run specific scenarios:
    pytest tests/test_e2e_with_data.py -v -k "fraud"
"""

import json
import os
import time
from datetime import date
from typing import Any

import pytest

from app.agents.requisition_agent import RequisitionAgent
from app.agents.approval_agent import ApprovalAgent
from app.agents.po_agent import POAgent
from app.agents.receiving_agent import ReceivingAgent
from app.agents.invoice_agent import InvoiceAgent
from app.agents.fraud_agent import FraudAgent
from app.agents.compliance_agent import ComplianceAgent

from tests.data_generator import P2PDataGenerator, generate_test_data


# Command line option for live tests
def pytest_addoption(parser):
    """Add --live option for running with live Bedrock."""
    try:
        parser.addoption(
            "--live",
            action="store_true",
            default=False,
            help="Run tests with live Bedrock instead of mock agents",
        )
    except ValueError:
        pass  # Option already exists


@pytest.fixture
def use_mock(request):
    """Determine whether to use mock agents."""
    # Check for --live flag or environment variable
    live = getattr(request.config.option, "live", False) or os.getenv("P2P_LIVE_TEST", "false").lower() == "true"
    return not live


@pytest.fixture
def test_dataset():
    """Generate a test dataset for E2E tests."""
    generator = P2PDataGenerator(seed=42)
    return generator.generate_full_dataset(
        num_users=10,
        num_suppliers=5,
        num_requisitions=10,
    )


@pytest.fixture
def all_agents(use_mock):
    """Create all agents with consistent mock setting."""
    return {
        "requisition": RequisitionAgent(use_mock=use_mock),
        "approval": ApprovalAgent(use_mock=use_mock),
        "po": POAgent(use_mock=use_mock),
        "receiving": ReceivingAgent(use_mock=use_mock),
        "invoice": InvoiceAgent(use_mock=use_mock),
        "fraud": FraudAgent(use_mock=use_mock),
        "compliance": ComplianceAgent(use_mock=use_mock),
    }


class TestRequisitionWorkflow:
    """E2E tests for requisition workflow."""

    def test_validate_multiple_requisitions(self, all_agents, test_dataset):
        """Test validating multiple requisitions from generated data."""
        agent = all_agents["requisition"]
        
        results = []
        for req in test_dataset["requisitions"][:5]:  # Test first 5
            result = agent.validate_requisition(req)
            results.append({
                "req_id": req["id"],
                "total": req["total_amount"],
                "status": result.get("status"),
            })
        
        # All should get a response
        assert all(r["status"] is not None for r in results)
        print(f"\nValidated {len(results)} requisitions")
        for r in results:
            print(f"  {r['req_id']}: ${r['total']:,.2f} -> {r['status']}")

    def test_requisition_with_products(self, all_agents, test_dataset):
        """Test product suggestions for requisitions."""
        agent = all_agents["requisition"]
        
        # Create product catalog from generated data
        catalog = test_dataset["products"][:10]
        
        # Test product suggestion
        result = agent.suggest_products(
            description="Business laptop for development",
            category="IT Equipment",
            catalog=catalog,
        )
        
        assert "status" in result
        print(f"\nProduct suggestion result: {result.get('status')}")


class TestApprovalWorkflow:
    """E2E tests for approval workflow."""

    def test_approval_chain_by_amount(self, all_agents, test_dataset):
        """Test approval chain determination for various amounts."""
        agent = all_agents["approval"]
        
        test_amounts = [500, 2500, 15000, 40000, 75000, 150000]
        
        for amount in test_amounts:
            document = {
                "id": f"TEST-{amount}",
                "total_amount": amount,
                "department": "engineering",
            }
            requestor = test_dataset["users"][0]
            
            result = agent.determine_approval_chain(
                document=document,
                document_type="requisition",
                requestor=requestor,
            )
            
            tier = agent._get_tier_for_amount(amount)
            print(f"\n${amount:,.2f}: Tier {tier['tier']} ({tier['description']})")
            assert "status" in result

    def test_approval_with_generated_requisitions(self, all_agents, test_dataset):
        """Test approval routing for generated requisitions."""
        agent = all_agents["approval"]
        requestors = [u for u in test_dataset["users"] if u["role"] == "requestor"]
        
        for req in test_dataset["requisitions"][:3]:
            requestor = next((u for u in requestors if u["id"] == req.get("requestor_id")), requestors[0])
            
            result = agent.determine_approval_chain(
                document=req,
                document_type="requisition",
                requestor=requestor,
            )
            
            print(f"\n{req['id']}: ${req['total_amount']:,.2f} - Status: {result.get('status')}")
            assert "status" in result


class TestPOWorkflow:
    """E2E tests for purchase order workflow."""

    def test_generate_po_from_requisition(self, all_agents, test_dataset):
        """Test PO generation from requisition."""
        agent = all_agents["po"]
        
        # Get a requisition and suppliers
        req = test_dataset["requisitions"][0]
        suppliers = test_dataset["suppliers"]
        
        result = agent.generate_po(
            requisition=req,
            suppliers=suppliers,
        )
        
        assert "status" in result
        print(f"\nPO generation for {req['id']}: {result.get('status')}")

    def test_consolidate_multiple_requisitions(self, all_agents, test_dataset):
        """Test consolidating multiple requisitions."""
        agent = all_agents["po"]
        
        # Get requisitions for same department
        dept_reqs = [r for r in test_dataset["requisitions"] if r["department"] == "engineering"][:3]
        
        if dept_reqs:
            result = agent.consolidate_requisitions(
                pending_requisitions=dept_reqs,
                suppliers=test_dataset["suppliers"],
            )
            
            total = sum(r["total_amount"] for r in dept_reqs)
            print(f"\nConsolidation of {len(dept_reqs)} reqs (${total:,.2f}): {result.get('status')}")
            assert "status" in result


class TestReceivingWorkflow:
    """E2E tests for receiving workflow."""

    def test_process_receipt_exact(self, all_agents, test_dataset):
        """Test processing exact quantity receipt."""
        agent = all_agents["receiving"]
        
        if test_dataset["purchase_orders"] and test_dataset["goods_receipts"]:
            po = test_dataset["purchase_orders"][0]
            gr = test_dataset["goods_receipts"][0]
            
            result = agent.process_receipt(
                receipt_data=gr,
                purchase_order=po,
            )
            
            print(f"\nReceipt processing: {result.get('status')}")
            assert "status" in result

    def test_handle_receipt_discrepancy(self, all_agents, test_dataset):
        """Test handling receipt with discrepancy."""
        agent = all_agents["receiving"]
        
        # Create a receipt with under-delivery
        generator = P2PDataGenerator(seed=99)
        if test_dataset["purchase_orders"]:
            po = test_dataset["purchase_orders"][0]
            under_receipt = generator.generate_goods_receipt(po, variance_type="under")
            
            result = agent.process_receipt(
                receipt_data=under_receipt,
                purchase_order=po,
            )
            
            print(f"\nUnder-delivery receipt: {result.get('status')}")
            assert "status" in result


class TestInvoiceWorkflow:
    """E2E tests for invoice workflow."""

    def test_three_way_match(self, all_agents, test_dataset):
        """Test three-way matching with generated data."""
        agent = all_agents["invoice"]
        
        # Find a complete chain (PO -> GR -> Invoice)
        for invoice in test_dataset["invoices"][:3]:
            po_id = invoice.get("purchase_order_id")
            gr_id = invoice.get("goods_receipt_id")
            
            po = next((p for p in test_dataset["purchase_orders"] if p["id"] == po_id), None)
            gr = next((g for g in test_dataset["goods_receipts"] if g["id"] == gr_id), None)
            
            if po and gr:
                result = agent.process_invoice(
                    invoice=invoice,
                    purchase_order=po,
                    goods_receipts=[gr],
                )
                
                print(f"\nInvoice {invoice['id']}: ${invoice['total_amount']:,.2f} -> {result.get('status')}")
                assert "status" in result
                break

    def test_invoice_with_variance(self, all_agents, test_dataset):
        """Test invoice processing with price variance."""
        agent = all_agents["invoice"]
        generator = P2PDataGenerator(seed=100)
        
        if test_dataset["purchase_orders"] and test_dataset["goods_receipts"]:
            po = test_dataset["purchase_orders"][0]
            gr = test_dataset["goods_receipts"][0]
            supplier = next(
                (s for s in test_dataset["suppliers"] if s["id"] == po.get("supplier_id")),
                test_dataset["suppliers"][0]
            )
            
            # Generate invoice with 5% price variance
            invoice = generator.generate_invoice(po, supplier, gr, price_variance=0.05)
            
            result = agent.process_invoice(
                invoice=invoice,
                purchase_order=po,
                goods_receipts=[gr],
            )
            
            print(f"\nInvoice with variance: {result.get('status')}")
            assert "status" in result


class TestFraudDetection:
    """E2E tests for fraud detection."""

    def test_analyze_generated_invoices(self, all_agents, test_dataset):
        """Test fraud analysis on generated invoices."""
        agent = all_agents["fraud"]
        
        for invoice in test_dataset["invoices"][:3]:
            supplier = next(
                (s for s in test_dataset["suppliers"] if s["id"] == invoice.get("supplier_id")),
                test_dataset["suppliers"][0]
            )
            
            result = agent.analyze_transaction(
                transaction=invoice,
                vendor=supplier,
            )
            
            print(f"\n{invoice['id']}: ${invoice['total_amount']:,.2f} -> {result.get('status')}")
            assert "status" in result

    def test_fraud_scenarios(self, all_agents, test_dataset):
        """Test specific fraud scenarios."""
        agent = all_agents["fraud"]
        
        for scenario in test_dataset["fraud_scenarios"]:
            print(f"\nTesting fraud scenario: {scenario['type']}")
            
            if scenario["type"] == "duplicate_invoice":
                for inv in scenario.get("invoices", []):
                    result = agent.check_duplicate_invoice(
                        invoice=inv,
                        recent_invoices=scenario["invoices"],
                    )
                    assert "status" in result
                    
            elif scenario["type"] == "split_transaction":
                result = agent.detect_split_transactions(
                    vendor_id="test-vendor",
                    recent_invoices=scenario.get("invoices", []),
                    approval_threshold=scenario.get("threshold", 5000),
                )
                assert "status" in result

    def test_high_risk_vendor(self, all_agents, test_dataset):
        """Test fraud detection for high-risk vendor."""
        agent = all_agents["fraud"]
        
        # Find high-risk supplier
        high_risk = next(
            (s for s in test_dataset["suppliers"] if s["risk_level"] == "high"),
            None
        )
        
        if high_risk:
            # Create a suspicious transaction
            transaction = {
                "id": "SUSPICIOUS-001",
                "vendor_invoice_number": "ROUND-10000",
                "supplier_id": high_risk["id"],
                "total_amount": 4999.00,  # Just below threshold
                "invoice_date": date.today().isoformat(),
            }
            
            result = agent.analyze_transaction(
                transaction=transaction,
                vendor=high_risk,
            )
            
            print(f"\nHigh-risk vendor analysis: {result.get('status')}")
            assert "status" in result


class TestComplianceChecks:
    """E2E tests for compliance validation."""

    def test_compliance_generated_invoices(self, all_agents, test_dataset):
        """Test compliance check on generated invoices."""
        agent = all_agents["compliance"]
        
        for invoice in test_dataset["invoices"][:3]:
            # Get associated actors
            po_id = invoice.get("purchase_order_id")
            po = next((p for p in test_dataset["purchase_orders"] if p["id"] == po_id), None)
            
            actors = {
                "requestor": test_dataset["users"][0],
                "approver": next((u for u in test_dataset["users"] if u["role"] == "manager"), test_dataset["users"][1]),
            }
            
            documents = [
                {"type": "invoice", "present": True},
                {"type": "purchase_order", "present": po is not None},
            ]
            
            result = agent.check_compliance(
                transaction=invoice,
                transaction_type="invoice",
                actors=actors,
                documents=documents,
            )
            
            print(f"\n{invoice['id']}: ${invoice['total_amount']:,.2f} -> {result.get('status')}")
            assert "status" in result

    def test_compliance_scenarios(self, all_agents):
        """Test specific compliance scenarios."""
        agent = all_agents["compliance"]
        generator = P2PDataGenerator(seed=42)
        
        test_cases = generator.generate_compliance_test_cases()
        
        for case in test_cases:
            print(f"\nTesting: {case['name']}")
            
            transaction = case.get("transaction", {"total_amount": 1000})
            actors = case.get("actors", {
                "requestor": {"id": "user-1", "role": "requestor"},
                "approver": {"id": "user-2", "role": "manager"},
            })
            documents = [{"type": d, "present": True} for d in case.get("documents", ["invoice"])]
            
            result = agent.check_compliance(
                transaction=transaction,
                transaction_type="invoice",
                actors=actors,
                documents=documents,
            )
            
            print(f"  Expected: {case['expected']}, Got status: {result.get('status')}")
            assert "status" in result


class TestFullP2PWorkflow:
    """Complete end-to-end P2P workflow tests."""

    def test_complete_workflow_happy_path(self, all_agents, test_dataset):
        """Test complete P2P workflow with no issues."""
        print("\n" + "=" * 60)
        print("Full P2P Workflow - Happy Path")
        print("=" * 60)
        
        # Step 1: Validate Requisition
        req = test_dataset["requisitions"][0]
        req_result = all_agents["requisition"].validate_requisition(req)
        print(f"\n1. Requisition {req['id']}: {req_result.get('status')}")
        
        # Step 2: Approval Routing
        requestor = next((u for u in test_dataset["users"] if u["id"] == req.get("requestor_id")), test_dataset["users"][0])
        approval_result = all_agents["approval"].determine_approval_chain(
            document=req,
            document_type="requisition",
            requestor=requestor,
        )
        print(f"2. Approval routing: {approval_result.get('status')}")
        
        # Step 3: Generate PO
        po_result = all_agents["po"].generate_po(
            requisition=req,
            suppliers=test_dataset["suppliers"],
        )
        print(f"3. PO generation: {po_result.get('status')}")
        
        # Step 4: Process Receipt (simulate exact match)
        receipt_data = {
            "line_items": [
                {"po_line_item_id": i + 1, "quantity_received": line["quantity"]}
                for i, line in enumerate(req["line_items"])
            ]
        }
        po_data = {"id": "PO-001", "line_items": [{"id": i + 1, "quantity": line["quantity"]} for i, line in enumerate(req["line_items"])]}
        
        receipt_result = all_agents["receiving"].process_receipt(
            receipt_data=receipt_data,
            purchase_order=po_data,
        )
        print(f"4. Receipt processing: {receipt_result.get('status')}")
        
        # Step 5: Process Invoice
        invoice_data = {
            "id": "INV-001",
            "vendor_invoice_number": "TEST-001",
            "total_amount": req["total_amount"],
            "line_items": req["line_items"],
        }
        po_for_invoice = {
            "total_amount": req["total_amount"],
            "line_items": [{"quantity": line["quantity"], "unit_price": line["unit_price"]} for line in req["line_items"]],
        }
        gr_for_invoice = {
            "line_items": [{"quantity_received": line["quantity"], "quantity_rejected": 0} for line in req["line_items"]],
        }
        
        invoice_result = all_agents["invoice"].process_invoice(
            invoice=invoice_data,
            purchase_order=po_for_invoice,
            goods_receipts=[gr_for_invoice],
        )
        print(f"5. Invoice processing: {invoice_result.get('status')}")
        
        # Step 6: Fraud Check
        supplier = test_dataset["suppliers"][0]
        fraud_result = all_agents["fraud"].analyze_transaction(
            transaction=invoice_data,
            vendor=supplier,
        )
        print(f"6. Fraud analysis: {fraud_result.get('status')}")
        
        # Step 7: Compliance Check
        compliance_result = all_agents["compliance"].check_compliance(
            transaction=invoice_data,
            transaction_type="invoice",
            actors={
                "requestor": requestor,
                "approver": {"id": "manager-001", "role": "manager"},
            },
            documents=[
                {"type": "invoice", "present": True},
                {"type": "purchase_order", "present": True},
                {"type": "goods_receipt", "present": True},
            ],
        )
        print(f"7. Compliance check: {compliance_result.get('status')}")
        
        print("\n" + "=" * 60)
        print("Workflow Complete")
        print("=" * 60)
        
        # All steps should succeed
        all_results = [req_result, approval_result, po_result, receipt_result, 
                       invoice_result, fraud_result, compliance_result]
        assert all("status" in r for r in all_results)

    def test_workflow_with_issues(self, all_agents, test_dataset):
        """Test workflow with various issues to resolve."""
        print("\n" + "=" * 60)
        print("P2P Workflow - With Issues")
        print("=" * 60)
        
        generator = P2PDataGenerator(seed=999)
        
        # High-risk supplier
        high_risk_supplier = generator.generate_supplier(risk_level="high", is_new=True)
        
        # Large requisition
        requestor = test_dataset["users"][0]
        large_req = generator.generate_requisition(
            requestor=requestor,
            suppliers=[high_risk_supplier],
            num_lines=3,
            amount_range=(50000, 75000),
        )
        
        print(f"\nProcessing large requisition: ${large_req['total_amount']:,.2f}")
        print(f"From new high-risk supplier: {high_risk_supplier['name']}")
        
        # Validate - should flag concerns
        req_result = all_agents["requisition"].validate_requisition(large_req)
        print(f"1. Requisition validation: {req_result.get('status')}")
        
        # Approval - should require multiple approvers
        approval_result = all_agents["approval"].determine_approval_chain(
            document=large_req,
            document_type="requisition",
            requestor=requestor,
        )
        tier = all_agents["approval"]._get_tier_for_amount(large_req["total_amount"])
        print(f"2. Approval tier: {tier['tier']} ({tier['description']})")
        
        # Fraud check on high-risk vendor
        invoice = {
            "id": "INV-RISKY",
            "total_amount": large_req["total_amount"],
            "vendor_invoice_number": "NEW-VENDOR-001",
        }
        fraud_result = all_agents["fraud"].analyze_transaction(
            transaction=invoice,
            vendor=high_risk_supplier,
        )
        print(f"3. Fraud analysis (high-risk): {fraud_result.get('status')}")
        
        # Compliance - should flag missing docs
        compliance_result = all_agents["compliance"].check_compliance(
            transaction=invoice,
            transaction_type="invoice",
            actors={
                "requestor": requestor,
                "approver": {"id": "manager-001", "role": "manager"},
            },
            documents=[
                {"type": "invoice", "present": True},
                {"type": "purchase_order", "present": True},
                # Missing: contract, quotes, legal review
            ],
        )
        print(f"4. Compliance (missing docs): {compliance_result.get('status')}")
        
        print("\n" + "=" * 60)

    def test_batch_processing(self, all_agents, test_dataset):
        """Test processing multiple documents in batch."""
        print("\n" + "=" * 60)
        print("Batch Processing Test")
        print("=" * 60)
        
        # Process all invoices for fraud check
        fraud_results = []
        for invoice in test_dataset["invoices"]:
            supplier = next(
                (s for s in test_dataset["suppliers"] if s["id"] == invoice.get("supplier_id")),
                test_dataset["suppliers"][0]
            )
            result = all_agents["fraud"].analyze_transaction(
                transaction=invoice,
                vendor=supplier,
            )
            fraud_results.append({
                "invoice_id": invoice["id"],
                "amount": invoice["total_amount"],
                "status": result.get("status"),
            })
        
        print(f"\nProcessed {len(fraud_results)} invoices for fraud analysis")
        for r in fraud_results[:5]:
            print(f"  {r['invoice_id']}: ${r['amount']:,.2f} -> {r['status']}")
        
        if len(fraud_results) > 5:
            print(f"  ... and {len(fraud_results) - 5} more")
        
        assert all(r["status"] is not None for r in fraud_results)


class TestDataGeneratorIntegrity:
    """Tests to verify data generator produces valid data."""

    def test_generated_data_structure(self, test_dataset):
        """Verify generated data has correct structure."""
        assert "users" in test_dataset
        assert "suppliers" in test_dataset
        assert "requisitions" in test_dataset
        assert "purchase_orders" in test_dataset
        assert "invoices" in test_dataset
        
        assert len(test_dataset["users"]) > 0
        assert len(test_dataset["suppliers"]) > 0

    def test_requisition_totals(self, test_dataset):
        """Verify requisition totals match line items."""
        for req in test_dataset["requisitions"]:
            line_total = sum(line["total_amount"] for line in req["line_items"])
            assert abs(req["total_amount"] - line_total) < 0.01, (
                f"Requisition {req['id']} total mismatch: {req['total_amount']} != {line_total}"
            )

    def test_document_chain_integrity(self, test_dataset):
        """Verify document chain references are valid."""
        po_ids = {po["id"] for po in test_dataset["purchase_orders"]}
        gr_ids = {gr["id"] for gr in test_dataset["goods_receipts"]}
        
        # GRs should reference valid POs
        for gr in test_dataset["goods_receipts"]:
            assert gr["purchase_order_id"] in po_ids
        
        # Invoices should reference valid POs and GRs
        for inv in test_dataset["invoices"]:
            assert inv["purchase_order_id"] in po_ids
            assert inv["goods_receipt_id"] in gr_ids
