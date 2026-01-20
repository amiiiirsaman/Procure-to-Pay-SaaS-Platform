"""
State definitions for P2P workflow orchestration.
"""

from enum import Enum
from typing import Any, Optional, TypedDict


class WorkflowStep(str, Enum):
    """Steps in the P2P workflow."""

    START = "start"
    VALIDATE_REQUISITION = "validate_requisition"
    DETERMINE_APPROVAL = "determine_approval"
    AWAIT_APPROVAL = "await_approval"
    GENERATE_PO = "generate_po"
    DISPATCH_PO = "dispatch_po"
    AWAIT_DELIVERY = "await_delivery"
    RECEIVE_GOODS = "receive_goods"
    PROCESS_INVOICE = "process_invoice"
    THREE_WAY_MATCH = "three_way_match"
    FRAUD_CHECK = "fraud_check"
    COMPLIANCE_CHECK = "compliance_check"
    SCHEDULE_PAYMENT = "schedule_payment"
    COMPLETE = "complete"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"
    ERROR = "error"


class P2PState(TypedDict, total=False):
    """
    State object for P2P workflow.

    This TypedDict defines all fields that can be in the workflow state.
    LangGraph uses this to track state across nodes.
    """

    # Workflow tracking
    workflow_id: str
    current_step: WorkflowStep
    previous_step: Optional[WorkflowStep]
    started_at: str
    updated_at: str

    # Document references (IDs)
    requisition_id: Optional[int]
    purchase_order_id: Optional[int]
    goods_receipt_id: Optional[int]
    invoice_id: Optional[int]
    payment_id: Optional[str]

    # Document data (full objects for processing)
    requisition: Optional[dict[str, Any]]
    purchase_order: Optional[dict[str, Any]]
    goods_receipt: Optional[dict[str, Any]]
    invoice: Optional[dict[str, Any]]

    # Related entities
    requestor: Optional[dict[str, Any]]
    supplier: Optional[dict[str, Any]]
    approvers: list[dict[str, Any]]

    # Approval workflow
    approval_status: str  # pending, approved, rejected
    approval_chain: list[dict[str, Any]]
    current_approver: Optional[dict[str, Any]]
    approval_tier: int

    # Three-way match
    match_status: str  # pending, matched, partial, exception
    match_exceptions: list[dict[str, Any]]

    # Fraud detection
    fraud_score: int
    fraud_flags: list[dict[str, Any]]
    fraud_status: str  # clean, flagged, hold

    # Compliance
    compliance_status: str  # compliant, violation, pending
    compliance_violations: list[dict[str, Any]]

    # Agent notes and reasoning
    agent_notes: list[dict[str, Any]]

    # Error handling
    error: Optional[str]
    error_details: Optional[dict[str, Any]]

    # Workflow control
    status: str  # in_progress, completed, failed, on_hold
    next_action: Optional[str]
    requires_human_action: bool


def create_initial_state(
    requisition: dict[str, Any],
    requestor: dict[str, Any],
    workflow_id: Optional[str] = None,
) -> P2PState:
    """
    Create initial state for a new P2P workflow.

    Args:
        requisition: Requisition data to process
        requestor: User who created the requisition
        workflow_id: Optional workflow ID (generated if not provided)

    Returns:
        Initial P2PState
    """
    from datetime import datetime
    import uuid

    return P2PState(
        workflow_id=workflow_id or str(uuid.uuid4()),
        current_step=WorkflowStep.START,
        previous_step=None,
        started_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
        requisition_id=requisition.get("id"),
        requisition=requisition,
        requestor=requestor,
        approval_status="pending",
        approval_chain=[],
        approvers=[],
        approval_tier=0,
        match_status="pending",
        match_exceptions=[],
        fraud_score=0,
        fraud_flags=[],
        fraud_status="pending",
        compliance_status="pending",
        compliance_violations=[],
        agent_notes=[],
        status="in_progress",
        requires_human_action=False,
    )


def add_agent_note(state: P2PState, agent: str, note: str, data: Any = None) -> P2PState:
    """
    Add an agent note to the state.

    Args:
        state: Current state
        agent: Name of agent adding note
        note: Note text
        data: Optional structured data

    Returns:
        Updated state
    """
    from datetime import datetime

    notes = state.get("agent_notes", [])
    notes.append({
        "agent": agent,
        "timestamp": datetime.utcnow().isoformat(),
        "note": note,
        "data": data,
    })
    state["agent_notes"] = notes
    return state


def transition_step(state: P2PState, new_step: WorkflowStep) -> P2PState:
    """
    Transition to a new workflow step.

    Args:
        state: Current state
        new_step: New step to transition to

    Returns:
        Updated state
    """
    from datetime import datetime

    state["previous_step"] = state.get("current_step")
    state["current_step"] = new_step
    state["updated_at"] = datetime.utcnow().isoformat()
    return state
