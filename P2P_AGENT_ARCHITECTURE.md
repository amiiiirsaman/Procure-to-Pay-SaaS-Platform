# P2P SaaS Platform - Agent Architecture & Workflow Guide

## System Overview

The P2P (Procure-to-Pay) SaaS Platform uses **7 AWS Bedrock Nova Pro agents** orchestrated by a **LangGraph-based workflow engine** to automate the entire procurement process from requisition to payment. Each agent specializes in a specific domain and connects to the frontend via WebSocket for real-time status updates.

---

## 1. THE AGENTS (7 Total)

### **1.1 RequisitionAgent** 
**Role:** Requisition Specialist  
**Responsibilities:**
- Validate requisition data for completeness and accuracy
- Suggest products from the product catalog based on descriptions
- Recommend preferred vendors based on category and performance history
- Check for duplicate requisitions (prevent duplicate purchases)
- Assign GL accounts and cost centers automatically
- Flag policy violations (e.g., unusual quantities, suspicious vendors)

**Bedrock Connection:**
- Model: AWS Bedrock Nova Pro
- Input: Requisition object, catalog items, recent requisitions
- Output: JSON with validation status, suggestions, duplicate check results

**Example Output:**
```json
{
  "status": "valid|invalid|needs_review",
  "validation_errors": [],
  "suggestions": {
    "products": [{id: "...", match_confidence: 0.95}],
    "vendors": [{id: "...", reason: "..."}],
    "gl_account": "6100",
    "cost_center": "IT-001"
  },
  "duplicate_check": {
    "is_potential_duplicate": false,
    "similar_requisitions": []
  },
  "risk_flags": [],
  "recommendation": "Proceed with order",
  "confidence": 0.98
}
```

---

### **1.2 ApprovalAgent**
**Role:** Approval Workflow Manager  
**Responsibilities:**
- Determine correct approval chain based on amount and company policies
- Route to appropriate approvers (manager/director/VP/CFO/CEO)
- Make approval recommendations (approve/reject/review)
- Identify special review requirements (IT security, legal, etc.)
- Handle emergency/expedited approvals
- Track approval SLAs

**Approval Tiers (US Standard):**
- **Tier 1:** <$1,000 → Auto-approve
- **Tier 2:** $1,000-$5,000 → Manager approval
- **Tier 3:** $5,000-$25,000 → Director approval
- **Tier 4:** $25,000-$50,000 → VP + Finance review
- **Tier 5:** $50,000-$100,000 → CFO approval
- **Tier 6:** >$100,000 → CEO/Board approval

**Bedrock Output:**
```json
{
  "status": "approved|rejected|pending_review|escalated",
  "approval_chain": [
    {"step": 1, "role": "Manager", "user_id": "...", "reason": "Amount tier 2"},
    {"step": 2, "role": "Director", "user_id": "...", "reason": "Department policy"}
  ],
  "tier": 2,
  "recommendation": "approve|reject|review",
  "policy_flags": [],
  "special_reviews_required": [],
  "estimated_time_hours": 4,
  "confidence": 0.92
}
```

---

### **1.3 POAgent** (Purchase Order)
**Role:** PO Specialist  
**Responsibilities:**
- Generate purchase orders from approved requisitions
- Format PO according to supplier requirements
- Calculate terms and conditions based on vendor history
- Apply volume discounts if applicable
- Handle split POsfor large orders
- Track PO creation and dispatch

**Bedrock Output:**
```json
{
  "status": "generated|error",
  "po_number": "PO-2025-001234",
  "po_details": {
    "supplier_id": "...",
    "delivery_date": "2025-02-15",
    "line_items": [...],
    "total_amount": 5000.00,
    "terms": "Net 30"
  },
  "notes": "Standard supplier terms applied",
  "confidence": 0.95
}
```

---

### **1.4 ReceivingAgent**
**Role:** Receiving Specialist  
**Responsibilities:**
- Process goods receipts against POs
- Validate received quantities match PO quantities
- Check for damaged or defective goods
- Record receipt timestamp
- Generate goods receipt documents
- Flag discrepancies for investigation

