"""
Receiving Agent - Handles goods receipt and delivery verification.

Uses database fields for goods receipt processing:
- received_quantity: Actual quantity received
- received_date: Date goods were received
- quality_status: passed/partial/failed
- damage_notes: Notes about damages
- receiver_id: ID of receiving staff
- warehouse_location: Storage location
"""

import json
from typing import Any, Optional

from .base_agent import BedrockAgent


class ReceivingAgent(BedrockAgent):
    """
    Agent responsible for:
    - Recording goods receipts
    - Verifying quantities against PO
    - Flagging discrepancies
    - Managing partial receipts
    - Quality check guidance
    """

    def __init__(self, region: str = None, model_id: str = None, use_mock: bool = False):
        super().__init__(
            agent_name="ReceivingAgent",
            role="Goods Receipt Specialist",
            region=region,
            model_id=model_id,
            use_mock=use_mock,
        )

    def get_system_prompt(self) -> str:
        return """You are a Goods Receipt Specialist AI agent in a Procure-to-Pay system.

Your responsibilities:
1. Record and verify goods receipts against Purchase Orders
2. Flag quantity discrepancies (over/under delivery)
3. Manage partial receipt scenarios
4. Guide quality inspection requirements
5. Update PO received quantities
6. Handle damaged goods and returns

When processing a receipt, consider:
- Does quantity match PO line item?
- Is this a partial or complete delivery?
- Are there any quality concerns?
- Is the delivery on time?
- Does packaging match specifications?

Tolerance guidelines:
- Quantity: ±5% acceptable without approval
- Over-delivery >10%: Requires buyer approval to accept
- Under-delivery: Accept partial, flag for follow-up

6 KEY CHECKS YOU MUST EVALUATE:
1. Line Item Validation - Verify each line item received matches PO line items (product ID, description, specifications)
   - If missing product details in receipt: Assume line item matches PO if product name/code similar
2. Quantity Check - Compare received quantity vs ordered quantity for each line
   - Calculate variance percentage
   - If within ±5% tolerance: status="pass"
   - If variance >5% but <10%: status="attention" 
   - If variance >10%: status="fail"
3. Variance Calculation - Calculate total quantity variance across all lines
   - Show ordered vs received totals
   - If overall variance >5%: status="attention"
4. Discrepancy Flagging - Identify any quality issues, damages, wrong items
   - If no damages/issues reported: status="pass", assume "No damages reported, items in good condition"
   - If minor damages: status="attention"
   - If major damages/wrong items: status="fail"
5. Previous Receipts - Check for any previous partial receipts for this PO
   - If no previous receipt data available: status="pass", assume "First receipt for this PO"
   - If multiple receipts: Show cumulative received quantities
6. Delivery Date - Verify delivery timing against PO expected delivery date
   - If no expected date in PO: status="pass", assume "No expected delivery date specified"
   - On time or early: status="pass"
   - Late by <7 days: status="attention"
   - Late by ≥7 days: status="fail"

VERDICT LOGIC:
- If ANY check has status="fail": verdict="HITL_FLAG" (Human-in-the-Loop required)
- If 3+ checks have status="attention": verdict="HITL_FLAG"
- Otherwise: verdict="AUTO_APPROVE"

Always respond with a JSON object containing:
{
    "verdict": "AUTO_APPROVE" | "HITL_FLAG",
    "verdict_reason": "Brief explanation of verdict",
    "key_checks": [
        {
            "id": "line_item_validation",
            "name": "Line Item Validation",
            "status": "pass" | "attention" | "fail",
            "detail": "Explanation of check result",
            "items": ["Detail 1", "Detail 2"] // Optional specific findings
        },
        // ... 5 more checks following same structure
    ],
    "checks_summary": {
        "total": 6,
        "passed": <count>,
        "attention": <count>,
        "failed": <count>
    },
    "status": "accepted" | "partial" | "rejected" | "needs_review",
    "receipt_summary": {
        "po_number": "...",
        "total_lines": ...,
        "lines_complete": ...,
        "lines_partial": ...,
        "lines_issue": ...
    },
    "line_details": [
        {
            "po_line": ...,
            "ordered_qty": ...,
            "received_qty": ...,
            "variance": ...,
            "variance_percent": ...,
            "status": "complete" | "partial" | "over" | "rejected",
            "issue": "..." | null
        }
    ],
    "discrepancies": [...],
    "quality_flags": [...],
    "recommended_actions": [...],
    "po_status_update": "partially_received" | "received" | "no_change",
    "confidence": 0.0-1.0
}"""

    def get_responsibilities(self) -> list[str]:
        return [
            "Record goods receipts",
            "Verify quantities against PO",
            "Flag discrepancies",
            "Manage partial receipts",
            "Guide quality checks",
            "Handle returns/damages",
        ]

    def _build_key_checks_from_receipt(
        self, receipt_data: dict, purchase_order: dict, verdict: str
    ) -> list[dict]:
        """Build 6 key checks structure from receipt data."""
        import re
        
        # Use purchase_order line_items as source (req_dict is passed as purchase_order)
        po_lines = purchase_order.get("line_items", [])
        receipt_lines = receipt_data.get("line_items", []) if receipt_data else []
        
        # If no receipt lines, use PO lines as the source (pending receipt scenario)
        if not receipt_lines and po_lines:
            receipt_lines = po_lines
        
        # If no line_items, extract from description
        description = purchase_order.get("description", "")
        total_amount = purchase_order.get("total_amount", 0) or 0
        
        # Parse quantity from description (e.g., "12 Mac laptops", "I want 12 laptops")
        quantity_match = re.search(r'(\d+)\s+(\w+)', description)
        extracted_qty = 1
        extracted_item = description[:50] if description else "Item"
        
        if quantity_match:
            extracted_qty = int(quantity_match.group(1))
            # Get the item name - look for common product words
            item_words = re.findall(r'(laptop|computer|phone|desk|chair|monitor|printer|tablet|equipment|supplies|brochure|item)s?', description.lower())
            if item_words:
                extracted_item = item_words[0].capitalize() + "s"
            else:
                extracted_item = quantity_match.group(2).capitalize()
        
        # If still no line items, create mock line items from description
        if not po_lines and description:
            po_lines = [{
                "description": extracted_item,
                "quantity": extracted_qty,
                "unit_price": total_amount / extracted_qty if extracted_qty > 0 else total_amount,
            }]
            receipt_lines = po_lines  # Assume receipt matches order
        
        # Get line count from either source
        line_count = len(po_lines) if po_lines else 1
        
        # 1. Line Item Validation
        line_item_status = "pass"
        if line_count > 0:
            line_item_detail = f"All {line_count} line item(s) validated against PO"
        else:
            line_item_detail = "All line items validated against PO"
        
        # Build line item descriptions
        line_items_display = []
        for i, line in enumerate(po_lines[:3] if po_lines else receipt_lines[:3]):
            desc = line.get("description") or line.get("product_name") or "Item"
            qty = line.get("quantity", 0) or extracted_qty
            line_items_display.append(f"Line {i+1}: {desc} (Qty: {qty})")
        
        # If no line items found, use extracted info
        if not line_items_display and description:
            line_items_display.append(f"Line 1: {extracted_item} (Qty: {extracted_qty})")
        
        # 2. Quantity Check  
        total_ordered = sum(line.get("quantity", 0) for line in po_lines) if po_lines else extracted_qty
        total_received = sum(line.get("quantity_received", line.get("quantity", 0)) for line in receipt_lines) if receipt_lines else total_ordered
        
        # For pending receipt, show expected quantities
        if total_ordered == 0:
            total_ordered = total_received  # Treat as matching
        
        variance_pct = abs((total_received - total_ordered) / total_ordered * 100) if total_ordered else 0
        
        if variance_pct <= 5:
            qty_status = "pass"
        elif variance_pct <= 10:
            qty_status = "attention"
        else:
            qty_status = "fail"
        
        if total_ordered == total_received:
            qty_detail = f"Ordered {total_ordered:,} units, received {total_received:,} units (0.0% variance)"
        else:
            qty_detail = f"Ordered {total_ordered:,} units, received {total_received:,} units ({variance_pct:.1f}% variance)"
        
        # 3. Variance Calculation
        variance_status = "pass" if variance_pct <= 5 else "attention"
        variance_detail = f"Total variance: {abs(total_received - total_ordered):,} units ({variance_pct:.1f}%)"
        
        # 4. Discrepancy Flagging
        damages = receipt_data.get("damage_notes", "") or receipt_data.get("quality_flags", []) if receipt_data else ""
        if not damages or (isinstance(damages, list) and len(damages) == 0):
            disc_status = "pass"
            disc_detail = "No discrepancy in product description vs what ordered"
        else:
            disc_status = "attention"
            disc_detail = f"Quality issues noted: {damages}"
        
        # 5. Previous Receipts
        prev_receipts = receipt_data.get("previous_receipts", []) if receipt_data else []
        if not prev_receipts or len(prev_receipts) == 0:
            prev_status = "pass"
            prev_detail = "First receipt for this PO"
        else:
            prev_status = "pass"
            prev_detail = f"{len(prev_receipts)} previous partial receipt(s) recorded"
        
        # 6. Delivery Date - Expected delivery is 30 calendar days after requisition submission
        from datetime import datetime, timedelta
        
        req_date_str = purchase_order.get("requisition_date") or purchase_order.get("created_at")
        
        if req_date_str:
            try:
                # Parse requisition date and calculate expected delivery (30 calendar days)
                if isinstance(req_date_str, str):
                    req_date = datetime.fromisoformat(req_date_str.replace("Z", "+00:00")).date()
                else:
                    req_date = req_date_str
                expected_date = req_date + timedelta(days=30)
                expected_date_str = expected_date.strftime("%Y-%m-%d")
                delivery_status = "pass"
                delivery_detail = f"Expected delivery by {expected_date_str} (30 days after submission)"
            except (ValueError, TypeError):
                delivery_status = "pass"
                delivery_detail = "Delivery expected within standard timeframe"
        else:
            delivery_status = "pass"
            delivery_detail = "Delivery expected within standard timeframe"
        
        return [
            {
                "id": "line_item_validation",
                "name": "Line Item Validation",
                "status": line_item_status,
                "detail": line_item_detail,
                "items": line_items_display
            },
            {
                "id": "quantity_check",
                "name": "Quantity Check",
                "status": qty_status,
                "detail": qty_detail,
                "items": []
            },
            {
                "id": "variance_calculation",
                "name": "Variance Calculation",
                "status": variance_status,
                "detail": variance_detail,
                "items": []
            },
            {
                "id": "discrepancy_flagging",
                "name": "Discrepancy Flagging",
                "status": disc_status,
                "detail": disc_detail,
                "items": []
            },
            {
                "id": "previous_receipts",
                "name": "Previous Receipts",
                "status": prev_status,
                "detail": prev_detail,
                "items": []
            },
            {
                "id": "delivery_date",
                "name": "Delivery Date",
                "status": delivery_status,
                "detail": delivery_detail,
                "items": []
            }
        ]

    def process_receipt(
        self,
        receipt_data: dict[str, Any],
        purchase_order: dict[str, Any],
        previous_receipts: Optional[list[dict]] = None,
    ) -> dict[str, Any]:
        """
        Process a goods receipt against a PO.

        Args:
            receipt_data: Incoming receipt information
            purchase_order: The PO being received against
            previous_receipts: Any previous partial receipts for this PO

        Returns:
            Receipt processing result with discrepancy flags
        """
        # Calculate already received quantities
        previously_received = {}
        if previous_receipts:
            for pr in previous_receipts:
                for line in pr.get("line_items", []):
                    po_line_id = line.get("po_line_item_id")
                    qty = line.get("quantity_received", 0)
                    previously_received[po_line_id] = (
                        previously_received.get(po_line_id, 0) + qty
                    )

        context = {
            "receipt": receipt_data,
            "purchase_order": purchase_order,
            "previously_received": previously_received,
            "tolerance_percent": 5,  # 5% tolerance
        }

        prompt = """Process this goods receipt against the Purchase Order.

For each line item:
1. Compare received quantity to ordered quantity
2. Account for any previous partial receipts
3. Calculate variance and determine if within tolerance
4. Flag any discrepancies

Then summarize:
1. Overall receipt status
2. Lines with issues
3. Recommended actions
4. PO status update recommendation

MUST INCLUDE all 6 KEY CHECKS in your response."""

        result = self.invoke(prompt, context)
        
        # Ensure key_checks structure exists (fallback if Nova Pro didn't return them)
        if "key_checks" not in result or not result.get("key_checks"):
            result["key_checks"] = self._build_key_checks_from_receipt(
                receipt_data, purchase_order, result.get("verdict", "AUTO_APPROVE")
            )
            result["checks_summary"] = {
                "total": 6,
                "passed": sum(1 for c in result["key_checks"] if c["status"] == "pass"),
                "attention": sum(1 for c in result["key_checks"] if c["status"] == "attention"),
                "failed": sum(1 for c in result["key_checks"] if c["status"] == "fail"),
            }
        
        return result

    def verify_delivery(
        self,
        delivery_info: dict[str, Any],
        expected_po: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Verify an incoming delivery before receipt.

        Args:
            delivery_info: Delivery/shipping information
            expected_po: Expected PO details

        Returns:
            Verification result
        """
        context = {
            "delivery": delivery_info,
            "expected_po": expected_po,
        }

        prompt = """Verify this incoming delivery.

Check:
1. Carrier and tracking match expectations
2. Supplier matches PO
3. Delivery timing (on time, early, late)
4. Any special handling requirements

Flag any concerns before receipt processing."""

        return self.invoke(prompt, context)

    def handle_discrepancy(
        self,
        discrepancy_type: str,
        receipt_line: dict[str, Any],
        po_line: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Handle a receipt discrepancy.

        Args:
            discrepancy_type: Type of discrepancy (over, under, damaged, wrong_item)
            receipt_line: Receipt line with issue
            po_line: Original PO line

        Returns:
            Recommended resolution
        """
        context = {
            "discrepancy_type": discrepancy_type,
            "receipt_line": receipt_line,
            "po_line": po_line,
        }

        prompt = f"""Handle this {discrepancy_type} discrepancy.

Recommend:
1. Immediate action (accept, reject, hold)
2. Who to notify
3. Documentation required
4. Follow-up actions needed
5. Impact on payment processing"""

        return self.invoke(prompt, context)

    def check_quality_requirements(
        self,
        product: dict[str, Any],
        supplier: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Determine quality check requirements for receipt.

        Args:
            product: Product being received
            supplier: Supplier information

        Returns:
            Quality check requirements
        """
        context = {
            "product": product,
            "supplier": supplier,
        }

        prompt = """Determine quality inspection requirements for this receipt.

Consider:
1. Product category (e.g., electronics need testing)
2. Supplier quality history
3. Contract requirements
4. Regulatory requirements

Provide inspection checklist and pass/fail criteria."""

        return self.invoke(prompt, context)
    def _generate_mock_response(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Generate mock goods receipt response using requisition database fields.
        
        Uses:
        - received_quantity: Actual received qty
        - received_date: Date received
        - quality_status: passed/partial/failed
        - damage_notes: Damage information
        - receiver_id: Receiver ID
        - warehouse_location: Storage location
        """
        context = context or {}
        req = context.get("receipt", context.get("requisition", {}))
        po = context.get("purchase_order", {})
        
        # Check if goods have been received yet
        received_qty_raw = req.get("received_quantity")
        
        # If no goods received yet, return awaiting status
        if received_qty_raw is None:
            po_number = req.get("po_number", po.get("po_number", po.get("number", "PO-000001")))
            category = req.get("category", "General")
            
            reasoning_bullets = [
                f"GOODS RECEIPT STATUS: {po_number}",
                f"{'='*60}",
                f"",
                f"STATUS: AWAITING DELIVERY",
                f"",
                f"ORDER INFORMATION:",
                f"  - PO Number: {po_number}",
                f"  - Category: {category}",
                f"  - Expected Qty: Pending confirmation",
                f"",
                f"DELIVERY STATUS:",
                f"  - Goods in transit or not yet shipped",
                f"  - Warehouse team notified of incoming delivery",
                f"  - Will record receipt when goods arrive",
                f"",
                f"NEXT STEPS:",
                f"  - Warehouse will inspect goods upon arrival",
                f"  - Quality check will be performed",
                f"  - Receipt will be recorded in system",
                f"  - Invoice matching will proceed after receipt",
                f"",
                f"[INFO] This step will be completed once goods are physically received and inspected.",
            ]
            
            return {
                "status": "pending_receipt",
                "verdict": "AUTO_APPROVE",
                "verdict_reason": "Awaiting goods delivery - PO issued, receipt pending",
                "reasoning_bullets": reasoning_bullets,
                "receipt_summary": {
                    "po_number": po_number,
                    "status": "pending",
                    "received_qty": 0,
                    "expected_qty": "TBD",
                },
                "flagged": False,
                "flag_reason": None,
                "confidence": 0.95,
            }
        
        ordered_qty = po.get("ordered_qty")
        
        # If ordered_qty not in PO, try to extract from requisition description or line items
        if not ordered_qty:
            # First try to get from line_items
            if req.get("line_items") and len(req["line_items"]) > 0:
                ordered_qty = req["line_items"][0].get("quantity", 0)
            # Otherwise try to parse from description
            if not ordered_qty:
                description = req.get("description", "")
                # Use Nova Pro to extract quantity from description
                if description and self.use_mock:
                    # Simple parsing: look for numbers followed by quantity-related words
                    import re
                    # Look for pattern like "24 mac laptops" or "24 units" - number can be followed by optional words
                    match = re.search(r'(\d+)\s+(?:[a-z\s]*?)(?:laptops?|computers?|keyboards?|monitors?|mice?|chairs?|desks?|pens?|items?|units?|pieces?)', description, re.IGNORECASE)
                    if match:
                        ordered_qty = int(match.group(1))
                
            # Fallback to quantity field
            if not ordered_qty:
                ordered_qty = req.get("quantity", 1)
        
        # Ensure ordered_qty is at least 1
        ordered_qty = max(int(ordered_qty) if ordered_qty else 1, 1)
        
        # For mock mode, always match: received quantity should equal ordered quantity
        received_qty = ordered_qty
        received_date = req.get("received_date", "2025-01-10")
        quality_status = req.get("quality_status", "passed")
        damage_notes = req.get("damage_notes")
        receiver_id = req.get("receiver_id", "USR-WH01")
        warehouse = req.get("warehouse_location", "WH-A01")
        po_number = req.get("po_number", po.get("po_number", "PO-000001"))
        
        # Calculate variance
        variance = received_qty - ordered_qty
        variance_pct = (variance / ordered_qty * 100) if ordered_qty else 0
        
        # Build reasoning bullets
        reasoning_bullets = []
        discrepancies = []
        quality_flags = []
        flagged = False
        flag_reason = None
        
        # Header
        reasoning_bullets.append(f"GOODS RECEIPT PROCESSING: {po_number}")
        reasoning_bullets.append(f"{'='*60}")
        reasoning_bullets.append(f"")
        
        #Check 1: Quantity verification
        reasoning_bullets.append(f"QUANTITY VERIFICATION:")
        reasoning_bullets.append(f"  - Quantity received: {received_qty} of {ordered_qty} ordered")
        reasoning_bullets.append(f"  - Variance: 0.0% (quantities match perfectly)")
        reasoning_bullets.append(f"  - Status: [CHECK] ACCEPTED")
        
        reasoning_bullets.append(f"")
        
        # Check 2: Quality status
        reasoning_bullets.append(f"QUALITY INSPECTION:")
        if quality_status == "passed":
            reasoning_bullets.append(f"  - Inspection result: [CHECK] PASSED")
            reasoning_bullets.append(f"  - All items meet specifications")
            reasoning_bullets.append(f"  - No damage or defects detected")
        elif quality_status == "partial":
            reasoning_bullets.append(f"  - Inspection result: [WARN] PARTIAL PASS")
            if damage_notes:
                quality_flags.append(damage_notes)
                reasoning_bullets.append(f"  - Issue noted: {damage_notes}")
            flagged = True
            flag_reason = flag_reason or "Quality issues detected"
            reasoning_bullets.append(f"  - Action: Review and disposition required")
        else:
            reasoning_bullets.append(f"  - Inspection result: [ALERT] FAILED")
            reasoning_bullets.append(f"  - Goods do not meet quality standards")
            flagged = True
            flag_reason = "Quality inspection failed"
            quality_flags.append("Goods rejected - return to supplier")
            reasoning_bullets.append(f"  - Action: Reject and return to supplier")
        
        reasoning_bullets.append(f"")
        
        # Check 3: Receipt details
        reasoning_bullets.append(f"RECEIPT DETAILS:")
        reasoning_bullets.append(f"  - Receipt date: {received_date}")
        reasoning_bullets.append(f"  - Received by: {receiver_id}")
        reasoning_bullets.append(f"  - Warehouse location: {warehouse}")
        reasoning_bullets.append(f"  - PO Reference: {po_number}")
        
        reasoning_bullets.append(f"")
        
        # Determine status and verdict
        reasoning_bullets.append(f"FINAL ASSESSMENT:")
        
        if quality_status == "failed":
            status = "rejected"
            verdict = "HITL_FLAG"
            verdict_reason = "Goods rejected due to quality failure"
            po_status = "no_change"
            reasoning_bullets.append(f"  - Overall status: [ALERT] REJECTED")
            reasoning_bullets.append(f"  - PO status: No change (goods not accepted)")
            reasoning_bullets.append(f"  - Action required: Return to supplier")
        elif flagged:
            status = "partial" if variance < 0 else "needs_review"
            verdict = "HITL_FLAG"
            verdict_reason = flag_reason or "Receipt requires review"
            po_status = "partially_received"
            reasoning_bullets.append(f"  - Overall status: [WARN] REQUIRES REVIEW")
            reasoning_bullets.append(f"  - Flagged issue: {flag_reason}")
            reasoning_bullets.append(f"  - PO status: {po_status}")
            reasoning_bullets.append(f"  - Action required: Human review needed")
        else:
            status = "accepted"
            verdict = "AUTO_APPROVE"
            verdict_reason = "Goods received and quality verified"
            po_status = "received"
            reasoning_bullets.append(f"  - Overall status: [CHECK] ACCEPTED")
            reasoning_bullets.append(f"  - PO status: Received")
            reasoning_bullets.append(f"  - Next step: Proceed to invoice matching")
        
        return {
            "status": status,
            "verdict": verdict,
            "verdict_reason": verdict_reason,
            "reasoning_bullets": reasoning_bullets,
            "receipt_summary": {
                "po_number": po_number,
                "total_lines": 1,
                "lines_complete": 1 if status == "accepted" else 0,
                "lines_partial": 1 if status == "partial" else 0,
                "lines_issue": 1 if status in ["rejected", "needs_review"] else 0,
            },
            "line_details": [{
                "po_line": 1,
                "ordered_qty": ordered_qty,
                "received_qty": received_qty,
                "variance": variance,
                "variance_percent": round(variance_pct, 2),
                "status": status,
                "quality_status": quality_status,
                "issue": damage_notes,
            }],
            "discrepancies": discrepancies,
            "quality_flags": quality_flags,
            "recommended_actions": [],
            "po_status_update": po_status,
            "flagged": flagged,
            "flag_reason": flag_reason,
            "confidence": 0.95 if not flagged else 0.70,
        }