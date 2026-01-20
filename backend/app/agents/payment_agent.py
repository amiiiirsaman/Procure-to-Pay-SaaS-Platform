"""
Payment Agent - Executes payment via bank integration.

Simulates bank API connection with token authentication,
processes payment, and returns confirmation with transaction ID.

Uses database fields for payment processing:
- supplier_bank_name: Bank name
- supplier_bank_account: Masked account number
- supplier_payment_terms: Payment terms (Net 30, etc.)
- payment_method: ACH/Wire/Check
- invoice_amount: Amount to pay
- invoice_due_date: Payment due date
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from .base_agent import BedrockAgent

logger = logging.getLogger(__name__)


class PaymentAgent(BedrockAgent):
    """
    Agent responsible for executing payment via bank integration.
    
    This agent:
    1. Validates payment readiness (all approvals complete)
    2. Connects to bank API with authentication token
    3. Initiates payment transfer
    4. Returns confirmation with transaction details
    """

    def __init__(self, use_mock: bool = False):
        super().__init__(
            agent_name="PaymentAgent",
            role="Treasury/Payment Processor",
            use_mock=use_mock,
        )
        # Simulated bank connection settings
        self.bank_name = "First National Bank"
        self.bank_token = "FNBK-" + str(uuid.uuid4())[:8].upper()

    def get_system_prompt(self) -> str:
        return """You are a Payment Processing Agent in an enterprise P2P (Procure-to-Pay) system.

Your role is to:
1. Review the payment request and verify all approvals are complete
2. Validate the payment amount matches the invoice
3. Check supplier banking details are on file
4. Process the payment through the bank integration
5. Generate a transaction confirmation

You must respond with a JSON object containing:
{
    "status": "success" | "error" | "pending",
    "payment_authorized": true | false,
    "transaction_id": "TXN-XXXXXXXX",
    "amount_paid": <number>,
    "currency": "USD",
    "payment_method": "ACH" | "Wire" | "Check",
    "supplier_name": "<supplier name>",
    "supplier_account": "<masked account number>",
    "bank_reference": "<bank reference number>",
    "payment_date": "<ISO date>",
    "notes": ["<list of processing notes>"],
    "confirmation_message": "<human-readable confirmation>"
}