**Bedrock Output:**
```json
{
  "status": "received|discrepancy|damaged",
  "receipt_number": "GR-2025-001234",
  "items_received": 100,
  "items_expected": 100,
  "discrepancies": [],
  "quality_issues": [],
  "notes": "All items received in good condition",
  "confidence": 0.99
}
```

---

### **1.5 InvoiceAgent**
**Role:** Invoice Processor  
**Responsibilities:**
- Validate invoice data and format
- Match invoice to PO (1-way match: invoice vs PO)
- Check for duplicate invoices
- Flag invoices before PO (early invoicing)
- Verify invoice amount matches PO
- Handle invoice discrepancies

**Bedrock Output:**
```json
{
  "status": "valid|invalid|exception",
  "match_status": "matched|partial|exception",
  "invoice_number": "INV-2025-001234",
  "validations": {
    "format_valid": true,
    "amount_matches_po": true,
    "duplicate_check": false,
    "early_invoice": false
  },
  "discrepancies": [],
  "recommendation": "Proceed to 3-way match",
  "confidence": 0.97
}
```

---

### **1.6 FraudAgent**
**Role:** Fraud Detection Specialist  
**Responsibilities:**
- Detect duplicate invoices
- Identify split transactions (avoiding approval thresholds)
- Flag round-dollar anomalies
- Detect vendor-employee collusion indicators
- Identify shell companies
- Score overall fraud risk (0-100)

**Fraud Rules & Risk Scores:**
| Rule | Description | Risk Score |
|------|-------------|-----------|
| Duplicate Invoice | Same invoice #, vendor, amount | 95 |
| Split Transaction | Multiple invoices to avoid threshold | 85 |
| Round Dollar | Unusual high percentage of round amounts | 65 |
| Vendor Collusion | Shared address/phone/bank account | 95 |
| Shell Company | PO box only, no web presence | 80 |
| Ghost Vendor | No goods, service-only, payment-only | 90 |
| Invoice Before PO | Invoice dated before PO creation | 75 |
| Bank Account Change | Recent change before payment | 70 |
| Rush Payment | Same-day urgent payment request | 60 |

**Risk Classification:**
- **LOW (0-30):** Normal transaction
- **MEDIUM (31-60):** Monitor
- **HIGH (61-85):** Requires review
- **CRITICAL (86-100):** Hold payment

**Bedrock Output:**
```json
{
  "status": "clean|flagged|hold",
  "risk_score": 45,
  "risk_level": "medium",
  "flags": [
    {
      "rule_id": "split_transaction",
      "rule_name": "Split Transaction Detection",
      "severity": "alert",
      "evidence": "3 invoices within 72 hours totaling $14,900",
      "score_contribution": 35
    }
  ],
  "vendor_risk_profile": {
    "overall_risk": "medium",
    "history_flags": ["2 previous discrepancies"],
    "recommendation": "Standard processing"
  },
  "recommended_actions": [
    {"action": "Manual verification", "priority": "high", "assignee": "Finance"}
  ],
  "investigation_needed": false,
  "payment_recommendation": "proceed|hold|reject",
  "confidence": 0.88
}
```

---

### **1.7 ComplianceAgent**
**Role:** Compliance Officer  
**Responsibilities:**
- Validate compliance with company policies
- Check regulatory requirements
- Verify segregation of duties (no single person requestor + approver)
- Validate supplier compliance (certifications, sanctions lists)
- Track compliance metrics
- Flag policy violations for escalation

**Bedrock Output:**
```json
{
  "status": "compliant|violation|pending",
  "compliance_checks": {
    "policy_adherence": "compliant",
    "segregation_of_duties": "valid",
    "supplier_compliance": "verified",
    "regulatory_compliance": "compliant"
  },
  "violations": [],
  "risk_level": "low",
  "recommendations": [],
  "confidence": 0.96
}
```

---

