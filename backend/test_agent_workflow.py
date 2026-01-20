"""
Test agent workflow with live requisition processing.
Shows agent reasoning at each step.
"""
import asyncio
import sys
from datetime import date
from decimal import Decimal

from app.database import SessionLocal
from app.models.requisition import Requisition, RequisitionLineItem
from app.models.enums import Department, Urgency
from app.orchestrator.workflow import P2POrchestrator
from app.orchestrator.state import create_initial_state


async def create_and_process_requisition(
    description: str,
    total_amount: Decimal,
    department: Department,
    urgency: Urgency,
    num_items: int = 1,
):
    """Create a requisition and process it through agents."""
    db = SessionLocal()
    try:
        # Create requisition
        req = Requisition(
            requester_id="USR-001",
            department=department,
            urgency=urgency,
            justification=description,
            created_at=date.today(),
        )
        db.add(req)
        db.flush()

        # Add line items
        item_amount = total_amount / num_items
        for i in range(num_items):
            line_item = RequisitionLineItem(
                requisition_id=req.id,
                line_number=i + 1,
                description=f"{description} - Item {i+1}",
                quantity=1,
                estimated_unit_price=item_amount,
                total=item_amount,
            )
            db.add(line_item)

        db.commit()
        db.refresh(req)

        print(f"\n{'='*80}")
        print(f"REQUISITION {req.number}")
        print(f"{'='*80}")
        print(f"Description: {description}")
        print(f"Total Amount: ${total_amount:,.2f}")
        print(f"Department: {department.value}")
        print(f"Urgency: {urgency.value}")
        print(f"Items: {num_items}")
        print(f"{'='*80}\n")

        # Process through workflow
        orchestrator = P2POrchestrator()
        state = create_initial_state(
            requisition_id=req.id,
            workflow_type="requisition",
        )

        print("Starting workflow processing...\n")

        # Run workflow
        result = await orchestrator.run(state)

        # Show final state
        print(f"\n{'='*80}")
        print("WORKFLOW COMPLETE")
        print(f"{'='*80}")
        print(f"Status: {result.get('requisition_status', 'unknown')}")
        print(f"Current Stage: {result.get('current_stage', 'unknown')}")

        if "agent_notes" in result:
            print(f"\nAgent Actions:")
            for note in result["agent_notes"]:
                print(f"  - {note['agent']}: {note['action']}")

        if "flags" in result and result["flags"]:
            print(f"\nWARNING - Flags:")
            for flag in result["flags"]:
                print(f"  - {flag.get('message', 'Unknown flag')}")

        print(f"{'='*80}\n")

        return req, result

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def main():
    """Create and process 10 requisitions."""

    test_cases = [
        # Should auto-approve (< $1000)
        ("Office Supplies - Pens and Paper", Decimal("250.00"), Department.OPERATIONS, Urgency.STANDARD, 1),
        ("Employee Training Materials", Decimal("500.00"), Department.HR, Urgency.STANDARD, 2),

        # Should need manager approval ($1K-$5K)
        ("Software Licenses - 5 users", Decimal("2500.00"), Department.IT, Urgency.URGENT, 5),
        ("Marketing Brochures", Decimal("3000.00"), Department.MARKETING, Urgency.STANDARD, 1),

        # Should need director approval ($5K-$25K)
        ("New Laptops for Team", Decimal("12000.00"), Department.IT, Urgency.URGENT, 6),
        ("Conference Booth Setup", Decimal("8500.00"), Department.MARKETING, Urgency.STANDARD, 1),

        # Should need VP approval ($25K-$50K)
        ("Server Infrastructure Upgrade", Decimal("35000.00"), Department.IT, Urgency.EMERGENCY, 3),

        # Should need CFO approval (> $50K)
        ("Data Center Equipment", Decimal("75000.00"), Department.IT, Urgency.URGENT, 10),

        # Suspicious - duplicate supplier, round numbers
        ("Office Supplies - Exact Round Amount", Decimal("5000.00"), Department.FINANCE, Urgency.STANDARD, 1),

        # Edge case - exactly at threshold
        ("Equipment at Threshold", Decimal("25000.00"), Department.OPERATIONS, Urgency.STANDARD, 5),
    ]

    results = []
    for i, (desc, amount, dept, urg, items) in enumerate(test_cases, 1):
        print(f"\n\n{'#'*80}")
        print(f"TEST CASE {i}/10")
        print(f"{'#'*80}")

        req, result = await create_and_process_requisition(desc, amount, dept, urg, items)
        results.append((req, result))

        # Small delay between requests
        await asyncio.sleep(0.5)

    # Summary
    print(f"\n\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")

    auto_approved = sum(1 for _, r in results if r.get("requisition_status") == "approved")
    flagged = sum(1 for _, r in results if r.get("flags"))
    pending = sum(1 for _, r in results if r.get("requisition_status") == "pending")

    print(f"Total Requisitions: {len(results)}")
    print(f"Auto-Approved: {auto_approved}")
    print(f"Pending Approval: {pending}")
    print(f"Flagged for Review: {flagged}")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    print("P2P Agent Workflow Test")
    print("="*80)
    asyncio.run(main())
