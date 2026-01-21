# P2P Agent Architecture

Technical documentation for the AI agent system powering the Procure-to-Pay workflow.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  AutomationView.tsx → WebSocket → Real-time Status Updates      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│  routes.py → Workflow Orchestration → Agent Execution           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  BedrockAgent   │  │   SQLAlchemy    │  │    WebSocket    │
│   Base Class    │  │     Models      │  │     Manager     │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Bedrock Runtime                           │
│                   amazon.nova-pro-v1:0                          │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Inventory

| Step | Agent Class | File | Responsibility |
|------|-------------|------|----------------|
| 1 | `RequisitionAgent` | `requisition_agent.py` | Validate requisition data, check duplicates, suggest GL accounts |
| 2 | `ApprovalAgent` | `approval_agent.py` | Route to approvers based on amount thresholds |
| 3 | `POAgent` | `po_agent.py` | Generate PO with terms, validate contracts |
| 4 | `ReceivingAgent` | `receiving_agent.py` | Record goods receipt, verify quantities |
| 5 | `InvoiceAgent` | `invoice_agent.py` | Process invoice, perform 3-way matching |
| 6 | `FraudAgent` | `fraud_agent.py` | Detect fraud patterns and anomalies |
| 7 | `ComplianceAgent` | `compliance_agent.py` | Verify policy adherence, SOD enforcement |
| 8 | Manual | — | Human-in-the-loop final approval (required) |
| 9 | `PaymentAgent` | `payment_agent.py` | Execute payment, verify bank details |

## Base Agent Class

All agents inherit from `BedrockAgent` in `base_agent.py`:

```python
class BedrockAgent:
    def __init__(self, agent_name: str, model_id: str = "amazon.nova-pro-v1:0"):
        self.agent_name = agent_name
        self.model_id = model_id
        self.bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")
        self.conversation_history = []
        self.use_mock = os.getenv("USE_MOCK_AGENTS", "false").lower() == "true"

    async def invoke(self, prompt: str, context: dict) -> dict:
        if self.use_mock:
            return self._mock_response(context)
        return await self._call_bedrock(prompt, context)

    def _call_bedrock(self, prompt: str, context: dict) -> dict:
        response = self.bedrock_client.converse(
            modelId=self.model_id,
            messages=self._build_messages(prompt, context),
            inferenceConfig={"maxTokens": 4096, "temperature": 0.1}
        )
        return self._parse_response(response)
```

## Agent Response Structure

Each agent returns a standardized response:

```json
{
  "verdict": "AUTO_APPROVE | HITL_FLAG",
  "verdict_reason": "Explanation for the decision",
  "confidence": 0.95,
  "risk_level": "low | medium | high | critical",
  "checks": {
    "check_1": { "status": "pass | fail | warn", "details": "..." },
    "check_2": { "status": "pass | fail | warn", "details": "..." },
    "check_3": { "status": "pass | fail | warn", "details": "..." },
    "check_4": { "status": "pass | fail | warn", "details": "..." },
    "check_5": { "status": "pass | fail | warn", "details": "..." },
    "check_6": { "status": "pass | fail | warn", "details": "..." }
  },
  "recommendations": ["Action item 1", "Action item 2"],
  "agent_specific_data": { }
}
```

## Agent Check Matrix

### Step 1: RequisitionAgent
| Check | Description |
|-------|-------------|
| Data Validation | Required fields populated |
| Catalog Matching | Products exist in catalog |
| Duplicate Detection | No similar recent requisitions |
| GL Account | Valid cost center assignment |
| Budget Check | Within department budget |
| Vendor Suggestion | Recommended suppliers |

### Step 2: ApprovalAgent
| Check | Description |
|-------|-------------|
| Compliance | Policy requirements met |
| Budget | Within approval limits |
| Documents | Required attachments present |
| Policy | Procurement policy adherence |
| Authority | Requestor has authority |
| Urgency | Rush order validation |

### Step 3: POAgent
| Check | Description |
|-------|-------------|
| Contract Verification | Active contract exists |
| Supplier Validation | Vendor is approved |
| Shipping Terms | Valid shipping method |
| Delivery Date | Realistic timeline |
| Payment Terms | Within policy limits |
| Amount Validation | Matches requisition |