## 2. STATE AGENT (State Management via P2PState)

The **P2PState** is a TypedDict that tracks the complete workflow state across all steps:

### State Structure ([backend/app/orchestrator/state.py](backend/app/orchestrator/state.py)):

```python
class P2PState(TypedDict):
    # Workflow tracking
    workflow_id: str
    current_step: WorkflowStep  # The current step enum
    previous_step: Optional[WorkflowStep]
    started_at: str
    updated_at: str
    
    # Document references
    requisition_id: Optional[int]
    purchase_order_id: Optional[int]
    goods_receipt_id: Optional[int]
    invoice_id: Optional[int]
    payment_id: Optional[str]
    
    # Document data (full objects for processing)
    requisition: Optional[dict]
    purchase_order: Optional[dict]
    goods_receipt: Optional[dict]
    invoice: Optional[dict]
    
    # Approval workflow
    approval_status: str  # pending, approved, rejected
    approval_chain: list[dict]
    current_approver: Optional[dict]
    approval_tier: int
    
    # Three-way match
    match_status: str  # pending, matched, partial, exception
    match_exceptions: list[dict]
    
    # Fraud detection
    fraud_score: int  # 0-100
    fraud_flags: list[dict]
    fraud_status: str  # clean, flagged, hold
    
    # Compliance
    compliance_status: str  # compliant, violation, pending
    compliance_violations: list[dict]
    
    # Agent notes and reasoning
    agent_notes: list[dict]  # Timestamped notes from each agent
    
    # Error handling
    error: Optional[str]
    error_details: Optional[dict]
    
    # Workflow control
    status: str  # in_progress, completed, failed, on_hold
    next_action: Optional[str]
    requires_human_action: bool
```

### WorkflowStep Enum (13 Steps Total):
```python
class WorkflowStep(str, Enum):
    START = "start"
    VALIDATE_REQUISITION = "validate_requisition"      # Step 1
    DETERMINE_APPROVAL = "determine_approval"          # Step 2
    AWAIT_APPROVAL = "await_approval"                  # HITL pause
    GENERATE_PO = "generate_po"                        # Step 3
    DISPATCH_PO = "dispatch_po"                        # Auto
    AWAIT_DELIVERY = "await_delivery"                  # HITL pause
    RECEIVE_GOODS = "receive_goods"                    # Step 4
    PROCESS_INVOICE = "process_invoice"                # Step 5
    THREE_WAY_MATCH = "three_way_match"                # Internal
    FRAUD_CHECK = "fraud_check"                        # Step 6
    COMPLIANCE_CHECK = "compliance_check"              # Step 7
    SCHEDULE_PAYMENT = "schedule_payment"              # Auto
    COMPLETE = "complete"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"
    ERROR = "error"
```

---

## 3. THE ORCHESTRATOR (LangGraph Workflow Engine)

**Class:** `P2POrchestrator` ([backend/app/orchestrator/workflow.py](backend/app/orchestrator/workflow.py))

### How It Works:

The orchestrator is a **state machine** built with LangGraph that:
1. Maintains state across all workflow nodes
2. Routes based on agent decisions
3. Enforces Human-in-the-Loop (HITL) at critical steps
4. Broadcasts WebSocket events for real-time frontend updates

### Workflow Graph Structure:

```
START
  ↓
[validate_requisition] → RequisitionAgent
  ↓ (conditional routing)
[determine_approval] → ApprovalAgent
  ↓ (conditional routing)
[generate_po] → POAgent
  ↓
[process_invoice] → InvoiceAgent
  ↓ (conditional routing)
[fraud_check] → FraudAgent
  ↓ (conditional routing)
[compliance_check] → ComplianceAgent
  ↓ (conditional routing)
[submit_for_final_approval] → HUMAN APPROVAL (ALWAYS MANDATORY)
  ↓
[complete] → END
  
OR at any step:
  ↓
[wait_for_human] → HITL PAUSE
  ↓
[reject] → END
  ↓
[hold] → END
```

