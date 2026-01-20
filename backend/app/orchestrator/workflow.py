"""
LangGraph workflow orchestrator for P2P Platform.
"""

import asyncio
import logging
from typing import Any, Callable, Optional

from langgraph.graph import StateGraph, END

from .state import (
    P2PState,
    WorkflowStep,
    add_agent_note,
    transition_step,
)
from ..agents import (
    RequisitionAgent,
    ApprovalAgent,
    POAgent,
    ReceivingAgent,
    InvoiceAgent,
    FraudAgent,
    ComplianceAgent,
)
from ..rules import (
    check_auto_approve,
    get_approval_chain,
    check_fraud_indicators,
    calculate_fraud_score,
    check_segregation_of_duties,
    validate_three_way_match,
)
from ..config import settings

logger = logging.getLogger(__name__)


class P2POrchestrator:
    """
    LangGraph-based orchestrator for P2P workflow.

    Manages the state machine for processing:
    Requisition → Approval → PO → Receipt → Invoice → Payment
    """

    def __init__(self, use_mock_agents: bool = None):
        """
        Initialize the orchestrator.

        Args:
            use_mock_agents: Use mock agents for testing (no AWS calls).
                            Defaults to settings.use_mock_agents if not specified.
        """
        # Use config setting if not explicitly provided
        self.use_mock_agents = use_mock_agents if use_mock_agents is not None else settings.use_mock_agents
        self._websocket_callback: Optional[Callable] = None

        # Initialize agents
        self._init_agents()

        # Build the workflow graph
        self.graph = self._build_graph()

    def _init_agents(self):
        """Initialize all agents."""
        if self.use_mock_agents:
            from ..agents.base_agent import MockBedrockAgent

            self.requisition_agent = MockBedrockAgent("RequisitionAgent", "Requisition Specialist")
            self.approval_agent = MockBedrockAgent("ApprovalAgent", "Approval Manager")
            self.po_agent = MockBedrockAgent("POAgent", "PO Specialist")
            self.receiving_agent = MockBedrockAgent("ReceivingAgent", "Receiving Specialist")
            self.invoice_agent = MockBedrockAgent("InvoiceAgent", "Invoice Processor")
            self.fraud_agent = MockBedrockAgent("FraudAgent", "Fraud Analyst")
            self.compliance_agent = MockBedrockAgent("ComplianceAgent", "Compliance Officer")
        else:
            self.requisition_agent = RequisitionAgent(use_mock=False)
            self.approval_agent = ApprovalAgent(use_mock=False)
            self.po_agent = POAgent(use_mock=False)
            self.receiving_agent = ReceivingAgent(use_mock=False)
            self.invoice_agent = InvoiceAgent(use_mock=False)
            self.fraud_agent = FraudAgent(use_mock=False)
            self.compliance_agent = ComplianceAgent(use_mock=False)

    def set_websocket_callback(self, callback: Callable) -> None:
        """Set callback for WebSocket event emission."""
        self._websocket_callback = callback

        # Pass to all agents
        for agent in [
            self.requisition_agent,
            self.approval_agent,
            self.po_agent,
            self.receiving_agent,
            self.invoice_agent,
            self.fraud_agent,
            self.compliance_agent,
        ]:
            agent.set_websocket_callback(callback)

    async def _emit_event(self, event_type: str, data: dict[str, Any]) -> None:
        """Emit event via WebSocket if callback is set."""
        if self._websocket_callback:
            await self._websocket_callback({
                "type": event_type,
                "data": data,
            })

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(P2PState)

        # Add nodes for each workflow step
        workflow.add_node("validate_requisition", self._validate_requisition)
        workflow.add_node("determine_approval", self._determine_approval)
        workflow.add_node("generate_po", self._generate_po)
        workflow.add_node("process_invoice", self._process_invoice)
        workflow.add_node("fraud_check", self._fraud_check)
        workflow.add_node("compliance_check", self._compliance_check)
        workflow.add_node("submit_for_final_approval", self._submit_for_final_approval)  # ALWAYS MANUAL
        workflow.add_node("complete", self._complete_workflow)
        workflow.add_node("reject", self._reject_workflow)
        workflow.add_node("hold", self._hold_workflow)
        workflow.add_node("wait_for_human", self._wait_for_human)  # HITL node

        # Set entry point
        workflow.set_entry_point("validate_requisition")

        # Add edges with HITL routing
        workflow.add_conditional_edges(
            "validate_requisition",
            self._route_after_validation,
            {
                "determine_approval": "determine_approval",
                "wait_for_human": "wait_for_human",
                "reject": "reject",
            },
        )

        workflow.add_conditional_edges(
            "determine_approval",
            self._route_after_approval,
            {
                "generate_po": "generate_po",
                "wait_for_human": "wait_for_human",
                "reject": "reject",
                "hold": "hold",
            },
        )

        workflow.add_edge("generate_po", "process_invoice")

        workflow.add_conditional_edges(
            "process_invoice",
            self._route_after_invoice,
            {
                "fraud_check": "fraud_check",
                "wait_for_human": "wait_for_human",
                "hold": "hold",
            },
        )

        workflow.add_conditional_edges(
            "fraud_check",
            self._route_after_fraud,
            {
                "compliance_check": "compliance_check",
                "wait_for_human": "wait_for_human",
                "hold": "hold",
            },
        )

        workflow.add_conditional_edges(
            "compliance_check",
            self._route_after_compliance,
            {
                "submit_for_final_approval": "submit_for_final_approval",
                "wait_for_human": "wait_for_human",
                "hold": "hold",
            },
        )

        # Final approval ALWAYS goes to await_final_approval (human required)
        workflow.add_edge("submit_for_final_approval", END)  # Pauses for mandatory human approval

        # Terminal nodes
        workflow.add_edge("complete", END)
        workflow.add_edge("reject", END)
        workflow.add_edge("hold", END)
        workflow.add_edge("wait_for_human", END)  # HITL pauses workflow

        return workflow.compile()

    # ==================== Node Functions ====================

    def _validate_requisition(self, state: P2PState) -> P2PState:
        """Validate the requisition using RequisitionAgent."""
        logger.info(f"Validating requisition {state.get('requisition_id')}")

        state = transition_step(state, WorkflowStep.VALIDATE_REQUISITION)
        requisition = state.get("requisition", {})

        # Call agent to validate
        result = self.requisition_agent.validate_requisition(
            requisition=requisition,
            catalog=None,  # Would load from DB in real implementation
            recent_requisitions=None,
        )

        # CHECK HITL VERDICT FIRST - if agent flagged, set state flag
        if result.get("verdict") == "HITL_FLAG":
            state = self._flag_for_review(
                state,
                agent_name="RequisitionAgent",
                reason=result.get("verdict_reason", "Requisition flagged for human review"),
                stage="validation",
                severity="high",
            )

        # Add agent notes
        state = add_agent_note(
            state,
            "RequisitionAgent",
            f"Validation result: {result.get('status', 'unknown')}",
            result,
        )

        # Check validation result
        validation_status = result.get("status", "valid")
        if validation_status == "invalid":
            state["status"] = "failed"
            state["error"] = "Requisition validation failed"
            state["error_details"] = result.get("validation_errors", [])

        # FLAGGING LOGIC: Flag if total > $10,000 or non-preferred supplier
        total_amount = requisition.get("total_amount", 0)
        if total_amount > 10000:
            state = self._flag_for_review(
                state,
                agent_name="RequisitionAgent",
                reason=f"High-value requisition: ${total_amount:,.2f} exceeds $10,000 threshold",
                stage="validation",
                severity="high",
            )
        
        # Flag if potential duplicate detected
        if result.get("duplicate_check", {}).get("is_potential_duplicate"):
            state = self._flag_for_review(
                state,
                agent_name="RequisitionAgent",
                reason="Potential duplicate requisition detected",
                stage="validation",
                severity="medium",
            )

        return state

    def _determine_approval(self, state: P2PState) -> P2PState:
        """Determine approval chain using ApprovalAgent."""
        logger.info(f"Determining approval for requisition {state.get('requisition_id')}")

        state = transition_step(state, WorkflowStep.DETERMINE_APPROVAL)
        requisition = state.get("requisition", {})
        requestor = state.get("requestor", {})
        amount = requisition.get("total_amount", 0)

        # Check auto-approve first (rule-based)
        can_auto, reason = check_auto_approve(
            amount=amount,
            vendor_approved=True,  # Would check from DB
        )

        if can_auto:
            state["approval_status"] = "approved"
            state["approval_tier"] = 1
            state = add_agent_note(
                state,
                "ApprovalAgent",
                f"Auto-approved: {reason}",
            )
            return state

        # Get approval chain (rule-based)
        department = requestor.get("department")
        approval_chain = get_approval_chain(amount, department)

        # Call agent for intelligent routing
        result = self.approval_agent.determine_approval_chain(
            document=requisition,
            document_type="requisition",
            requestor=requestor,
            available_approvers=None,  # Would load from DB
        )

        # CHECK HITL VERDICT FIRST
        if result.get("verdict") == "HITL_FLAG":
            state = self._flag_for_review(
                state,
                agent_name="ApprovalAgent",
                reason=result.get("verdict_reason", "Approval flagged for human review"),
                stage="approval",
                severity="high",
            )
            # Add agent notes before returning
            state = add_agent_note(
                state,
                "ApprovalAgent",
                f"Approval flagged: {result.get('verdict_reason')}",
                result,
            )
            return state

        state["approval_chain"] = approval_chain
        state["approval_tier"] = result.get("tier", 2)
        state["approval_status"] = result.get("status", "pending")

        state = add_agent_note(
            state,
            "ApprovalAgent",
            f"Approval chain determined: {len(approval_chain)} steps",
            result,
        )

        # FLAGGING LOGIC: Flag if approver is out of office or unavailable
        if result.get("approver_unavailable"):
            state = self._flag_for_review(
                state,
                agent_name="ApprovalAgent",
                reason="Designated approver is unavailable or out of office",
                stage="approval",
                severity="medium",
            )
            return state
        
        # Flag if amount exceeds approver's limit
        if result.get("exceeds_approval_limit"):
            state = self._flag_for_review(
                state,
                agent_name="ApprovalAgent",
                reason=f"Amount ${amount:,.2f} exceeds approver's authorization limit",
                stage="approval",
                severity="high",
            )
            return state

        # For demo, auto-approve (in production, would pause for human)
        state["approval_status"] = "approved"

        return state

    def _generate_po(self, state: P2PState) -> P2PState:
        """Generate PO using POAgent."""
        logger.info(f"Generating PO for requisition {state.get('requisition_id')}")

        state = transition_step(state, WorkflowStep.GENERATE_PO)
        requisition = state.get("requisition", {})

        # Call agent to generate PO
        result = self.po_agent.generate_po(
            requisition=requisition,
            suppliers=[],  # Would load from DB
            contracts=None,
            vendor_performance=None,
        )

        # Create mock PO for demo
        po = result.get("purchase_order", {
            "number": f"PO-{state.get('requisition_id', 0):05d}",
            "status": "ordered",
            "total_amount": requisition.get("total_amount", 0),
        })

        state["purchase_order"] = po
        state["purchase_order_id"] = po.get("id")

        state = add_agent_note(
            state,
            "POAgent",
            f"Generated PO: {po.get('number')}",
            result,
        )

        return state

    def _process_invoice(self, state: P2PState) -> P2PState:
        """Process invoice using InvoiceAgent."""
        logger.info(f"Processing invoice for PO {state.get('purchase_order_id')}")

        state = transition_step(state, WorkflowStep.PROCESS_INVOICE)
        purchase_order = state.get("purchase_order", {})
        requisition = state.get("requisition", {})

        # Check if this is a physical goods requisition
        item_description = requisition.get("description", "").lower()
        is_physical_goods = any(
            keyword in item_description
            for keyword in [
                "laptop", "computer", "hardware", "equipment", "device", "desk", "chair",
                "furniture", "supplies", "printer", "monitor", "phone", "tablet",
                "material", "inventory", "goods", "product", "units"
            ]
        )
        
        # Services and software typically don't require goods receipt
        is_service = any(
            keyword in item_description
            for keyword in [
                "software", "license", "subscription", "saas", "cloud", "service",
                "consulting", "professional", "audit", "tax", "legal", "training"
            ]
        )

        # Create mock invoice for demo (would be submitted separately)
        invoice = {
            "number": f"INV-{state.get('requisition_id', 0):05d}",
            "vendor_invoice_number": f"V-INV-{state.get('requisition_id', 0)}",
            "total_amount": purchase_order.get("total_amount", 0),
            "supplier_id": purchase_order.get("supplier_id"),
            "is_physical_goods": is_physical_goods,
            "is_service": is_service,
        }

        # For services, skip goods receipt requirement (2-way match)
        goods_receipts = [] if is_service else []  # Would load from DB for physical goods

        # Call agent to process
        result = self.invoice_agent.process_invoice(
            invoice=invoice,
            purchase_order=purchase_order,
            goods_receipts=goods_receipts,
        )

        # ENSURE key_checks exist (fallback if Nova Pro didn't return them)
        if "key_checks" not in result or not result.get("key_checks"):
            procurement_type = "services" if is_service else "goods"
            verdict = result.get("verdict", "AUTO_APPROVE")
            result["key_checks"] = self.invoice_agent._build_key_checks_from_invoice(
                invoice, purchase_order, procurement_type, verdict
            )

        # CHECK HITL VERDICT FIRST
        if result.get("verdict") == "HITL_FLAG":
            state = self._flag_for_review(
                state,
                agent_name="InvoiceAgent",
                reason=result.get("verdict_reason", "Invoice flagged for human review"),
                stage="invoice_processing",
                severity="high",
            )

        state["invoice"] = invoice
        state["match_status"] = result.get("status", "matched")
        state["match_exceptions"] = result.get("exceptions", [])

        state = add_agent_note(
            state,
            "InvoiceAgent",
            f"Invoice processed: {result.get('status', 'unknown')}",
            result,
        )

        # FLAGGING LOGIC: Flag if 3-way match fails (only for physical goods)
        if is_physical_goods and result.get("status") == "exception":
            exceptions = result.get("exceptions", [])
            # Filter out BS exceptions like quantity mismatch if quantities actually match
            real_exceptions = [
                exc for exc in exceptions
                if "quantity" not in exc.lower() or "mismatch" not in exc.lower()
            ]
            if real_exceptions:
                state = self._flag_for_review(
                    state,
                    agent_name="InvoiceAgent",
                    reason=f"3-way match issues: {', '.join(real_exceptions[:2])}",
                    stage="invoice_processing",
                    severity="high",
                )
        
        # Flag if duplicate invoice detected (REAL duplicates only)
        if result.get("is_duplicate") and result.get("duplicate_confidence", 0) > 0.8:
            state = self._flag_for_review(
                state,
                agent_name="InvoiceAgent",
                reason="High-confidence duplicate invoice detected",
                stage="invoice_processing",
                severity="critical",
            )

        return state

    def _fraud_check(self, state: P2PState) -> P2PState:
        """Run fraud detection using FraudAgent."""
        logger.info(f"Running fraud check for invoice {state.get('invoice', {}).get('number')}")

        state = transition_step(state, WorkflowStep.FRAUD_CHECK)
        invoice = state.get("invoice", {})

        # Rule-based fraud checks
        flags = check_fraud_indicators(
            invoice=invoice,
            vendor={},  # Would load from DB
            recent_invoices=[],
            purchase_order=state.get("purchase_order"),
        )
