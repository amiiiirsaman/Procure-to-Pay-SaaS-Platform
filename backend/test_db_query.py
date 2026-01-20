"""Quick test to simulate requisitions-status endpoint."""
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.requisition import Requisition

WORKFLOW_STEP_NAMES = {
    1: "Requisition Created",
    2: "Approval",
    3: "PO Generation",
    4: "Goods Receipt",
    5: "Invoice Validation",
    6: "Fraud Analysis",
    7: "Compliance Check",
    8: "Final Approval",
    9: "Payment",
}

db = SessionLocal()
try:
    requisitions = db.query(Requisition).order_by(Requisition.updated_at.desc()).all()
    print(f"Found {len(requisitions)} requisitions")
    
    result = []
    for req in requisitions:
        print(f"\nProcessing {req.number}...")
        
        # Parse current step from current_stage
        current_step = 1
        if req.current_stage:
            stage = str(req.current_stage)
            if stage == "completed" or stage == "payment_completed" or stage == "9":
                current_step = 9
            elif stage.startswith("step_"):
                try:
                    step = int(stage.split("_")[1])
                    current_step = step if 1 <= step <= 9 else 1
                except (IndexError, ValueError):
                    current_step = 1
            elif stage.isdigit():
                step = int(stage)
                current_step = step if 1 <= step <= 9 else 1
        
        print(f"  current_stage: {req.current_stage}, current_step: {current_step}")
        
        # Determine workflow status
        if str(req.status.value) == "rejected" or "rejected" in str(req.current_stage or ""):
            workflow_status = "rejected"
        elif req.current_stage in ("completed", "payment_completed") or current_step == 9:
            workflow_status = "completed"
        elif req.flagged_by:
            workflow_status = "hitl_pending"
        elif current_step >= 1:
            workflow_status = "in_progress"
        else:
            workflow_status = "draft"
        
        print(f"  workflow_status: {workflow_status}")
        
        # Get requestor name
        requestor_name = "James Wilson"  # Default
        
        print(f"  Building result dict...")
        result_item = {
            "id": req.id,
            "number": req.number,
            "description": req.description[:100] if req.description else "",
            "department": req.department.value if req.department else "Unknown",
            "total_amount": float(req.total_amount) if req.total_amount else 0.0,
            "current_step": current_step,
            "step_name": WORKFLOW_STEP_NAMES.get(current_step, "Unknown"),
            "workflow_status": workflow_status,
            "flagged_by": req.flagged_by,
            "flag_reason": req.flag_reason,
            "requestor_name": requestor_name,
            "requestor_id": req.requestor_id,
            "supplier_name": req.supplier_name or "Not Assigned",
            "category": req.category or "General",
            "urgency": req.urgency.value if req.urgency else "standard",
            "cost_center": req.cost_center,
            "gl_account": req.gl_account,
            "spend_type": req.spend_type,
            "supplier_risk_score": req.supplier_risk_score,
            "supplier_status": req.supplier_status,
            "contract_on_file": req.contract_on_file,
            "budget_available": float(req.budget_available) if req.budget_available else None,
            "budget_impact": str(req.budget_impact) if req.budget_impact else None,
            "justification": req.justification,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
        }
        result.append(result_item)
        print(f"  SUCCESS: {req.number}")
    
    print(f"\nTotal results: {len(result)}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