### Key Orchestrator Methods:

#### **1. `_validate_requisition(state)` - Step 1**
- Calls RequisitionAgent
- Validates data completeness
- Checks for duplicates
- Routes to approval or wait_for_human

#### **2. `_determine_approval(state)` - Step 2**
- Calls ApprovalAgent
- Gets approval chain
- Routes based on amount/policy
- Can escalate to wait_for_human

#### **3. `_generate_po(state)` - Step 3**
- Calls POAgent
- Creates purchase order
- Moves to invoice processing

#### **4. Fraud & Compliance Flow - Steps 6 & 7**
- `_fraud_check(state)` → FraudAgent
- `_compliance_check(state)` → ComplianceAgent
- Both can flag for HITL review

#### **5. HITL (Human-in-the-Loop) Nodes**
- `_wait_for_human(state)` - Pauses workflow for human review
- Final approval ALWAYS requires human decision
- Broadcasts WebSocket events waiting for approval

---

## 4. BEDROCK NOVA PRO INTEGRATION

### How Agents Connect to Bedrock:

**Base Agent Class** ([backend/app/agents/base_agent.py](backend/app/agents/base_agent.py)):

```python
class BedrockAgent(ABC):
    def __init__(self, agent_name, role, region=None, model_id=None, use_mock=False):
        self.agent_name = agent_name
        self.role = role
        self.region = region or settings.aws_region  # e.g., 'us-east-1'
        self.model_id = model_id or settings.bedrock_model_id  # 'anthropic.nova-pro-v1'
        self.conversation_history = []
        
        # Initialize Bedrock Runtime Client
        if not use_mock:
            self.bedrock = boto3.client(
                "bedrock-runtime",
                region_name=self.region,
            )
```

### Invoke Method (How Agents Call Bedrock):

```python
async def invoke(self, prompt: str, context: dict) -> dict:
    """
    1. Build system prompt + user prompt + context
    2. Call Bedrock Nova Pro model
    3. Parse JSON response
    4. Return structured result
    """
    
    message = self.bedrock.converse(
        modelId=self.model_id,  # "anthropic.nova-pro-v1"
        messages=[
            {
                "role": "user",
                "content": f"""
                {self.get_system_prompt()}
                
                Context: {json.dumps(context)}
                
                Request: {prompt}
                
                Respond with valid JSON only, no markdown.
                """
            }
        ]
    )
    
    # Parse response and return structured data
    response_text = message["content"][0]["text"]
    result = json.loads(response_text)
    
    # Emit WebSocket event with agent response
    await self.emit_event("agent_response", {
        "agent": self.agent_name,
        "result": result
    })
    
    return result
```

### Configuration:
- **Model:** AWS Bedrock Nova Pro (anthropic.nova-pro-v1)
- **Region:** Configurable in settings (default: us-east-1)
- **Cost:** Per-token billing via AWS
- **Mock Mode:** Can run with MockBedrockAgent for testing (no AWS calls)

---

## 5. FRONTEND AUTOMATION PAGE WORKFLOW

### AutomationView.tsx Location:
[frontend/src/views/AutomationView.tsx](frontend/src/views/AutomationView.tsx)

### 7-Step Workflow Display:

The automation page displays a **table with 7 rows** (each row = 1 step):

| Step # | Step Name | Icon | Description | Status |
|--------|-----------|------|-------------|--------|
| 1 | Requisition | FileText | Validate & create requisition | not-started → in-progress → completed |
| 2 | Approval Check | CheckCircle | Determine approval chain | pending-approval (HITL) |
| 3 | PO Generation | ShoppingCart | Generate purchase order | in-progress |
| 4 | Goods Receipt | Truck | Receive goods | waiting |
| 5 | Invoice Validation | Receipt | 3-way match (invoice vs PO vs GR) | pending |
| 6 | Fraud Analysis | AlertTriangle | Fraud detection scoring | pending |
| 7 | Compliance Check | FileCheck | Regulatory compliance | pending |

