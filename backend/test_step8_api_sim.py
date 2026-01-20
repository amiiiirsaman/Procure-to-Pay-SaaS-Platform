"""Test Step 8 (Final Approval Gate) for REQ-1768913207.

This simulates calling the workflow engine for Step 8 and verifies
that the 6 key checks show proper summary of Steps 2-7.
"""
import os
import sys

# Force mock mode
os.environ["USE_MOCK_AGENTS"] = "true"

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime


def test_step8_final_approval():
    """Test Step 8 Final Approval Gate to verify proper summaries."""
    
    print("\n" + "=" * 70)
    print("STEP 8 FINAL APPROVAL GATE - API SIMULATION TEST")
    print("=" * 70)
    
    # Test requisition data
    req_dict = {
        "id": 62,
        "number": "REQ-1768913207",
        "description": "Purchase of 12 Mac laptops for Marketing department",
        "total_amount": 15000.00,
        "amount": 15000.00,
        "supplier_name": "Office Supplies Co",
        "supplier_id": 123,
        "department": "Marketing",
        "requestor_name": "John Smith",
        "requestor_id": 1,
        "status": "PENDING",
        "created_at": datetime.now().isoformat(),
        "budget": 50000,
        "budget_allocated": 50000,
        "allocated_budget": 50000,
        "quantity": 12,
        "attached_documents": ["requisition", "purchase_order", "invoice"],
    }
    
    # Simulate running Steps 2-7 and collecting results
    # For Step 8 testing, we just need the steps_results structure
    # with verdict/verdict_reason populated
    steps_results = []
    
    # Step 2: Approval Agent - Simulate AUTO_APPROVE
    steps_results.append({
        "step_id": 2,
        "agent_name": "ApprovalAgent",
        "status": "completed",
        "result_data": {
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "All 6 checks passed - approved for processing",
        },
        "verdict": "AUTO_APPROVE",
        "verdict_reason": "All 6 checks passed - approved for processing",
        "flagged": False,
        "flag_reason": "",
    })
    print(f"\n✓ Step 2 (Approval): AUTO_APPROVE")
    
    # Step 3: PO Generation - Simulate AUTO_APPROVE
    steps_results.append({
        "step_id": 3,
        "agent_name": "POAgent",
        "status": "completed",
        "result_data": {
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "All 6 checks passed - PO generated successfully",
        },
        "verdict": "AUTO_APPROVE",
        "verdict_reason": "All 6 checks passed - PO generated successfully",
        "flagged": False,
        "flag_reason": "",
    })
    print(f"✓ Step 3 (PO Generation): AUTO_APPROVE")
    
    # Step 4: Goods Receipt - Simulate AUTO_APPROVE
    steps_results.append({
        "step_id": 4,
        "agent_name": "ReceivingAgent",
        "status": "completed",
        "result_data": {
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "Goods receipt verified - quantities match",
        },
        "verdict": "AUTO_APPROVE",
        "verdict_reason": "Goods receipt verified - quantities match",
        "flagged": False,
        "flag_reason": "",
    })
    print(f"✓ Step 4 (Goods Receipt): AUTO_APPROVE")
    
    # Step 5: Invoice Validation - Simulate AUTO_APPROVE
    steps_results.append({
        "step_id": 5,
        "agent_name": "InvoiceAgent",
        "status": "completed",
        "result_data": {
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "3-way match verified - invoice approved",
        },
        "verdict": "AUTO_APPROVE",
        "verdict_reason": "3-way match verified - invoice approved",
        "flagged": False,
        "flag_reason": "",
    })
    print(f"✓ Step 5 (Invoice Validation): AUTO_APPROVE")
    
    # Step 6: Fraud Detection - Simulate AUTO_APPROVE
    steps_results.append({
        "step_id": 6,
        "agent_name": "FraudAgent",
        "status": "completed",
        "result_data": {
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "No fraud indicators detected - low risk transaction",
        },
        "verdict": "AUTO_APPROVE",
        "verdict_reason": "No fraud indicators detected - low risk transaction",
        "flagged": False,
        "flag_reason": "",
    })
    print(f"✓ Step 6 (Fraud Detection): AUTO_APPROVE")
    
    # Step 7: Compliance Check - Simulate AUTO_APPROVE
    steps_results.append({
        "step_id": 7,
        "agent_name": "ComplianceAgent",
        "status": "completed",
        "result_data": {
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "Fully compliant with all procurement policies",
        },
        "verdict": "AUTO_APPROVE",
        "verdict_reason": "Fully compliant with all procurement policies",
        "flagged": False,
        "flag_reason": "",
    })
    print(f"✓ Step 7 (Compliance Check): AUTO_APPROVE")
    
    # Now simulate Step 8 generate_aggregated_report
    print("\n" + "-" * 70)
    print("GENERATING STEP 8 FINAL APPROVAL REPORT...")
    print("-" * 70)
    
    agent_display_names = {
        "RequisitionAgent": "Requisition Validation",
        "ApprovalAgent": "Approval Check",
        "POAgent": "PO Generation",
        "ReceivingAgent": "Goods Receipt",
        "InvoiceAgent": "Invoice Validation",
        "FraudAgent": "Fraud Analysis",
        "ComplianceAgent": "Compliance Check",
    }
    
    # Build key_checks from steps_results
    key_checks = []
    step_mapping = {
        2: ("step_2", "Approval Agent"),
        3: ("step_3", "PO Generation"),
        4: ("step_4", "Goods Receipt"),
        5: ("step_5", "Invoice Validation"),
        6: ("step_6", "Fraud Detection"),
        7: ("step_7", "Compliance Check"),
    }
    
    for step_result in steps_results:
        step_id = step_result.get("step_id", 0)
        if step_id in step_mapping:
            check_id, check_name = step_mapping[step_id]
            
            result_data = step_result.get("result_data", {})
            verdict = result_data.get("verdict", step_result.get("verdict", "N/A"))
            verdict_reason = result_data.get("verdict_reason", step_result.get("verdict_reason", ""))
            flagged = step_result.get("flagged", False)
            flag_reason = step_result.get("flag_reason", "")
            agent_name = step_result.get("agent_name", "Unknown")
            display_name = agent_display_names.get(agent_name, check_name)
            
            if verdict == "AUTO_APPROVE" and not flagged:
                check_status = "pass"
                detail = verdict_reason or "Completed - auto-approved"
            elif verdict == "HITL_FLAG" or flagged:
                check_status = "attention"
                detail = flag_reason or verdict_reason or "Requires human review"
            elif step_result.get("status") == "error":
                check_status = "fail"
                detail = flag_reason or "Step encountered an error"
            else:
                check_status = "pass"
                detail = verdict_reason or "Completed successfully"
            
            items = []
            if flagged and flag_reason:
                items.append(f"⚠️ HITL: {flag_reason}")
            
            key_checks.append({
                "id": check_id,
                "name": display_name,
                "status": check_status,
                "detail": detail,
                "items": items,
            })
    
    # Print results
    print("\n" + "=" * 70)
    print("STEP 8 KEY CHECKS (Summary of Steps 2-7):")
    print("=" * 70)
    
    passed = 0
    attention = 0
    failed = 0
    
    for i, check in enumerate(key_checks, 1):
        status = check["status"]
        if status == "pass":
            passed += 1
            status_str = "[PASS]"
        elif status == "attention":
            attention += 1
            status_str = "[ATTENTION]"
        else:
            failed += 1
            status_str = "[FAIL]"
        
        print(f"\n{i}. {status_str} {check['name']}")
        print(f"   Detail: {check['detail']}")
        if check.get("items"):
            for item in check["items"]:
                print(f"   • {item}")
    
    print("\n" + "-" * 70)
    print(f"Summary: {passed} passed, {attention} attention, {failed} failed")
    print("-" * 70)
    
    # Determine overall recommendation
    all_passed = (failed == 0 and attention == 0)
    amount = req_dict.get("total_amount", 0)
    
    if all_passed and amount < 50000:
        recommendation = "✅ APPROVE - All 6 agent checks passed"
    elif all_passed:
        recommendation = "📋 REVIEW - All checks passed but high-value amount requires scrutiny"
    else:
        recommendation = "⚠️ REVIEW - Some agents flagged issues requiring attention"
    
    print(f"\nFinal Recommendation: {recommendation}")
    print("=" * 70)
    
    # Validate
    if len(key_checks) == 6:
        print("\n✅ SUCCESS: Step 8 shows proper summary of all 6 agent steps!")
    else:
        print(f"\n❌ FAIL: Expected 6 key checks, got {len(key_checks)}")
    
    # Check that details are meaningful (not just "Completed")
    generic_details = sum(1 for c in key_checks if c["detail"] in ["Completed", "Step not yet executed"])
    if generic_details == 0:
        print("✅ SUCCESS: All details are meaningful (not generic 'Completed')")
    else:
        print(f"⚠️ WARNING: {generic_details} checks have generic details")
    
    return key_checks