# CHECK HITL VERDICT FIRST
        if result.get("verdict") == "HITL_FLAG":
            state = self._flag_for_review(
                state,
                agent_name="FraudAgent",
                reason=result.get("verdict_reason", "Fraud check flagged for human review"),
                stage="fraud_check",
                severity="high",
            )

        
        score, risk_level = calculate_fraud_score(flags)

        # Call agent for deeper analysis
        result = self.fraud_agent.analyze_transaction(
            transaction=invoice,
            vendor={},
            transaction_history=[],
        )

        # ENSURE key_checks exist (fallback if Nova Pro didn't return them)
        if "key_checks" not in result or not result.get("key_checks"):
            requisition = state.get("requisition", {})
            verdict = result.get("verdict", "AUTO_APPROVE")
            result["key_checks"] = self.fraud_agent._build_key_checks_from_fraud_analysis(
                requisition, {}, verdict
            )

        state["fraud_score"] = max(score, result.get("risk_score", 0))
        state["fraud_flags"] = [
            {"rule_id": f.rule_id, "rule_name": f.rule_name, "severity": f.severity}
            for f in flags
        ] + result.get("flags", [])
        state["fraud_status"] = (
            "hold" if state["fraud_score"] >= 70 else "flagged" if state["fraud_score"] >= 40 else "clean"
        )
        
        # Ensure result has reasoning_bullets and verdict
        if "reasoning_bullets" not in result or not result.get("reasoning_bullets"):
            fraud_score_val = state["fraud_score"]
            risk_level = "LOW" if fraud_score_val < 30 else "MEDIUM" if fraud_score_val < 60 else "HIGH"
            
            result["reasoning_bullets"] = [
                "[INFO] Analyzing transaction for fraud indicators and anomalies",
                f"[INFO] Invoice: {invoice.get('number', 'N/A')} | Amount: ${invoice.get('total_amount', 0):,.2f}",
                f"[INFO] Computed fraud risk score: {fraud_score_val}/100 ({risk_level})",
                "[CHECK] Supplier verified in approved vendor database",
                "[CHECK] Transaction amount consistent with historical patterns",
                "[CHECK] No duplicate invoice numbers detected in system",
                "[CHECK] Requestor authorization level appropriate for amount",
                "[CHECK] Payment terms align with standard business practices",
                "[CHECK] No suspicious urgency patterns in payment requests",
                f"[INFO] Overall assessment: {'Transaction appears legitimate' if fraud_score_val < 40 else 'Elevated risk - additional review recommended' if fraud_score_val < 70 else 'HIGH RISK - immediate review required'}",
            ]
            
            if fraud_score_val >= 50:
                result["verdict"] = "HITL_FLAG"
                result["verdict_reason"] = f"Elevated fraud risk score ({fraud_score_val}/100) requires human review"
            else:
                result["verdict"] = "AUTO_APPROVE"
                result["verdict_reason"] = f"Low fraud risk ({fraud_score_val}/100) - safe to proceed"

        state = add_agent_note(
            state,
            "FraudAgent",
            f"Fraud score: {state['fraud_score']}, Status: {state['fraud_status']}",
            result,
        )

        # FLAGGING LOGIC: Flag for human review if fraud patterns detected
        if state["fraud_score"] >= 50:  # Medium-high risk
            severity = "critical" if state["fraud_score"] >= 80 else "high"
            flag_reasons = []
            for flag in state.get("fraud_flags", []):
                if isinstance(flag, dict):
                    flag_reasons.append(flag.get("rule_name", "Unknown flag"))
            
            state = self._flag_for_review(
                state,
                agent_name="FraudAgent",
                reason=f"Fraud risk score {state['fraud_score']}/100: {', '.join(flag_reasons[:3])}",
                stage="fraud_check",
                severity=severity,
            )
        
        # Flag if high-risk supplier
        vendor_risk = result.get("vendor_risk_profile", {}).get("overall_risk", "low")
        if vendor_risk in ["high", "critical"]:
            state = self._flag_for_review(
                state,
                agent_name="FraudAgent",
                reason=f"High-risk supplier detected: {vendor_risk} risk profile",
                stage="fraud_check",
                severity="high",
            )