### Automation Page Update Flow:

#### **Step 1: Start Workflow**
User clicks "Run P2P Workflow" → API call:
```typescript
const response = await runP2PWorkflow(
  requisitionId,
  startFromStep=1,
  runSingleStep=false  // Run all steps
);
```

#### **Step 2: Backend Executes Steps**
Backend calls `/agents/workflow/run` which:
1. Initializes all 7 agents
2. Runs each step sequentially
3. Updates state after each step
4. Broadcasts WebSocket events

**Example Event (Real-time):**
```json
{
  "event_type": "p2p_workflow_step",
  "workflow_id": "abc-123-def",
  "step_id": 2,
  "step_name": "Approval Check",
  "agent_name": "ApprovalAgent",
  "status": "completed",
  "flagged": false,
  "timestamp": "2025-01-17T14:30:22Z"
}
```

#### **Step 3: Frontend Updates Row 3, Column 2 (Status)**
WebSocket listener updates automation table:

**Before (Row 2, Col 2 - Status):**
```
Approval Check | pending
```

**After (Row 2, Col 2 - Status):**
```
Approval Check | in-progress ⟳  (agent is processing)
```

**After completion (Row 2, Col 2 - Status):**
```
Approval Check | ✓ approved (or 🚩 flagged if needs HITL)
```

### Key Frontend Components:

#### **AutomationView.tsx Structure:**
```typescript
interface ExecutionStep {
  id: number;           // 1-7
  name: string;         // Step name
  status: ExecutionStatus;  // not-started | in-progress | completed | error | waiting-approval
  message?: string;     // Optional status message
  agentNotes?: string[];  // Notes from agent
}

const [steps, setSteps] = useState<ExecutionStep[]>(
  STEP_INFO.map(info => ({
    id: info.id,
    name: info.name,
    status: 'not-started'
  }))
);

// WebSocket listener for real-time updates
useEffect(() => {
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    if (data.event_type === 'p2p_workflow_step') {
      // Update row 3 column 2 (step_id, status)
      setSteps(prev => 
        prev.map(step =>
          step.id === data.step_id
            ? { ...step, status: data.status, message: data.note }
            : step
        )
      );
    }
  });
}, []);
```

#### **Display (Row 3, Column 2 - Approval Check Row):**
```tsx
<tr key={step.id}>
  <td>{step.id}</td>                    {/* Col 1: Step # */}
  <td>{step.name}</td>                  {/* Col 2: Step Name */}
  <td>{renderStatusIcon(step.status)}</td> {/* Col 3: Status Icon */}
  <td>{step.message}</td>               {/* Col 4: Message */}
  <td>{step.agentNotes?.join(', ')}</td> {/* Col 5: Notes */}
</tr>
```

---

## 6. API ENDPOINTS FOR WORKFLOW CONTROL

### Workflow Status Endpoint:
```
GET /api/v1/agents/workflow/status/{requisition_id}
```
**Response:**
```json
{
  "requisition_id": 123,
  "current_step": 2,
  "total_steps": 7,
  "step_name": "Approval Check",
  "step_status": "pending_approval",
  "workflow_status": "in_progress",
  "can_continue": false,
  "completed_steps": [
    {
      "agent": "RequisitionAgent",
      "note": "Requisition validated successfully",
      "flagged": false,
      "timestamp": "2025-01-17T14:20:00Z"
    }
  ],
  "flagged_items": []
}
```

### Run Workflow Endpoint:
```
POST /api/v1/agents/workflow/run
```
**Request:**
```json
{
  "requisition_id": 123,
  "start_from_step": 1,
  "run_single_step": false
}
```
**Response:**
```json
{
  "workflow_id": "abc-123-def",
  "requisition_id": 123,
  "status": "completed|error|waiting_approval",
  "current_step": 7,
  "steps": [
    {
      "step_id": 1,
      "step_name": "Requisition Validation",
      "agent_name": "RequisitionAgent",
      "status": "completed",
      "agent_notes": ["✓ Requisition valid"],
      "flagged": false
    },
    ...
  ],
  "flagged_issues": [],
  "execution_time_ms": 12500,
  "overall_notes": ["All validations passed"]
}
```