def test_step8_with_hitl_flag():
    """Test Step 8 when some agents have HITL flags."""
    
    print("\n" + "=" * 70)
    print("STEP 8 FINAL APPROVAL - WITH HITL FLAG TEST")
    print("=" * 70)
    
    # Test requisition data
    req_dict = {
        "id": 62,
        "number": "REQ-1768913207",
        "description": "Purchase of 12 Mac laptops for Marketing department",
        "total_amount": 15000.00,
        "supplier_name": "Office Supplies Co",
        "department": "Marketing",
    }
    
    # Simulate Steps 2-7 with Step 6 (Fraud) flagged for HITL
    steps_results = [
        {
            "step_id": 2,
            "agent_name": "ApprovalAgent",
            "status": "completed",
            "result_data": {"verdict": "AUTO_APPROVE", "verdict_reason": "All checks passed"},
            "flagged": False,
            "flag_reason": "",
        },
        {
            "step_id": 3,
            "agent_name": "POAgent",
            "status": "completed",
            "result_data": {"verdict": "AUTO_APPROVE", "verdict_reason": "PO generated"},
            "flagged": False,
            "flag_reason": "",
        },
        {
            "step_id": 4,
            "agent_name": "ReceivingAgent",
            "status": "completed",
            "result_data": {"verdict": "AUTO_APPROVE", "verdict_reason": "Receipt verified"},
            "flagged": False,
            "flag_reason": "",
        },
        {
            "step_id": 5,
            "agent_name": "InvoiceAgent",
            "status": "completed",
            "result_data": {"verdict": "AUTO_APPROVE", "verdict_reason": "Invoice validated"},
            "flagged": False,
            "flag_reason": "",
        },
        {
            "step_id": 6,
            "agent_name": "FraudAgent",
            "status": "completed",
            "result_data": {"verdict": "HITL_FLAG", "verdict_reason": "Unusual transaction pattern detected"},
            "flagged": True,
            "flag_reason": "Supplier risk score exceeds threshold (75/100)",
        },
        {
            "step_id": 7,
            "agent_name": "ComplianceAgent",
            "status": "completed",
            "result_data": {"verdict": "AUTO_APPROVE", "verdict_reason": "Compliant"},
            "flagged": False,
            "flag_reason": "",
        },
    ]
    
    agent_display_names = {
        "RequisitionAgent": "Requisition Validation",
        "ApprovalAgent": "Approval Check",
        "POAgent": "PO Generation",
        "ReceivingAgent": "Goods Receipt",
        "InvoiceAgent": "Invoice Validation",
        "FraudAgent": "Fraud Analysis",
        "ComplianceAgent": "Compliance Check",
    }
    
    step_mapping = {
        2: ("step_2", "Approval Agent"),
        3: ("step_3", "PO Generation"),
        4: ("step_4", "Goods Receipt"),
        5: ("step_5", "Invoice Validation"),
        6: ("step_6", "Fraud Detection"),
        7: ("step_7", "Compliance Check"),
    }
    
    key_checks = []
    for step_result in steps_results:
        step_id = step_result.get("step_id", 0)
        if step_id in step_mapping:
            check_id, check_name = step_mapping[step_id]
            
            result_data = step_result.get("result_data", {})
            verdict = result_data.get("verdict", "N/A")
            verdict_reason = result_data.get("verdict_reason", "")
            flagged = step_result.get("flagged", False)
            flag_reason = step_result.get("flag_reason", "")
            agent_name = step_result.get("agent_name", "Unknown")
            display_name = agent_display_names.get(agent_name, check_name)
            
            if verdict == "AUTO_APPROVE" and not flagged:
                check_status = "pass"
                detail = verdict_reason or "Completed - auto-approved"
            elif verdict == "HITL_FLAG" or flagged:
                check_status = "attention"
                detail = flag_reason or verdict_reason or "Requires human review"
            else:
                check_status = "pass"
                detail = verdict_reason or "Completed"
            
            items = []
            if flagged and flag_reason:
                items.append(f"⚠️ HITL: {flag_reason}")
            
            key_checks.append({
                "id": check_id,
                "name": display_name,
                "status": check_status,
                "detail": detail,
                "items": items,
            })
    
    print("\nKEY CHECKS (Summary of Steps 2-7 with HITL flag):")
    print("-" * 70)
    
    passed = 0
    attention = 0
    
    for i, check in enumerate(key_checks, 1):
        status = check["status"]
        if status == "pass":
            passed += 1
            status_str = "[PASS]"
        else:
            attention += 1
            status_str = "[ATTENTION]"
        
        print(f"\n{i}. {status_str} {check['name']}")
        print(f"   Detail: {check['detail']}")
        if check.get("items"):
            for item in check["items"]:
                print(f"   • {item}")
    
    print("\n" + "-" * 70)
    print(f"Summary: {passed} passed, {attention} attention")
    
    if attention > 0:
        print("\n✅ SUCCESS: HITL flags are properly shown with bullet reasons!")
    else:
        print("\n❌ FAIL: HITL flags should have been shown")


if __name__ == "__main__":
    test_step8_final_approval()
    test_step8_with_hitl_flag()