Always verify:
- Final approval status is "approved"
- Invoice amount matches PO amount (within tolerance)
- Supplier is active and bank-verified
- No fraud flags are present
"""

    def get_responsibilities(self) -> list[str]:
        return [
            "Verify all approvals are complete before payment",
            "Validate payment amount against invoice and PO",
            "Check supplier banking details and status",
            "Connect to bank API with secure token",
            "Execute payment transfer",
            "Generate transaction confirmation with reference ID",
            "Log payment for audit trail",
        ]

    def _generate_mock_response(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Generate mock payment response using requisition database fields.
        
        Uses:
        - supplier_bank_name: Bank name
        - supplier_bank_account: Account number
        - supplier_payment_terms: Payment terms
        - payment_method: ACH/Wire/Check
        - total_amount: Amount to pay
        - invoice_due_date: Due date
        """
        context = context or {}
        
        # Extract amount from context
        amount = context.get("total_amount", context.get("invoice_amount", 1000.00))
        supplier_name = context.get("supplier_name", "Acme Supplies Inc.")
        requisition_number = context.get("requisition_number", "REQ-000001")
        bank_name = context.get("supplier_bank_name", self.bank_name)
        bank_account = context.get("supplier_bank_account", "****1234")
        payment_method = context.get("payment_method", "ACH")
        due_date = context.get("invoice_due_date", datetime.utcnow().strftime("%Y-%m-%d"))
        
        # Generate transaction ID
        transaction_id = f"TXN-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        bank_reference = f"BNK-{uuid.uuid4().hex[:12].upper()}"
        
        # Build reasoning bullets
        reasoning_bullets = [
            f"Payment request for {requisition_number}: ${amount:,.2f}",
            f"Supplier: {supplier_name}",
            f"Bank connection established: {bank_name}",
            f"Bank account verified: {bank_account}",
            f"Payment method: {payment_method}",
            f"All prior agent approvals confirmed ✓",
            f"No fraud flags detected ✓",
            f"Compliance checks passed ✓",
            f"Initiating {payment_method} transfer...",
            f"Transaction ID generated: {transaction_id}",
        ]
        
        return {
            "status": "success",
            "verdict": "AUTO_APPROVE",
            "verdict_reason": "Payment processed successfully",
            "reasoning_bullets": reasoning_bullets,
            "payment_authorized": True,
            "transaction_id": transaction_id,
            "amount_paid": float(amount),
            "currency": "USD",
            "payment_method": payment_method,
            "supplier_name": supplier_name,
            "supplier_account": bank_account,
            "bank_reference": bank_reference,
            "bank_token_used": self.bank_token[:8] + "****",
            "payment_date": datetime.utcnow().isoformat(),
            "notes": [
                f"Payment authorized for {requisition_number}",
                f"Bank connection established via token {self.bank_token[:8]}****",
                f"{payment_method} transfer initiated to {supplier_name}",
                "Payment will settle within 1-2 business days",
            ],
            "confirmation_message": (
                f"💳 PAYMENT SUCCESSFUL\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"Amount: ${amount:,.2f} USD\n"
                f"To: {supplier_name}\n"
                f"Transaction ID: {transaction_id}\n"
                f"Bank Reference: {bank_reference}\n"
                f"Method: {payment_method} Transfer\n"
                f"Status: Completed\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            ),
            "flagged": False,
            "flag_reason": None,
            "confidence": 0.99,
        }

    def process_payment(
        self,
        requisition_data: dict[str, Any],
        invoice_data: Optional[dict[str, Any]] = None,
        previous_agent_notes: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Process payment for approved requisition/invoice.
        
        Args:
            requisition_data: Requisition details including amount
            invoice_data: Optional invoice data for 3-way match verification
            previous_agent_notes: Notes from previous agents in the pipeline
            
        Returns:
            Payment result with transaction details
        """
        # Build context for LLM
        context = {
            "requisition_id": requisition_data.get("id"),
            "requisition_number": requisition_data.get("number"),
            "total_amount": requisition_data.get("total_amount"),
            "currency": requisition_data.get("currency", "USD"),
            "supplier_name": requisition_data.get("supplier_name", "Supplier"),
            "department": requisition_data.get("department"),
            "description": requisition_data.get("description"),
            "bank_token": self.bank_token[:8] + "****",
            "bank_name": self.bank_name,
        }
        
        if invoice_data:
            context["invoice_amount"] = invoice_data.get("total_amount")
            context["invoice_number"] = invoice_data.get("number")
        
        if previous_agent_notes:
            context["previous_agent_notes"] = previous_agent_notes
            
        prompt = f"""Process payment for the following approved requisition:

Requisition Number: {requisition_data.get('number')}
Description: {requisition_data.get('description')}
Total Amount: ${requisition_data.get('total_amount', 0):,.2f}
Department: {requisition_data.get('department')}
Supplier: {requisition_data.get('supplier_name', 'N/A')}

Previous Agent Notes:
{chr(10).join(previous_agent_notes or ['No previous notes'])}

Please:
1. Verify all approvals are complete
2. Validate the payment amount
3. Connect to bank API using token: {self.bank_token[:8]}****
4. Process the ACH payment
5. Return the transaction confirmation
"""
        
        result = self.invoke(prompt, context)
        
        # Log payment attempt
        logger.info(
            f"PaymentAgent processed payment for {requisition_data.get('number')}: "
            f"${requisition_data.get('total_amount', 0):,.2f} - Status: {result.get('status')}"
        )
        
        return result

    def run_task(self, task_data: dict[str, Any]) -> dict[str, Any]:
        """
        Standard interface for running payment task.
        
        Args:
            task_data: Dictionary containing requisition_data and optional invoice_data
            
        Returns:
            Payment processing result
        """
        return self.process_payment(
            requisition_data=task_data.get("requisition_data", task_data),
            invoice_data=task_data.get("invoice_data"),
            previous_agent_notes=task_data.get("previous_agent_notes", []),
        )