### Step Approval Endpoint (HITL):
```
POST /api/v1/agents/workflow/step/approve
```
**Request:**
```json
{
  "requisition_id": 123,
  "step_id": 2,
  "action": "approve|reject|hold",
  "comments": "Approved by Finance Director"
}
```
**Response:**
```json
{
  "requisition_id": 123,
  "step_id": 2,
  "action": "approve",
  "success": true,
  "message": "Step 2 approved. Proceeding to step 3",
  "next_step": 3,
  "workflow_status": "in_progress"
}
```

---

## 7. DATA FLOW EXAMPLE: Step-by-Step Execution

### Request Ticket Through Entire Workflow:

```
USER INITIATES (Frontend AutomationView)
  ↓
Click "Run P2P Workflow" on Requisition #123
  ↓
[STEP 1: REQUISITION VALIDATION] (Current Step)
  ├─ Frontend: Row 1, Col 2 = "in-progress ⟳"
  ├─ Backend: Calls RequisitionAgent.validate_requisition()
  ├─ Bedrock: Analyzes requisition data
  ├─ Result: { status: "valid", suggestions: {...} }
  ├─ Database: Saves AgentNote with timestamp
  ├─ WebSocket: Broadcasts step_completed event
  └─ Frontend: Row 1, Col 2 = "✓ completed"
  
[STEP 2: APPROVAL CHECK]
  ├─ Frontend: Row 2, Col 2 = "in-progress ⟳"
  ├─ Backend: Calls ApprovalAgent.determine_approval_chain()
  ├─ Bedrock: Determines $5,000 = Tier 2 (Manager approval)
  ├─ Result: { approval_chain: [...], tier: 2, recommendation: "approve" }
  ├─ State: Sets approval_status = "pending", current_approver = "john_doe"
  ├─ WebSocket: Broadcasts waiting_for_approval event
  └─ Frontend: Row 2, Col 2 = "🚩 pending_approval" + "Awaiting John Doe"
  
[HITL PAUSE - AWAITING HUMAN APPROVAL]
  ├─ Frontend: Shows "Awaiting Manager Approval"
  ├─ Human approves in UI
  ├─ Frontend: Calls approveWorkflowStep(123, 2, "approve")
  ├─ Backend: Updates state, clears flag
  ├─ WebSocket: Broadcasts approval_received event
  └─ Frontend: Row 2, Col 2 = "✓ approved"
  
[STEP 3: PO GENERATION]
  ├─ Frontend: Row 3, Col 2 = "in-progress ⟳"
  ├─ Backend: Calls POAgent.generate_po()
  ├─ Bedrock: Generates PO with terms
  ├─ Result: { po_number: "PO-2025-001234", ... }
  ├─ Database: Creates PO record, saves AgentNote
  └─ Frontend: Row 3, Col 2 = "✓ completed"
  
[STEP 4: GOODS RECEIPT PROCESSING]
  ├─ Frontend: Row 4, Col 2 = "waiting" (manual goods receipt)
  ├─ User receives goods, confirms in system
  ├─ Backend: Calls ReceivingAgent.process_receipt()
  ├─ Result: { status: "received", receipt_number: "GR-2025-001234" }
  └─ Frontend: Row 4, Col 2 = "✓ completed"
  
[STEP 5: INVOICE VALIDATION]
  ├─ Frontend: Row 5, Col 2 = "in-progress ⟳"
  ├─ Supplier submits invoice
  ├─ Backend: Calls InvoiceAgent.validate_invoice()
  ├─ Bedrock: 3-way match check (Invoice vs PO vs GR)
  ├─ Result: { match_status: "matched", ... }
  └─ Frontend: Row 5, Col 2 = "✓ matched"
  
[STEP 6: FRAUD ANALYSIS]
  ├─ Frontend: Row 6, Col 2 = "in-progress ⟳"
  ├─ Backend: Calls FraudAgent.analyze_transaction()
  ├─ Bedrock: Scores fraud risk (0-100)
  ├─ Result: { risk_score: 25, status: "clean", risk_level: "low" }
  ├─ If risk_score >= 60:
  │  └─ Flags for HITL review
  └─ Frontend: Row 6, Col 2 = "✓ clean"
  
[STEP 7: COMPLIANCE CHECK]
  ├─ Frontend: Row 7, Col 2 = "in-progress ⟳"
  ├─ Backend: Calls ComplianceAgent.check_compliance()
  ├─ Bedrock: Validates against policies
  ├─ Result: { status: "compliant", violations: [] }
  └─ Frontend: Row 7, Col 2 = "✓ compliant"
  
[FINAL APPROVAL - MANDATORY HUMAN APPROVAL]
  ├─ Frontend: Shows "Final Approval Required"
  ├─ Finance Director reviews complete workflow
  ├─ Bedrock Nova shows: "All checks passed, ready for payment"
  ├─ Human approves via Final Approval button
  ├─ Backend: Sets workflow_status = "completed"
  ├─ WebSocket: Broadcasts workflow_completed event
  └─ Frontend: Shows "✓ Workflow Complete - Ready for Payment"
  
PAYMENT PROCESSING (Auto or Manual)
  ├─ Payment scheduled for Net 30 days
  └─ Dashboard updated with completed status
```

