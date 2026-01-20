"""
Approval Agent - Manages approval workflow routing and decisions.

Uses database fields for decision making:
- requestor_authority_level: Requestor's spending limit
- department_budget_limit: Department's budget cap
- prior_approval_reference: Pre-approval reference if exists
"""

import json
from typing import Any, Optional

from .base_agent import BedrockAgent
from ..config import settings


class ApprovalAgent(BedrockAgent):
    """
    Agent responsible for:
    - Determining approval chain based on amount and policies
    - Routing to appropriate approvers
    - Making approval recommendations
    - Sending reminders for pending approvals
    - Handling escalations
    """

    # Approval tiers based on US best practices (Coupa-style)
    APPROVAL_TIERS = [
        {"tier": 1, "max_amount": 1000, "approver_role": "auto", "description": "Auto-approve"},
        {"tier": 2, "max_amount": 5000, "approver_role": "manager", "description": "Manager approval"},
        {"tier": 3, "max_amount": 25000, "approver_role": "director", "description": "Director approval"},
        {"tier": 4, "max_amount": 50000, "approver_role": "vp", "description": "VP + Finance"},
        {"tier": 5, "max_amount": 100000, "approver_role": "cfo", "description": "CFO approval"},
        {"tier": 6, "max_amount": float("inf"), "approver_role": "ceo", "description": "CEO/Board approval"},
    ]

    def __init__(self, region: str = None, model_id: str = None, use_mock: bool = False):
        super().__init__(
            agent_name="ApprovalAgent",
            role="Approval Workflow Manager",
            region=region,
            model_id=model_id,
            use_mock=use_mock,
        )

    def get_system_prompt(self) -> str:
        return """You are an Approval Workflow Manager AI agent in a Procure-to-Pay system.

Your responsibilities:
1. Determine the correct approval chain based on amount, department, and policies
2. Route approvals to the appropriate people
3. Make recommendations on whether to approve or reject
4. Identify any policy violations that require additional review
5. Handle emergency/expedited approval requests appropriately

Approval Tier Guidelines (US Standard):
- Tier 1 (<$1,000): Auto-approve for approved vendors
- Tier 2 ($1,000-$5,000): Direct manager approval
- Tier 3 ($5,000-$50,000): Director approval (within requestor authority)
- Tier 4 ($50,000-$100,000): CFO approval
- Tier 5 (>$100,000): CEO/Board approval

Special considerations:
- Emergency requests may skip one level but require retrospective review
- IT purchases over $10K require IT Security review
- Marketing spend over $25K requires CMO approval
- Legal/consulting services require General Counsel review

6 KEY CHECKS YOU MUST EVALUATE:

1. COMPLIANCE CHECK
   - Supplier verified (approved/preferred status)
   - Contract on file
   → PASS if both verified, ATTENTION if missing contract, FAIL if supplier not verified

2. BUDGET CHECK
   - Amount within department budget
   - Budget impact acceptable (<25% is low impact)
   → PASS if within budget and low impact, ATTENTION if high impact, FAIL if exceeds budget

3. DOCUMENT VERIFICATION
   - Quote attached (required for >$5K)
   - SOW for services
   - W9 for new suppliers
   → PASS if all required docs present, FAIL if any missing

4. POLICY REVIEW
   - Department spend policies followed
   - Category-specific rules met
   - Special reviews identified (IT Security, CMO, Legal)
   → PASS if no special reviews needed, ATTENTION if special reviews required

5. REQUESTOR AUTHORITY
   - Amount within requestor's authority limit
   - Eligible for direct approval
   → PASS if within authority, ATTENTION if escalation needed

6. URGENCY/PRIORITY
   - Urgency level assessment (standard/urgent/emergency)
   - Timeline appropriate for priority
   → PASS for standard priority, ATTENTION for urgent/emergency requests

VERDICT LOGIC:
- If ANY check has status "fail" → verdict = "HITL_FLAG" (human review required)
- If 3+ checks have status "attention" → verdict = "HITL_FLAG"
- If 2+ checks "attention" AND urgent request → verdict = "HITL_FLAG"
- If Tier 1 and all checks "pass" → verdict = "AUTO_APPROVE"
- Otherwise → verdict = "AUTO_APPROVE" (with notes on attention items)

Always respond with a JSON object containing:
{
    "status": "approved" | "rejected" | "pending_review" | "escalated",
    "verdict": "AUTO_APPROVE" | "HITL_FLAG",
    "verdict_reason": "...",
    "approval_chain": [
        {"step": 1, "role": "...", "user_id": "...", "reason": "..."},
        ...
    ],
    "tier": 1-6,
    "recommendation": "approve" | "reject" | "review",
    "recommendation_reason": "...",
    "policy_flags": [...],
    "special_reviews_required": [...],
    "estimated_time_hours": ...,
    "confidence": 0.0-1.0
}"""

    def get_responsibilities(self) -> list[str]:
        return [
            "Determine approval chain by amount/policy",
            "Route to appropriate approvers",
            "Make approval recommendations",
            "Handle emergency escalations",
            "Track approval SLAs",
            "Send approval reminders",
        ]

    def determine_approval_chain(
        self,
        document: dict[str, Any],
        document_type: str,
        requestor: dict[str, Any],
        available_approvers: Optional[list[dict]] = None,
    ) -> dict[str, Any]:
        """
        Determine the approval chain for a document.

        Args:
            document: The document (requisition, PO, invoice) data
            document_type: Type of document
            requestor: Requestor user data
            available_approvers: List of potential approvers

        Returns:
            Approval chain with routing details
        """
        amount = document.get("total_amount", 0)
        tier = self._get_tier_for_amount(amount)

        context = {
            "document_type": document_type,
            "document": document,
            "amount": amount,
            "tier": tier,
            "requestor": requestor,
            "available_approvers": available_approvers or [],
            "approval_tiers": self.APPROVAL_TIERS,
        }

        prompt = f"""Determine the approval chain for this {document_type}.

Amount: ${amount:,.2f} (Tier {tier['tier']}: {tier['description']})

Consider:
1. Base approval tier requirements
2. Department-specific rules
3. Special review requirements (IT security, legal, etc.)
4. Requestor's reporting chain
5. Any policy exceptions needed

Build the complete approval chain with specific approvers."""

        result = self.invoke(prompt, context)
        
        # FORCE fallback: Always use deterministic key_checks for UI consistency
        if result and isinstance(result, dict):
            result["key_checks"] = self._build_key_checks_from_requisition(document, result.get("verdict", "HITL_FLAG"))
            checks = result["key_checks"]
            result["checks_summary"] = {
                "total": 6,
                "passed": sum(1 for c in checks if c["status"] == "pass"),
                "attention": sum(1 for c in checks if c["status"] == "attention"),
                "failed": sum(1 for c in checks if c["status"] == "fail"),
            }
        
        return result

    def make_approval_decision(
        self,
        document: dict[str, Any],
        document_type: str,
        approver: dict[str, Any],
        context_data: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Make an approval recommendation.

        Args:
            document: Document to approve
            document_type: Type of document
            approver: The approver reviewing
            context_data: Additional context (budget, history, etc.)

        Returns:
            Approval decision with reasoning
        """
        context = {
            "document_type": document_type,
            "document": document,
            "approver": approver,
            "budget_info": context_data.get("budget") if context_data else None,
            "vendor_history": context_data.get("vendor_history") if context_data else None,
            "similar_approvals": context_data.get("similar_approvals") if context_data else None,
        }

        prompt = f"""Review this {document_type} and provide an approval recommendation.

As the approver ({approver.get('role', 'reviewer')}), consider:
1. Is the request justified and necessary?
2. Is the amount reasonable for the goods/services?
3. Is the vendor appropriate?
4. Any budget concerns?
5. Any policy violations?

Provide a clear approve/reject recommendation with detailed reasoning."""

        return self.invoke(prompt, context)

    def handle_escalation(
        self,
        document: dict[str, Any],
        escalation_reason: str,
        current_approver: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Handle approval escalation.

        Args:
            document: Document being escalated
            escalation_reason: Reason for escalation
            current_approver: Current approver in chain

        Returns:
            Escalation routing decision
        """
        context = {
            "document": document,
            "escalation_reason": escalation_reason,
            "current_approver": current_approver,
            "approval_tiers": self.APPROVAL_TIERS,
        }

        prompt = """Handle this escalation request.

Determine:
1. Is the escalation valid?
2. Who should this escalate to?
3. Should any steps be skipped?
4. What additional documentation is needed?
5. What's the new expected timeline?"""

        return self.invoke(prompt, context)

    def _get_tier_for_amount(self, amount: float) -> dict[str, Any]:
        """Get the approval tier for a given amount."""
        if amount is None:
            amount = 0
        for tier in self.APPROVAL_TIERS:
            if amount <= tier["max_amount"]:
                return tier
        return self.APPROVAL_TIERS[-1]

    def check_auto_approve(self, amount: float, vendor_approved: bool = True) -> bool:
        """Check if amount qualifies for auto-approval."""
        if amount is None:
            amount = 0
        return (
            amount <= settings.auto_approve_threshold
            and vendor_approved
        )

    def _generate_mock_response(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Generate mock approval response with 6 structured key checks.
        
        Key Checks:
        1. Compliance Check - Verified supplier and contract on file
        2. Budget Check - Amount within department budget limit
        3. Document Verification - Required documents attached
        4. Policy Review - Alignment with department spend policies
        5. Requestor Authority Check - Requestor's authority level
        6. Urgency/Priority Check - Urgency level assessment
        """
        context = context or {}
        doc = context.get("document", {})
        
        # Extract requisition fields with defaults - ensure numeric values are not None
        amount = doc.get("total_amount") or 0
        if amount is None:
            amount = 0
        tier = self._get_tier_for_amount(amount)
        urgency = doc.get("urgency") or "standard"
        department = doc.get("department") or "Operations"
        requestor_limit = doc.get("requestor_authority_level") or 50000
        dept_budget = doc.get("department_budget_limit") or 500000  # Default $500K
        category = doc.get("category") or "General"
        
        # Supplier data (defaults for simulation)
        supplier_name = doc.get("supplier_name") or "Vendor"
        supplier_status = doc.get("supplier_status") or "approved"  # approved, preferred, new, pending
        contract_on_file = doc.get("contract_on_file")
        if contract_on_file is None:
            contract_on_file = True  # Default to True if not specified
        
        # Initialize tracking
        key_checks: list[dict[str, Any]] = []
        policy_flags: list[str] = []
        special_reviews: list[str] = []
        flagged = False
        flag_reason = None
        checks_failed = 0
        checks_attention = 0
        
        # ═══════════════════════════════════════════════════════════════════
        # KEY CHECK 1: Compliance Check - Verified supplier and contract
        # ═══════════════════════════════════════════════════════════════════
        supplier_verified = supplier_status in ["approved", "preferred", "verified"]
        has_contract = contract_on_file is True
        
        if supplier_verified and has_contract:
            check1_status = "pass"
            check1_detail = f"Verified supplier ({supplier_name}) with contract on file"
        elif supplier_verified and not has_contract:
            check1_status = "attention"
            check1_detail = f"Supplier verified but no contract on file - review required"
            checks_attention += 1
        elif has_contract and not supplier_verified:
            check1_status = "attention"
            check1_detail = f"Contract exists but supplier status: {supplier_status or 'unknown'}"
            checks_attention += 1
        else:
            check1_status = "fail"
            check1_detail = f"Supplier not verified and no contract on file"
            checks_failed += 1
            policy_flags.append("Missing supplier verification and contract")
        
        key_checks.append({
            "id": 1,
            "name": "Compliance Check",
            "status": check1_status,
            "detail": check1_detail,
            "items": [
                {"label": "Supplier Verified", "passed": supplier_verified},
                {"label": "Contract on File", "passed": has_contract}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # KEY CHECK 2: Budget Check - Amount within department budget
        # ═══════════════════════════════════════════════════════════════════
        budget_percent = (amount / dept_budget * 100) if dept_budget > 0 else 0
        within_budget = amount <= dept_budget
        low_impact = budget_percent <= 25
        
        if within_budget and low_impact:
            check2_status = "pass"
            check2_detail = f"${amount:,.0f} within department budget of ${dept_budget:,.0f} ({budget_percent:.1f}%)"
        elif within_budget and budget_percent <= 50:
            check2_status = "attention"
            check2_detail = f"${amount:,.0f} uses {budget_percent:.1f}% of budget - monitor spending"
            checks_attention += 1
        elif within_budget:
            check2_status = "attention"
            check2_detail = f"${amount:,.0f} uses {budget_percent:.1f}% of budget - high impact"
            checks_attention += 1
            policy_flags.append(f"High budget impact ({budget_percent:.0f}% of department budget)")
        else:
            check2_status = "fail"
            check2_detail = f"${amount:,.0f} EXCEEDS department budget of ${dept_budget:,.0f}"
            checks_failed += 1
            policy_flags.append("Exceeds department budget limit")
        
        key_checks.append({
            "id": 2,
            "name": "Budget Check",
            "status": check2_status,
            "detail": check2_detail,
            "items": [
                {"label": "Within Budget Limit", "passed": within_budget},
                {"label": "Budget Impact <25%", "passed": low_impact}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # KEY CHECK 3: Document Verification - Required documents attached
        # ═══════════════════════════════════════════════════════════════════
        # Simulate document requirements based on amount/category
        requires_quote = amount > 5000
        requires_sow = category in ["Professional Services", "Consulting", "Software", "Cloud Services"]
        requires_w9 = supplier_status == "new"
        
        # Simulate document presence (default: present for demo)
        has_quote = not requires_quote or doc.get("has_quote", True)
        has_sow = not requires_sow or doc.get("has_sow", True)
        has_w9 = not requires_w9 or doc.get("has_w9", True)
        
        missing_docs = []
        if requires_quote and not has_quote:
            missing_docs.append("Quote")
        if requires_sow and not has_sow:
            missing_docs.append("SOW")
        if requires_w9 and not has_w9:
            missing_docs.append("W9")
        
        if not missing_docs:
            check3_status = "pass"
            docs_list = []
            if requires_quote:
                docs_list.append("Quote")
            if requires_sow:
                docs_list.append("SOW")
            if requires_w9:
                docs_list.append("W9")
            if docs_list:
                check3_detail = f"Required documents verified: {', '.join(docs_list)}"
            else:
                check3_detail = "No additional documents required for this purchase"
        else:
            check3_status = "fail"
            check3_detail = f"Missing required documents: {', '.join(missing_docs)}"
            checks_failed += 1
            policy_flags.append(f"Missing documents: {', '.join(missing_docs)}")
        
        key_checks.append({
            "id": 3,
            "name": "Document Verification",
            "status": check3_status,
            "detail": check3_detail,
            "items": [
                {"label": "Quote (>$5K)", "passed": has_quote, "required": requires_quote},
                {"label": "SOW (Services)", "passed": has_sow, "required": requires_sow},
                {"label": "W9 (New Supplier)", "passed": has_w9, "required": requires_w9}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # KEY CHECK 4: Policy Review - Department spend policies
        # ═══════════════════════════════════════════════════════════════════
        dept_lower = department.lower() if department else ""
        policy_compliant = True
        policy_notes = []
        
        if dept_lower == "it" and amount > 10000:
            policy_notes.append("IT Security Review required (IT >$10K)")
            special_reviews.append("IT Security Review")
            policy_compliant = False
        
        if dept_lower == "marketing" and amount > 25000:
            policy_notes.append("CMO approval required (Marketing >$25K)")
            special_reviews.append("CMO Approval")
            policy_compliant = False
        
        if dept_lower == "legal" and amount > 50000:
            policy_notes.append("General Counsel review required (Legal >$50K)")
            special_reviews.append("General Counsel Review")
            policy_compliant = False
        
        if category in ["Professional Services", "Consulting"] and amount > 25000:
            policy_notes.append("Procurement review for professional services >$25K")
            if "Procurement Review" not in special_reviews:
                special_reviews.append("Procurement Review")
            policy_compliant = False
        
        no_special_reviews = len(special_reviews) == 0
        
        if policy_compliant and no_special_reviews:
            check4_status = "pass"
            check4_detail = f"Aligned with {department} department spend policies"
        elif policy_notes:
            check4_status = "attention"
            check4_detail = f"{policy_notes[0]}"
            checks_attention += 1
        else:
            check4_status = "pass"
            check4_detail = f"Standard policy compliance - no special requirements"
        
        key_checks.append({
            "id": 4,
            "name": "Policy Review",
            "status": check4_status,
            "detail": check4_detail,
            "items": [
                {"label": "Dept Policy Compliant", "passed": policy_compliant},
                {"label": "Category Aligned", "passed": True},
                {"label": "No Special Reviews", "passed": no_special_reviews}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # KEY CHECK 5: Requestor Authority Check
        # ═══════════════════════════════════════════════════════════════════
        within_authority = amount <= requestor_limit
        authority_variance = amount - requestor_limit if amount > requestor_limit else 0
        direct_eligible = within_authority and tier["tier"] == 1
        
        if within_authority:
            check5_status = "pass"
            check5_detail = f"Amount within requestor's authority limit (${requestor_limit:,.0f})"
        elif authority_variance <= requestor_limit * 0.5:
            check5_status = "attention"
            check5_detail = f"Exceeds authority by ${authority_variance:,.0f} - manager approval needed"
            checks_attention += 1
        else:
            check5_status = "attention"
            check5_detail = f"Exceeds authority by ${authority_variance:,.0f} - escalation required"
            checks_attention += 1
        
        key_checks.append({
            "id": 5,
            "name": "Requestor Authority",
            "status": check5_status,
            "detail": check5_detail,
            "items": [
                {"label": f"Within ${requestor_limit:,.0f} Limit", "passed": within_authority},
                {"label": "Direct Approval Eligible", "passed": direct_eligible}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # KEY CHECK 6: Urgency/Priority Check
        # ═══════════════════════════════════════════════════════════════════
        urgency_lower = urgency.lower() if urgency else "standard"
        is_urgent = urgency_lower in ["urgent", "emergency", "critical", "high"]
        is_standard = urgency_lower in ["standard", "normal", "medium", "low"]
        
        if is_standard:
            check6_status = "pass"
            check6_detail = f"Standard priority - normal approval timeline applies"
        elif is_urgent and amount <= 10000:
            check6_status = "attention"
            check6_detail = f"URGENT request - expedited processing recommended"
            checks_attention += 1
        elif is_urgent:
            check6_status = "attention"
            check6_detail = f"URGENT high-value request - requires expedited HITL review"
            flagged = True
            flag_reason = f"Urgent high-value request (${amount:,.0f}) requires expedited human review"
            checks_attention += 1
        else:
            check6_status = "pass"
            check6_detail = f"Priority level: {urgency} - standard processing"
        
        key_checks.append({
            "id": 6,
            "name": "Urgency/Priority",
            "status": check6_status,
            "detail": check6_detail,
            "items": [
                {"label": "Standard Timeline OK", "passed": is_standard},
                {"label": "No Expedite Needed", "passed": not is_urgent}
            ]
        })
        
        # ═══════════════════════════════════════════════════════════════════
        # DETERMINE FINAL VERDICT
        # ═══════════════════════════════════════════════════════════════════
        
        # Build approval chain based on tier
        approval_chain = [{"step": 1, "role": "requestor", "status": "completed", "reason": "Initial request"}]
        if tier["tier"] >= 2:
            approval_chain.append({"step": 2, "role": "manager", "status": "pending", "reason": f"Amount >${1000:,}"})
        if tier["tier"] >= 3:
            approval_chain.append({"step": 3, "role": "director", "status": "pending", "reason": f"Amount >${5000:,}"})
        if tier["tier"] >= 4:
            approval_chain.append({"step": 4, "role": "vp", "status": "pending", "reason": f"Amount >${25000:,}"})
            approval_chain.append({"step": 5, "role": "finance", "status": "pending", "reason": "Finance review"})
        if tier["tier"] >= 5:
            approval_chain.append({"step": 6, "role": "cfo", "status": "pending", "reason": f"Amount >${50000:,}"})
        
        # Summary stats
        checks_passed = sum(1 for c in key_checks if c["status"] == "pass")
        
        # Determine verdict based on checks
        if checks_failed > 0:
            verdict = "HITL_FLAG"
            verdict_reason = f"{checks_failed} check(s) failed - human review required"
            status = "pending_review"
            flagged = True
            failed_names = [c["name"] for c in key_checks if c["status"] == "fail"]
            flag_reason = flag_reason or f"Failed checks: {', '.join(failed_names)}"
        elif checks_attention >= 3 or (checks_attention >= 2 and is_urgent):
            verdict = "HITL_FLAG"
            verdict_reason = f"{checks_attention} item(s) need attention - recommend human review"
            status = "pending_review"
            flagged = True
            flag_reason = flag_reason or "Multiple items require attention"
        elif tier["tier"] <= 3 and checks_attention == 0 and not policy_flags:
            verdict = "AUTO_APPROVE"
            verdict_reason = "All 6 checks passed - auto-approval criteria met"
            status = "approved"
        elif checks_attention > 0:
            verdict = "AUTO_APPROVE"
            verdict_reason = f"Approved with {checks_attention} attention item(s) noted"
            status = "approved"
        else:
            verdict = "AUTO_APPROVE"
            verdict_reason = "All approval criteria satisfied"
            status = "approved"
        
        return {
            "status": status,
            "verdict": verdict,
            "verdict_reason": verdict_reason,
            "key_checks": key_checks,
            "checks_summary": {
                "total": 6,
                "passed": checks_passed,
                "attention": checks_attention,
                "failed": checks_failed
            },
            "approval_chain": approval_chain,
            "tier": tier["tier"],
            "tier_description": tier["description"],
            "policy_flags": policy_flags,
            "special_reviews_required": special_reviews,
            "estimated_time_hours": tier["tier"] * 4,
            "flagged": flagged,
            "flag_reason": flag_reason,
            "confidence": 0.95 if not flagged else 0.75,
        }

    def _build_key_checks_from_requisition(self, requisition: dict[str, Any], verdict: str) -> list[dict[str, Any]]:
        """
        Build the 6 key checks array from requisition data for real LLM calls.
        This ensures consistent structure whether using mock or real LLM.
        """
        # Extract fields with None-safe defaults
        amount = requisition.get("total_amount") or 0
        department = requisition.get("department") or "Operations"
        category = requisition.get("category") or "General"
        urgency = requisition.get("urgency") or "standard"
        supplier_name = requisition.get("supplier_name") or "Vendor"
        supplier_status = requisition.get("supplier_status") or "approved"
        contract_on_file = requisition.get("contract_on_file")
        if contract_on_file is None:
            contract_on_file = True
        requestor_limit = requisition.get("requestor_authority_level") or 5000
        dept_budget = requisition.get("department_budget_limit") or 500000
        
        key_checks = []
        
        # Check 1: Compliance Check
        supplier_verified = supplier_status in ["approved", "preferred", "verified"]
        has_contract = contract_on_file is True
        
        if supplier_verified and has_contract:
            check1_status = "pass"
            check1_detail = f"Verified supplier ({supplier_name}) with contract on file"
        elif supplier_verified:
            check1_status = "attention"
            check1_detail = f"Supplier verified but no contract on file"
        else:
            check1_status = "fail"
            check1_detail = "Supplier not verified or no contract on file"
        
        key_checks.append({
            "id": 1,
            "name": "Compliance Check",
            "status": check1_status,
            "detail": check1_detail,
            "items": [
                {"label": "Supplier Verified", "passed": supplier_verified},
                {"label": "Contract on File", "passed": has_contract}
            ]
        })
        
        # Check 2: Budget Check
        budget_percent = (amount / dept_budget * 100) if dept_budget > 0 else 0
        within_budget = amount <= dept_budget
        low_impact = budget_percent <= 25
        
        if within_budget and low_impact:
            check2_status = "pass"
            check2_detail = f"${amount:,.0f} within department budget ({budget_percent:.1f}%)"
        elif within_budget:
            check2_status = "attention"
            check2_detail = f"${amount:,.0f} uses {budget_percent:.1f}% of budget"
        else:
            check2_status = "fail"
            check2_detail = f"Exceeds department budget"
        
        key_checks.append({
            "id": 2,
            "name": "Budget Check",
            "status": check2_status,
            "detail": check2_detail,
            "items": [
                {"label": "Within Budget Limit", "passed": within_budget},
                {"label": "Budget Impact <25%", "passed": low_impact}
            ]
        })
        
        # Check 3: Document Verification
        requires_quote = amount > 5000
        has_quote = not requires_quote or requisition.get("has_quote", True)
        check3_status = "pass" if has_quote else "fail"
        check3_detail = "Required documents verified" if has_quote else "Missing required documents"
        
        key_checks.append({
            "id": 3,
            "name": "Document Verification",
            "status": check3_status,
            "detail": check3_detail,
            "items": [
                {"label": "Quote (>$5K)", "passed": has_quote, "required": requires_quote}
            ]
        })
        
        # Check 4: Policy Review
        dept_lower = department.lower() if department else ""
        needs_it_review = dept_lower == "it" and amount > 10000
        needs_cmo_review = dept_lower == "marketing" and amount > 25000
        policy_compliant = not needs_it_review and not needs_cmo_review
        
        if policy_compliant:
            check4_status = "pass"
            check4_detail = f"Aligned with {department} department policies"
        else:
            check4_status = "attention"
            if needs_cmo_review:
                check4_detail = "CMO approval required (Marketing >$25K)"
            elif needs_it_review:
                check4_detail = "IT Security Review required (IT >$10K)"
            else:
                check4_detail = "Special review required"
        
        key_checks.append({
            "id": 4,
            "name": "Policy Review",
            "status": check4_status,
            "detail": check4_detail,
            "items": [
                {"label": "Dept Policy Compliant", "passed": policy_compliant},
                {"label": "Category Aligned", "passed": True}
            ]
        })
        
        # Check 5: Requestor Authority
        within_authority = amount <= requestor_limit
        check5_status = "pass" if within_authority else "attention"
        check5_detail = f"Within requestor's ${requestor_limit:,.0f} limit" if within_authority else f"Exceeds requestor authority"
        
        key_checks.append({
            "id": 5,
            "name": "Requestor Authority",
            "status": check5_status,
            "detail": check5_detail,
            "items": [
                {"label": f"Within ${requestor_limit:,.0f} Limit", "passed": within_authority}
            ]
        })
        
        # Check 6: Urgency/Priority
        urgency_lower = urgency.lower() if urgency else "standard"
        is_urgent = urgency_lower in ["urgent", "emergency", "critical"]
        is_standard = urgency_lower in ["standard", "normal", "medium", "low"]
        
        if is_standard:
            check6_status = "pass"
            check6_detail = "Standard priority - normal timeline"
        elif is_urgent and amount > 10000:
            check6_status = "attention"
            check6_detail = "URGENT high-value request - expedited review required"
        else:
            check6_status = "attention"
            check6_detail = f"Priority: {urgency} - expedited processing"
        
        key_checks.append({
            "id": 6,
            "name": "Urgency/Priority",
            "status": check6_status,
            "detail": check6_detail,
            "items": [
                {"label": "Standard Timeline OK", "passed": is_standard},
                {"label": "No Expedite Needed", "passed": not is_urgent}
            ]
        })
        
        return key_checks

    # ==================== Flagging Methods ====================

    def should_flag_for_review(
        self,
        approval_result: dict[str, Any],
        document: dict[str, Any],
        approvers_available: bool = True,
    ) -> tuple[bool, str, str]:
        """
        Determine if approval should be flagged for human review.

        Args:
            approval_result: Result from determine_approval_chain
            document: Document being approved
            approvers_available: Whether designated approvers are available

        Returns:
            Tuple of (should_flag, reason, severity)
        """
        # Approver unavailable
        if not approvers_available or approval_result.get("approver_unavailable"):
            return (
                True,
                "Designated approver is unavailable or out of office",
                "medium",
            )
        
        # Exceeds approval limits
        amount = document.get("total_amount", 0)
        if approval_result.get("exceeds_approval_limit"):
            return (
                True,
                f"Amount ${amount:,.2f} exceeds available approvers' authorization limits",
                "high",
            )
        
        # Policy flags require review
        policy_flags = approval_result.get("policy_flags", [])
        if policy_flags:
            return (
                True,
                f"Policy concerns: {', '.join(policy_flags[:3])}",
                "medium",
            )
        
        # Special reviews required
        special_reviews = approval_result.get("special_reviews_required", [])
        if special_reviews:
            return (
                True,
                f"Additional reviews required: {', '.join(special_reviews)}",
                "medium",
            )
        
        # Emergency request
        urgency = document.get("urgency", "standard")
        if urgency in ["urgent", "emergency"]:
            return (
                True,
                f"Emergency/urgent request requires expedited review",
                "high" if urgency == "emergency" else "medium",
            )
        
        return (False, "", "")