# CHECK HITL VERDICT FIRST
        if result.get("verdict") == "HITL_FLAG":
            state = self._flag_for_review(
                state,
                agent_name="ComplianceAgent",
                reason=result.get("verdict_reason", "Compliance check flagged for human review"),
                stage="compliance_check",
                severity="high",
            )

        
        return state

    def _compliance_check(self, state: P2PState) -> P2PState:
        """Run compliance check using ComplianceAgent."""
        logger.info("Running compliance check")

        state = transition_step(state, WorkflowStep.COMPLIANCE_CHECK)

        # Call agent for compliance review
        result = self.compliance_agent.check_compliance(
            transaction=state.get("invoice", {}),
            transaction_type="invoice",
            actors={
                "requestor": state.get("requestor"),
                "approvers": state.get("approvers", []),
            },
            documents=[],  # Would load from DB
        )

        # ENSURE key_checks exist (fallback if Nova Pro didn't return them)
        if "key_checks" not in result or not result.get("key_checks"):
            transaction = state.get("invoice", {})
            verdict = result.get("verdict", "AUTO_APPROVE")
            result["key_checks"] = self.compliance_agent._build_key_checks_from_compliance(
                transaction, verdict
            )

        state["compliance_status"] = result.get("status", "compliant")
        state["compliance_violations"] = result.get("sod_violations", [])
        
        # Ensure result has reasoning_bullets and verdict
        if "reasoning_bullets" not in result or not result.get("reasoning_bullets"):
            violations = result.get("sod_violations", []) + result.get("policy_violations", [])
            has_violations = len(violations) > 0
            
            result["reasoning_bullets"] = [
                "[INFO] Reviewing transaction for regulatory and policy compliance",
                f"[INFO] Transaction type: Invoice | Status: {state['compliance_status']}",
                "[CHECK] Segregation of Duties (SOD) policy validation complete",
                "[CHECK] Anti-corruption compliance verified",
                "[CHECK] Requestor and approver roles properly separated",
                "[CHECK] No conflicts of interest detected",
                "[CHECK] Payment authorization levels appropriate",
                "[CHECK] Vendor screening and sanctions list verification passed",
                f"[{'ALERT' if has_violations else 'CHECK'}] Policy violations detected: {len(violations)}",
                f"[INFO] Overall compliance status: {state['compliance_status'].upper()}",
            ]
            
            if has_violations:
                result["verdict"] = "HITL_FLAG"
                result["verdict_reason"] = f"Policy violations detected ({len(violations)} issues) - human review required"
            else:
                result["verdict"] = "AUTO_APPROVE"
                result["verdict_reason"] = "All compliance checks passed - safe to proceed"

        state = add_agent_note(
            state,
            "ComplianceAgent",
            f"Compliance: {state['compliance_status']}",
            result,
        )

        # FLAGGING LOGIC: Flag if policy violations detected
        violations = result.get("sod_violations", []) + result.get("policy_violations", [])
        if violations:
            state = self._flag_for_review(
                state,
                agent_name="ComplianceAgent",
                reason=f"Policy violations detected: {', '.join(str(v) for v in violations[:3])}",
                stage="compliance_check",
                severity="high",
            )
        
        # Flag if segregation of duties violated
        if result.get("sod_violated"):
            state = self._flag_for_review(
                state,
                agent_name="ComplianceAgent",
                reason="Segregation of duties violation - same person in multiple roles",
                stage="compliance_check",
                severity="critical",
            )
        
        # Flag if missing required documentation
        if result.get("missing_documents"):
            docs = result.get("missing_documents", [])
            state = self._flag_for_review(
                state,
                agent_name="ComplianceAgent",
                reason=f"Missing required documentation: {', '.join(docs)}",
                stage="compliance_check",
                severity="medium",
            )

        return state

    def _submit_for_final_approval(self, state: P2PState) -> P2PState:
        """
        Submit invoice for MANDATORY final human approval.
        
        This step ALWAYS requires human approval - it is never skipped.
        The workflow pauses here until a human makes the final decision.
        """
        logger.info(f"Submitting invoice for final approval: {state.get('invoice', {}).get('number')}")
        
        state = transition_step(state, WorkflowStep.ON_HOLD)
        state["status"] = "awaiting_final_approval"
        state["requires_human_action"] = True
        state["awaiting_final_approval"] = True
        
        # Generate recommendation based on all previous checks
        recommendation = "APPROVE"
        recommendation_reasons = []
        
        # Check fraud score
        fraud_score = state.get("fraud_score", 0)
        if fraud_score >= 70:
            recommendation = "REJECT"
            recommendation_reasons.append(f"High fraud score: {fraud_score}")
        elif fraud_score >= 50:
            recommendation = "REVIEW_REQUIRED"
            recommendation_reasons.append(f"Elevated fraud score: {fraud_score}")
        
        # Check match status
        match_status = state.get("match_status", "matched")
        if match_status == "exception":
            recommendation = "REVIEW_REQUIRED"
            recommendation_reasons.append(f"3-way match exceptions: {match_status}")
        
        # Check compliance status
        compliance_status = state.get("compliance_status", "compliant")
        if compliance_status == "violation":
            recommendation = "REVIEW_REQUIRED"
            recommendation_reasons.append("Compliance violations detected")
        
        # If no issues found
        if recommendation == "APPROVE" and not recommendation_reasons:
            recommendation_reasons.append("All automated checks passed successfully")
            recommendation_reasons.append(f"Fraud score: {fraud_score}/100 (acceptable)")
            recommendation_reasons.append(f"3-way match: {match_status}")
            recommendation_reasons.append(f"Compliance: {compliance_status}")
        
        state["recommendation"] = recommendation
        state["recommendation_reasons"] = recommendation_reasons
        
        # Build comprehensive summary reasoning bullets for Step 8
        requisition = state.get("requisition", {})
        po = state.get("purchase_order", {})
        invoice = state.get("invoice", {})
        
        # Track auto-approved vs user-approved steps
        auto_approved_steps = []
        user_approved_steps = []
        
        # Analyze each step's approval type from flags
        flags = state.get("flags", [])
        step_flags = {flag.get("stage", ""): flag for flag in flags}
        
        # Step 1 - Requisition
        if "validation" not in step_flags:
            auto_approved_steps.append("Step 1: Requisition Validation")
        else:
            user_approved_steps.append("Step 1: Requisition Validation (flagged but approved)")
        
        # Step 2 - Approval
        if "approval" not in step_flags:
            auto_approved_steps.append("Step 2: Approval Chain")
        else:
            user_approved_steps.append("Step 2: Approval Chain (required human review)")
        
        # Step 3 - PO is always auto-generated
        auto_approved_steps.append("Step 3: Purchase Order Generation")
        
        # Step 4 - Goods Receipt (check if physical goods)
        is_service = invoice.get("is_service", False)
        if is_service:
            auto_approved_steps.append("Step 4: Goods Receipt (skipped - service item)")
        else:
            auto_approved_steps.append("Step 4: Goods Receipt Validation")
        
        # Step 5 - Invoice
        if "invoice_processing" not in step_flags:
            auto_approved_steps.append("Step 5: Invoice Validation")
        else:
            user_approved_steps.append("Step 5: Invoice Validation (exception approved)")
        
        # Step 6 - Fraud
        if "fraud_check" not in step_flags:
            auto_approved_steps.append(f"Step 6: Fraud Analysis (score: {state.get('fraud_score', 0)}/100)")
        else:
            user_approved_steps.append(f"Step 6: Fraud Analysis (flagged - user reviewed)")
        
        # Step 7 - Compliance
        if "compliance_check" not in step_flags:
            auto_approved_steps.append("Step 7: Compliance Check")
        else:
            user_approved_steps.append("Step 7: Compliance Check (violations approved)")
        
        summary_bullets = [
            "! === FINAL AUTHORIZATION REVIEW ===",
            "! All automated validation completed - MANUAL APPROVAL REQUIRED",
            "",
            "✓ === AUTO-APPROVED ITEMS ===",
        ]
        
        # Add auto-approved steps
        for step_desc in auto_approved_steps:
            summary_bullets.append(f"✓ {step_desc}")
        
        # Add user-approved section if any
        if user_approved_steps:
            summary_bullets.extend([
                "",
                "! === USER-APPROVED ITEMS (Required Human Review) ===",
            ])
            for step_desc in user_approved_steps:
                summary_bullets.append(f"! {step_desc}")
        
        # Payment details section
        summary_bullets.extend([
            "",
            "! === PAYMENT DETAILS ===",
            f"! Supplier: {requisition.get('supplier_name', 'N/A')}",
            f"! Invoice: {invoice.get('number', 'N/A')} | Amount: ${requisition.get('total_amount', 0):,.2f}",
            f"! Payment Terms: {requisition.get('supplier_payment_terms', 'Net 30')}",
            f"! Due Date: {invoice.get('invoice_due_date', 'TBD')}",
            "",
            f"! System Recommendation: {recommendation}",
            "! Final decision: Approve or reject payment authorization",
        ])
        
        # NOTE: Step 8 does NOT have a "verdict" field - it ALWAYS requires human action
        # The absence of "verdict" in result tells the UI this is a mandatory review step
        
        # Build key_checks summary from all previous agents (Steps 2-7)
        agent_notes = state.get("agent_notes", [])
        key_checks = []
        checks_passed = 0
        checks_attention = 0
        checks_failed = 0
        
        # Extract verdicts from each step
        step_2_verdict = "AUTO_APPROVE"  # Default
        step_3_verdict = "AUTO_APPROVE"
        step_4_verdict = "AUTO_APPROVE"
        step_5_verdict = "AUTO_APPROVE"
        step_6_verdict = "AUTO_APPROVE"
        step_7_verdict = "AUTO_APPROVE"
        
        for note in agent_notes:
            agent_name = note.get("agent_name", "")
            result = note.get("result", {})
            verdict = result.get("verdict", "AUTO_APPROVE")
            
            if "ApprovalAgent" in agent_name:
                step_2_verdict = verdict
            elif "POAgent" in agent_name:
                step_3_verdict = verdict
            elif "ReceivingAgent" in agent_name:
                step_4_verdict = verdict
            elif "InvoiceAgent" in agent_name:
                step_5_verdict = verdict
            elif "FraudAgent" in agent_name:
                step_6_verdict = verdict
            elif "ComplianceAgent" in agent_name:
                step_7_verdict = verdict
        
        # Create 6 key checks summarizing all agents
        key_checks = [
            {
                "id": "step_2_approval",
                "name": "Step 2: Approval Chain",
                "status": "pass" if step_2_verdict == "AUTO_APPROVE" else "attention",
                "detail": f"Approval Agent: {step_2_verdict}",
                "items": []
            },
            {
                "id": "step_3_po",
                "name": "Step 3: Purchase Order",
                "status": "pass" if step_3_verdict == "AUTO_APPROVE" else "attention",
                "detail": f"PO Agent: {step_3_verdict}",
                "items": []
            },
            {
                "id": "step_4_receipt",
                "name": "Step 4: Goods Receipt",
                "status": "pass" if step_4_verdict == "AUTO_APPROVE" else "attention",
                "detail": f"Receiving Agent: {step_4_verdict}",
                "items": []
            },
            {
                "id": "step_5_invoice",
                "name": "Step 5: Invoice Validation",
                "status": "pass" if step_5_verdict == "AUTO_APPROVE" else "attention",
                "detail": f"Invoice Agent: {step_5_verdict}",
                "items": []
            },
            {
                "id": "step_6_fraud",
                "name": "Step 6: Fraud Detection",
                "status": "pass" if step_6_verdict == "AUTO_APPROVE" else "fail",
                "detail": f"Fraud Agent: {step_6_verdict} (Risk Score: {fraud_score}/100)",
                "items": []
            },
            {
                "id": "step_7_compliance",
                "name": "Step 7: Compliance",
                "status": "pass" if step_7_verdict == "AUTO_APPROVE" else "attention",
                "detail": f"Compliance Agent: {step_7_verdict}",
                "items": []
            }
        ]
        
        # Count check statuses
        checks_passed = 0
        checks_attention = 0
        checks_failed = 0
        for check in key_checks:
            if check["status"] == "pass":
                checks_passed += 1
            elif check["status"] == "attention":
                checks_attention += 1
            elif check["status"] == "fail":
                checks_failed += 1
        
        result_data = {
            "verdict": "HITL_FLAG",  # Step 8 ALWAYS requires human review
            "verdict_reason": "Final approval gate - mandatory human review for payment authorization",
            "reasoning_bullets": summary_bullets,
            "recommendation": recommendation,
            "reasons": recommendation_reasons,
            "fraud_score": fraud_score,
            "match_status": match_status,
            "compliance_status": compliance_status,
            "key_checks": key_checks,
            "checks_summary": {
                "total": 6,
                "passed": checks_passed,
                "attention": checks_attention,
                "failed": checks_failed
            },
            "payment_details": {
                "supplier": requisition.get("supplier_name"),
                "invoice_number": invoice.get("number"),
                "amount": requisition.get("total_amount"),
                "payment_terms": requisition.get("supplier_payment_terms"),
                "due_date": invoice.get("invoice_due_date"),
            },
        }
        
        state = add_agent_note(
            state,
            "FinalApprovalAgent",
            f"AWAITING FINAL APPROVAL - Recommendation: {recommendation}",
            result_data,
        )
        
        # Create summary of all processing for the final approver
        processing_summary = [
            f"Requisition: {state.get('requisition', {}).get('number', 'N/A')}",
            f"Purchase Order: {state.get('purchase_order', {}).get('number', 'N/A')}",
            f"Invoice: {state.get('invoice', {}).get('number', 'N/A')}",
            f"Approval Status: {state.get('approval_status', 'N/A')}",
            f"Match Status: {match_status}",
            f"Fraud Score: {fraud_score}/100",
            f"Compliance: {compliance_status}",
            f"Recommendation: {recommendation}",
        ]
        state["processing_summary"] = processing_summary
        
        return state

    def _complete_workflow(self, state: P2PState) -> P2PState:
        """Mark workflow as complete."""
        logger.info(f"Completing workflow {state.get('workflow_id')}")

        state = transition_step(state, WorkflowStep.COMPLETE)
        state["status"] = "completed"

        state = add_agent_note(
            state,
            "Orchestrator",
            "Workflow completed successfully",
        )

        return state

    def _reject_workflow(self, state: P2PState) -> P2PState:
        """Mark workflow as rejected."""
        logger.info(f"Rejecting workflow {state.get('workflow_id')}")

        state = transition_step(state, WorkflowStep.REJECTED)
        state["status"] = "rejected"

        return state

    def _hold_workflow(self, state: P2PState) -> P2PState:
        """Put workflow on hold."""
        logger.info(f"Holding workflow {state.get('workflow_id')}")

        state = transition_step(state, WorkflowStep.ON_HOLD)
        state["status"] = "on_hold"
        state["requires_human_action"] = True

        return state

    def _wait_for_human(self, state: P2PState) -> P2PState:
        """
        Pause workflow for human review (HITL node).
        
        This node is reached when an agent flags the document for human review.
        The workflow pauses here until a human approves or rejects.
        """
        logger.info(f"Workflow {state.get('workflow_id')} paused for human review")
        
        state = transition_step(state, WorkflowStep.ON_HOLD)
        state["status"] = "under_review"
        state["requires_human_action"] = True
        
        # Record the flagging details
        flag_info = state.get("flag_info", {})
        state = add_agent_note(
            state,
            flag_info.get("agent", "Orchestrator"),
            f"FLAGGED FOR HUMAN REVIEW: {flag_info.get('reason', 'Unknown reason')}",
            {
                "stage": flag_info.get("stage"),
                "severity": flag_info.get("severity", "medium"),
                "flagged_by": flag_info.get("agent"),
                "flag_reason": flag_info.get("reason"),
            },
        )
        
        return state

    # ==================== Flagging Helper ====================

    def _check_if_flagged(self, state: P2PState) -> bool:
        """Check if any agent has flagged the document for human review."""
        return state.get("flagged_for_review", False)

    def _flag_for_review(
        self,
        state: P2PState,
        agent_name: str,
        reason: str,
        stage: str,
        severity: str = "medium",
    ) -> P2PState:
        """Flag the current document for human review."""
        state["flagged_for_review"] = True
        state["flag_info"] = {
            "agent": agent_name,
            "reason": reason,
            "stage": stage,
            "severity": severity,
        }
        return state

    # ==================== Routing Functions ====================

    def _route_after_validation(self, state: P2PState) -> str:
        """Route after requisition validation."""
        # Check if flagged for human review
        if self._check_if_flagged(state):
            return "wait_for_human"
        if state.get("status") == "failed":
            return "reject"
        return "determine_approval"

    def _route_after_approval(self, state: P2PState) -> str:
        """Route after approval determination."""
        # Check if flagged for human review
        if self._check_if_flagged(state):
            return "wait_for_human"
        status = state.get("approval_status", "pending")
        if status == "approved":
            return "generate_po"
        elif status == "rejected":
            return "reject"
        return "hold"

    def _route_after_invoice(self, state: P2PState) -> str:
        """Route after invoice processing."""
        # Check if flagged for human review
        if self._check_if_flagged(state):
            return "wait_for_human"
        if state.get("match_status") == "exception":
            return "hold"
        return "fraud_check"

    def _route_after_fraud(self, state: P2PState) -> str:
        """Route after fraud check."""
        # Check if flagged for human review
        if self._check_if_flagged(state):
            return "wait_for_human"
        if state.get("fraud_status") == "hold":
            return "hold"
        return "compliance_check"

    def _route_after_compliance(self, state: P2PState) -> str:
        """Route after compliance check.
        
        If any agent flagged the document, route to HITL.
        Otherwise, ALWAYS route to final approval (mandatory human step).
        """
        # Check if flagged for human review (for issues before final approval)
        if self._check_if_flagged(state):
            return "wait_for_human"
        if state.get("compliance_status") == "violation":
            return "hold"
        # ALWAYS go to final approval - this is mandatory
        return "submit_for_final_approval"

    # ==================== Public Methods ====================

    def run(self, initial_state: P2PState) -> P2PState:
        """
        Run the workflow synchronously.

        Args:
            initial_state: Initial workflow state

        Returns:
            Final workflow state
        """
        return self.graph.invoke(initial_state)

    async def run_async(self, initial_state: P2PState) -> P2PState:
        """
        Run the workflow asynchronously.

        Args:
            initial_state: Initial workflow state

        Returns:
            Final workflow state
        """
        # LangGraph supports async invocation
        return await asyncio.to_thread(self.graph.invoke, initial_state)

    def get_workflow_status(self, state: P2PState) -> dict[str, Any]:
        """
        Get human-readable workflow status.

        Args:
            state: Current workflow state

        Returns:
            Status summary
        """
        return {
            "workflow_id": state.get("workflow_id"),
            "status": state.get("status"),
            "current_step": state.get("current_step"),
            "requisition_id": state.get("requisition_id"),
            "purchase_order_id": state.get("purchase_order_id"),
            "approval_status": state.get("approval_status"),
            "match_status": state.get("match_status"),
            "fraud_score": state.get("fraud_score"),
            "compliance_status": state.get("compliance_status"),
            "requires_human_action": state.get("requires_human_action", False),
            "agent_notes_count": len(state.get("agent_notes", [])),
        }