---

## 8. STATE MACHINE DECISION ROUTING

### Conditional Edges (How Orchestrator Routes Between Steps):

#### **After Requisition Validation:**
```python
def _route_after_validation(state: P2PState) -> str:
    if state["validation_status"] == "invalid":
        return "reject"  # Go to rejection node
    elif state["requires_human_action"]:
        return "wait_for_human"  # Pause for HITL
    else:
        return "determine_approval"  # Continue to approval
```

#### **After Approval Check:**
```python
def _route_after_approval(state: P2PState) -> str:
    if state["approval_status"] == "rejected":
        return "reject"
    elif state["approval_status"] == "pending":
        return "wait_for_human"  # Wait for approver
    elif state["on_hold"]:
        return "hold"
    else:
        return "generate_po"  # Approved, generate PO
```

#### **After Fraud Check:**
```python
def _route_after_fraud(state: P2PState) -> str:
    if state["fraud_status"] == "critical":
        return "hold"  # Critical fraud, pause
    elif state["fraud_status"] == "flagged":
        return "wait_for_human"  # Review needed
    else:
        return "compliance_check"  # Proceed
```

---

## 9. WEBsocket EVENTS & REAL-TIME UPDATES

The system uses WebSocket (`ws_manager`) to push real-time updates:

### Event Types:

```python
# Step execution events
{
  "event_type": "p2p_workflow_step",
  "workflow_id": "abc-123",
  "step_id": 2,
  "step_name": "Approval Check",
  "agent_name": "ApprovalAgent",
  "status": "completed|error",
  "flagged": false,
  "timestamp": "2025-01-17T14:30:00Z"
}

# Step approval/rejection
{
  "event_type": "p2p_step_approval",
  "requisition_id": 123,
  "step_id": 2,
  "action": "approve|reject|hold",
  "next_step": 3,
  "workflow_status": "in_progress",
  "timestamp": "2025-01-17T14:35:00Z"
}

# Workflow completion
{
  "event_type": "workflow_completed",
  "requisition_id": 123,
  "status": "completed|failed",
  "total_time_ms": 45000,
  "timestamp": "2025-01-17T14:45:00Z"
}
```

---

## 10. ERROR HANDLING & RETRIES

### Error Scenarios:

1. **Agent Failure:** If RequisitionAgent fails
   - Status → "error"
   - Flags for HITL review
   - Step pauses, manual intervention required

2. **Bedrock Timeout:** If AWS calls exceed timeout
   - Retries up to 3 times
   - If all fail → "error" status
   - Escalates to HITL

