"""
Test requisition workflow with detailed agent analysis.
Shows each agent's reasoning and decisions step-by-step.
"""
import asyncio
import sys
from datetime import date
from decimal import Decimal

from app.database import SessionLocal
from app.models.requisition import Requisition, RequisitionLineItem
from app.models.enums import Department, Urgency, DocumentStatus
from app.orchestrator.workflow import P2POrchestrator
from app.orchestrator.state import create_initial_state


def print_separator(char="=", length=80):
    """Print a separator line."""
    print(char * length)


def print_section_header(title):
    """Print a section header."""
    print_separator()
    print(f" {title}")
    print_separator()


async def process_requisition_with_details(req_id: int, req_number: str):
    """Process a requisition and show detailed agent workflow."""
    db = SessionLocal()
    try:
        # Load requisition with details
        req = db.query(Requisition).filter(Requisition.id == req_id).first()
        if not req:
            print(f"ERROR: Requisition {req_number} not found")
            return

        print_section_header(f"PROCESSING REQUISITION: {req.number}")
        
        # Show requisition details
        print(f"\nREQUISITION DETAILS:")
        print(f"  Number: {req.number}")
        print(f"  Status: {req.status.value}")
        print(f"  Description: {req.description}")
        print(f"  Department: {req.department.value}")
        print(f"  Urgency: {req.urgency.value}")
        print(f"  Total Amount: ${req.total_amount:,.2f}")
        print(f"  Requestor ID: {req.requestor_id}")
        
        # Show line items
        line_items = db.query(RequisitionLineItem).filter(
            RequisitionLineItem.requisition_id == req.id
        ).all()
        
        print(f"\n  LINE ITEMS ({len(line_items)} items):")
        for item in line_items:
            print(f"    - {item.description}")
            print(f"      Qty: {item.quantity} x ${item.estimated_unit_price:,.2f} = ${item.total:,.2f}")
        
        # Initialize orchestrator and state
        print(f"\nINITIALIZING WORKFLOW...")
        orchestrator = P2POrchestrator()
        state = create_initial_state(
            requisition_id=req.id,
            workflow_type="requisition",
        )
        
        print(f"  Workflow Type: {state.get('workflow_type', 'unknown')}")
        print(f"  Initial Stage: {state.get('current_stage', 'unknown')}")
        
        # Run the workflow
        print(f"\nSTARTING AGENT WORKFLOW...")
        print_separator("-")
        
        result = await orchestrator.run(state)
        
        # Display results
        print_separator("-")
        print(f"\nWORKFLOW COMPLETED")
        print(f"\nFINAL STATE:")
        print(f"  Requisition Status: {result.get('requisition_status', 'unknown')}")
        print(f"  Current Stage: {result.get('current_stage', 'unknown')}")
        print(f"  Needs Approval: {result.get('needs_approval', False)}")
        print(f"  Approval Level: {result.get('approval_level', 'none')}")
        
        # Show agent actions
        if "agent_notes" in result and result["agent_notes"]:
            print(f"\nAGENT ACTIONS:")
            for i, note in enumerate(result["agent_notes"], 1):
                print(f"\n  [{i}] {note.get('agent', 'Unknown Agent')}")
                print(f"      Action: {note.get('action', 'No action')}")
                if 'reasoning' in note:
                    print(f"      Reasoning: {note['reasoning']}")
                if 'timestamp' in note:
                    print(f"      Time: {note['timestamp']}")
        
        # Show flags
        if "flags" in result and result["flags"]:
            print(f"\nFLAGS RAISED:")
            for i, flag in enumerate(result["flags"], 1):
                print(f"\n  [{i}] {flag.get('type', 'Unknown')}")
                print(f"      Severity: {flag.get('severity', 'unknown')}")
                print(f"      Message: {flag.get('message', 'No message')}")
                if 'agent' in flag:
                    print(f"      Flagged By: {flag['agent']}")
        
        # Show approvals needed
        if result.get('needs_approval'):
            print(f"\nAPPROVAL REQUIREMENTS:")
            print(f"  Level Required: {result.get('approval_level', 'unknown')}")
            if 'approvers' in result:
                print(f"  Approvers:")
                for approver in result['approvers']:
                    print(f"    - {approver}")
        
        # Show compliance checks
        if "compliance_status" in result:
            print(f"\nCOMPLIANCE STATUS:")
            print(f"  Overall: {result['compliance_status']}")
            if 'compliance_issues' in result:
                for issue in result['compliance_issues']:
                    print(f"    - {issue}")
        
        # Show fraud analysis
        if "fraud_risk" in result:
            print(f"\nFRAUD ANALYSIS:")
            print(f"  Risk Level: {result['fraud_risk']}")
            if 'fraud_indicators' in result:
                print(f"  Indicators:")
                for indicator in result['fraud_indicators']:
                    print(f"    - {indicator}")
        
        print_separator("=")
        print()
        
        return result

    except Exception as e:
        print(f"\nERROR processing requisition: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()


async def create_new_requisition():
    """Create a new test requisition."""
    db = SessionLocal()
    try:
        print_section_header("CREATING NEW REQUISITION")
        
        # Create requisition
        req = Requisition(
            requestor_id="USR-001",
            department=Department.IT,
            description="Emergency Laptop Replacement - Stolen Equipment",
            justification="Employee laptop was stolen, need immediate replacement for critical project work",
            urgency=Urgency.EMERGENCY,
            status=DocumentStatus.DRAFT,
            total_amount=2500.00,
            currency="USD",
        )
        db.add(req)
        db.flush()
        
        # Generate number
        req.number = f"REQ-{req.id:06d}"
        
        # Add line item
        line_item = RequisitionLineItem(
            requisition_id=req.id,
            line_number=1,
            description="Dell Latitude 7430 Laptop - i7, 16GB RAM, 512GB SSD",
            quantity=1,
            estimated_unit_price=2500.00,
            total=2500.00,
        )
        db.add(line_item)
        
        db.commit()
        db.refresh(req)
        
        print(f"\nCREATED NEW REQUISITION:")
        print(f"  ID: {req.id}")
        print(f"  Number: {req.number}")
        print(f"  Description: {req.description}")
        print(f"  Total: ${req.total_amount:,.2f}")
        print(f"  Urgency: {req.urgency.value}")
        print()
        
        return req.id, req.number
        
    except Exception as e:
        db.rollback()
        print(f"\nERROR creating requisition: {e}")
        import traceback
        traceback.print_exc()
        return None, None
    finally:
        db.close()


async def main():
    """Main test function."""
    print_separator("=")
    print(" P2P REQUISITION WORKFLOW TEST")
    print(" Testing 5 existing + 1 new requisition")
    print_separator("=")
    print()
    
    db = SessionLocal()
    
    try:
        # Get 5 existing requisitions
        print("FETCHING 5 EXISTING REQUISITIONS FROM DATABASE...")
        existing_reqs = db.query(Requisition).limit(5).all()
        
        if not existing_reqs:
            print("ERROR: No requisitions found in database!")
            print("Please run: python -m scripts.seed_database")
            return
        
        print(f"Found {len(existing_reqs)} requisitions\n")
        
        # Create 1 new requisition
        new_req_id, new_req_number = await create_new_requisition()
        
        # Process all requisitions
        all_reqs = [(r.id, r.number) for r in existing_reqs]
        if new_req_id:
            all_reqs.append((new_req_id, new_req_number))
        
        print(f"\nPROCESSING {len(all_reqs)} REQUISITIONS THROUGH WORKFLOW...\n")
        
        results = []
        for i, (req_id, req_number) in enumerate(all_reqs, 1):
            print(f"\n{'#'*80}")
            print(f"# REQUISITION {i}/{len(all_reqs)}")
            print(f"{'#'*80}\n")
            
            result = await process_requisition_with_details(req_id, req_number)
            if result:
                results.append((req_number, result))
            
            # Small delay between processing
            if i < len(all_reqs):
                await asyncio.sleep(1)
        
        # Summary
        print_section_header("WORKFLOW TEST SUMMARY")
        print(f"\nTotal Requisitions Processed: {len(results)}")
        print(f"  - Existing: {len(existing_reqs)}")
        print(f"  - New: {1 if new_req_id else 0}")
        
        if results:
            approved = sum(1 for _, r in results if r.get('requisition_status') == 'approved')
            pending = sum(1 for _, r in results if r.get('requisition_status') == 'pending_approval')
            flagged = sum(1 for _, r in results if r.get('flags'))
            
            print(f"\nStatus Breakdown:")
            print(f"  - Auto-Approved: {approved}")
            print(f"  - Pending Approval: {pending}")
            print(f"  - Flagged for Review: {flagged}")
        
        print_separator("=")
        
    except Exception as e:
        print(f"\nERROR in main: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("\nStarting workflow test...")
    print("This will show detailed agent reasoning for each step.\n")
    asyncio.run(main())