### Step 4: ReceivingAgent
| Check | Description |
|-------|-------------|
| Line Item Validation | Items match PO |
| Quantity Check | Received vs ordered |
| Variance Analysis | Within tolerance |
| Discrepancy Flag | Damage or quality issues |
| Previous Receipts | Partial receipt history |
| Delivery Date | On-time delivery |

### Step 5: InvoiceAgent
| Check | Description |
|-------|-------------|
| GR Verification | Goods receipt exists |
| Amount Match | Invoice matches PO/GR |
| 3-Way Match | PO-GR-Invoice alignment |
| Data Completeness | Required invoice fields |
| Supplier Verification | Invoice from correct vendor |
| Payment Terms | Correct terms applied |

### Step 6: FraudAgent
| Check | Description |
|-------|-------------|
| Duplicate Invoice | Same invoice submitted twice |
| Round-Dollar Anomaly | Suspicious round amounts |
| Split Transaction | Avoiding approval thresholds |
| Vendor-Employee Collusion | Relationship flags |
| Shell Company | Suspicious vendor patterns |
| Ghost Vendor | Vendor verification |

### Step 7: ComplianceAgent
| Check | Description |
|-------|-------------|
| SOD Matrix | Segregation of duties |
| Documentation Tier | Proper documentation level |
| Approval Chain | All approvals obtained |
| Policy Adherence | Company policy compliance |
| Regulatory | External regulation check |
| Audit Trail | Complete transaction history |

### Step 9: PaymentAgent
| Check | Description |
|-------|-------------|
| Approval Verification | Final approval obtained |
| Amount Validation | Correct payment amount |
| Bank Details | Verified bank account |
| Duplicate Payment | No duplicate payment |
| Payment Method | Correct payment type |
| Timing | Payment date appropriate |

## Human-in-the-Loop (HITL) Logic

```python
HITL_ALLOWED_STEPS = [2, 3, 4, 5, 8]  # Steps allowing human override

def determine_hitl(step: int, verdict: str, checks: dict) -> bool:
    if step == 8:  # Final approval always requires HITL
        return True
    
    if step not in HITL_ALLOWED_STEPS:
        return False
    
    if verdict == "HITL_FLAG":
        return True
    
    # Flag if any critical check failed
    for check in checks.values():
        if check["status"] == "fail" and check.get("severity") == "critical":
            return True
    
    return False
```

## Workflow Orchestration

The workflow is managed in `routes.py`:

```python
async def run_workflow(requisition_id: int, start_from_step: int = 1):
    workflow_id = generate_workflow_id()
    
    for step in range(start_from_step, 10):
        agent = get_agent_for_step(step)
        context = build_context(requisition_id, step)
        
        result = await agent.invoke(context)
        
        emit_websocket_event(workflow_id, step, result)
        
        if result["verdict"] == "HITL_FLAG" and step in HITL_ALLOWED_STEPS:
            await wait_for_hitl_decision(workflow_id, step)
        
        store_result(workflow_id, step, result)
    
    return workflow_id
```

## WebSocket Events

Real-time updates sent to frontend:

```json
{
  "type": "workflow_update",
  "workflow_id": "1768931613",
  "step": 3,
  "status": "completed",
  "agent": "POAgent",
  "result": {
    "verdict": "AUTO_APPROVE",
    "checks": { }
  }
}
```

## Mock Mode

For development without AWS:

```bash
$env:USE_MOCK_AGENTS="true"
```

Mock responses return realistic data based on input context, allowing full workflow testing without Bedrock API calls.

## Agent File Locations

```
backend/app/agents/
├── __init__.py
├── base_agent.py           # BedrockAgent base class
├── requisition_agent.py    # Step 1: Requisition validation
├── approval_agent.py       # Step 2: Approval routing
├── po_agent.py             # Step 3: PO generation
├── receiving_agent.py      # Step 4: Goods receipt
├── invoice_agent.py        # Step 5: Invoice/3-way match
├── fraud_agent.py          # Step 6: Fraud detection
├── compliance_agent.py     # Step 7: Compliance check
└── payment_agent.py        # Step 9: Payment execution
```

## Configuration

Agent behavior can be configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_MOCK_AGENTS` | `false` | Use mock responses instead of Bedrock |
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock |
| `BEDROCK_MODEL_ID` | `amazon.nova-pro-v1:0` | Model to use |
| `AGENT_TIMEOUT` | `30` | Seconds before agent timeout |
| `MAX_RETRIES` | `3` | Retry attempts on failure |