3. **Database Errors:** If record creation fails
   - Logs error details
   - Broadcasts error event
   - Frontend shows error message

### Retry Logic:
```python
def run_step_with_retry(step_func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return step_func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

## 11. CONFIGURATION & SETTINGS

### Backend Config ([backend/app/config.py](backend/app/config.py)):
```python
class Settings(BaseSettings):
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.nova-pro-v1"
    use_mock_agents: bool = False  # Use real Bedrock if False
    bedrock_timeout_seconds: int = 30
    database_url: str
```

### Mock Mode:
For testing without AWS costs, use `MockBedrockAgent`:
```python
# Returns hardcoded realistic responses
agent = MockBedrockAgent("RequisitionAgent", "Specialist")
result = agent.invoke("test prompt")  # No AWS call
```

---

## 12. SUMMARY TABLE: Agent Responsibilities vs. Steps

| # | Agent | Step | Responsibility | State Fields | Bedrock Call |
|---|-------|------|-----------------|-------------|--------------|
| 1 | RequisitionAgent | Validate Requisition | Data validation, duplicate check, suggestions | requisition, validation_status | ✓ |
| 2 | ApprovalAgent | Approval Check | Determine approval chain, tier routing | approval_chain, approval_status | ✓ |
| 3 | POAgent | Generate PO | Create purchase order | purchase_order, po_status | ✓ |
| 4 | ReceivingAgent | Goods Receipt | Validate receipt | goods_receipt, receipt_status | ✓ |
| 5 | InvoiceAgent | Invoice Validation | 3-way match | invoice, match_status | ✓ |
| 6 | FraudAgent | Fraud Analysis | Risk scoring | fraud_score, fraud_flags | ✓ |
| 7 | ComplianceAgent | Compliance Check | Policy validation | compliance_status, violations | ✓ |
| — | Orchestrator | All Steps | State routing, HITL control | current_step, status, requires_human_action | — |

---

## 13. FRONTEND AUTOMATION TABLE UPDATE MECHANICS

### Row 3, Column 2 (Approval Check Status) Example:

**Database State Progression:**
```
Time    Requisition.current_stage    Requisition.flagged_by    Frontend Display
----    --------------------------    ----------------------    ----------------
T+0s    "step_1"                      NULL                      Row 2: "⟳ in-progress"
T+5s    "step_2"                      NULL                      Row 2: "⟳ in-progress"
T+10s   "step_2"                      "approval_pending"        Row 2: "🚩 waiting_approval"
T+15s   "step_3"                      NULL                      Row 2: "✓ approved"
```

**WebSocket Event Chain:**
```
1. Agent starts: { event: "p2p_workflow_step", step: 2, status: "in_progress" }
   → Frontend: setSteps(...) marks step 2 as in-progress
   
2. Agent needs approval: { event: "p2p_step_approval", step: 2, status: "pending_approval" }
   → Frontend: marks step 2 as pending, shows approval UI
   
3. Human approves: approveWorkflowStep(123, 2, "approve")
   → Backend: updates database
   → WebSocket: { event: "p2p_step_approval", action: "approve", next_step: 3 }
   → Frontend: marks step 2 as approved, step 3 as in-progress
```

---

## Quick Reference: How to Track a Requisition

1. **User Creates Requisition** → View shows it in draft
2. **User Clicks "Run Workflow"** → Automation View opens with 7 rows
3. **Step 1 Executes** → Row 1 shows "⟳ in-progress" → "✓ completed"
4. **Step 2 Executes** → Row 2 shows status (may pause for HITL)
5. **Each agent adds a note** → Stored in `AgentNote` table with timestamp
6. **Final approval required** → Last manual gate before payment
7. **Workflow completes** → Status changes to "completed", ready for payment
8. **View results** → Dashboard shows completed requisition, agents' analyses, savings

This is your complete P2P agent system! Each agent is specialized, Bedrock Nova Pro is called per step, and the frontend updates in real-time via WebSocket.
