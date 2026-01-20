# Step 8: API Integration Quick Reference

## 🚀 Quick Start

All agent endpoints are now available at `/agents` base path.

## 📋 Endpoint Summary

### Requisition Agent
```http
POST /agents/requisition/validate
Content-Type: application/json

{
  "document_type": "requisition",
  "document_id": "req-001"
}
```
**Purpose**: Validate requisition details and compliance  
**Returns**: Validation status, recommendations, flags

### Approval Agent
```http
POST /agents/approval/determine-chain
Content-Type: application/json

{
  "document_type": "requisition",
  "document_id": "req-001"
}
```
**Purpose**: Determine approval chain for document  
**Supports**: requisition, po, invoice  
**Returns**: Approval steps, tier, recommendations

### PO Agent
```http
POST /agents/po/generate
Content-Type: application/json

{
  "document_type": "requisition",
  "document_id": "req-001"
}
```
**Purpose**: Generate purchase order  
**Returns**: PO details, supplier selection, consolidation

### Receiving Agent
```http
POST /agents/receiving/process
Content-Type: application/json

{
  "document_type": "goods_receipt",
  "document_id": "gr-001"
}
```
**Purpose**: Process goods receipt  
**Returns**: Receipt status, discrepancies, quality flags

### Invoice Agent
```http
POST /agents/invoice/validate
Content-Type: application/json

{
  "document_type": "invoice",
  "document_id": "inv-001"
}
```
**Purpose**: Validate invoice (3-way match)  
**Returns**: Match status, exceptions, payment recommendations

### Fraud Agent
```http
POST /agents/fraud/analyze
Content-Type: application/json

{
  "document_type": "invoice",
  "document_id": "inv-001"
}
```
**Purpose**: Analyze transaction for fraud risk  
**Returns**: Risk score, risk level, flags, actions

### Compliance Agent
```http
POST /agents/compliance/check
Content-Type: application/json

{
  "document_type": "invoice",
  "document_id": "inv-001"
}
```
**Purpose**: Check compliance requirements  
**Supports**: invoice, requisition, po  
**Returns**: Compliance status, issues, recommendations

### Health Check
```http
GET /agents/health
```
**Purpose**: Check health of all agents  
**Returns**: Service status, individual agent status, timestamp

## 📊 Response Format (All Endpoints)

```json
{
  "agent_name": "requisition",
  "status": "completed",
  "result": {
    "status": "needs_review",
    "flagged": false,
    "recommendations": [...]
  },
  "notes": ["Requisition validated successfully"],
  "flagged": false,
  "flag_reason": null
}
```

## ⚠️ Error Responses

### Document Not Found (404)
```json
{
  "detail": "Requisition with ID req-001 not found"
}
```

### Server Error (500)
```json
{
  "detail": "Requisition validation failed: error message"
}
```

## 🔑 Key Features

- **Automatic Database Lookup**: Document ID is fetched from database
- **Agent Result Storage**: Results automatically saved to AgentNote
- **Error Handling**: Detailed error messages for troubleshooting
- **Type Safety**: Pydantic validation on all requests
- **Health Monitoring**: Check agent availability anytime

## 💡 Usage Examples

### Example 1: Validate Requisition
```bash
curl -X POST http://localhost:8000/agents/requisition/validate \
  -H "Content-Type: application/json" \
  -d '{
    "document_type": "requisition",
    "document_id": "req-001"
  }'
```

### Example 2: Determine Approval Chain
```bash
curl -X POST http://localhost:8000/agents/approval/determine-chain \
  -H "Content-Type: application/json" \
  -d '{
    "document_type": "requisition",
    "document_id": "req-001"
  }'
```

### Example 3: Check Agent Health
```bash
curl -X GET http://localhost:8000/agents/health
```

## 🔗 Integration with Database

All endpoints:
1. Query document from database
2. Execute agent
3. Store result in AgentNote
4. Return result to client

**No manual database updates needed!**

## 🎯 Common Use Cases

### Create Requisition
1. POST `/requisitions` (create)
2. POST `/agents/requisition/validate` (validate)
3. POST `/agents/approval/determine-chain` (get approvers)

### Approve & Create PO
1. POST `/approvals` (approve)
2. POST `/agents/po/generate` (generate)

### Receive Goods
1. POST `/goods-receipts` (create)
2. POST `/agents/receiving/process` (process)

### Process Invoice
1. POST `/invoices` (create)
2. POST `/agents/invoice/validate` (validate)
3. POST `/agents/fraud/analyze` (analyze)
4. POST `/agents/compliance/check` (check)

## 📚 Document Types Supported

| Document Type | Used By |
|---------------|---------|
| requisition | Requisition, Approval agents |
| po | Approval, Receiving agents |
| goods_receipt | Receiving agent |
| invoice | Invoice, Fraud, Compliance agents |

## ✅ Validation Rules

- Document ID required
- Document type required
- Document must exist in database
- Agent must initialize successfully

## 🚀 Performance Tips

1. **Batch Operations**: Call endpoints sequentially as needed
2. **Caching**: Store results locally if calling repeatedly
3. **Health Check**: Use health endpoint to verify service before processing
4. **Error Handling**: Always check for error status in response

## 🔄 Workflow Example

```python
# Python example
import requests

BASE_URL = "http://localhost:8000"

# 1. Check health
health = requests.get(f"{BASE_URL}/agents/health").json()
print(f"Service status: {health['status']}")

# 2. Validate requisition
result = requests.post(
    f"{BASE_URL}/agents/requisition/validate",
    json={"document_type": "requisition", "document_id": "req-001"}
).json()
print(f"Validation: {result['status']}")

# 3. Determine approvals
approvals = requests.post(
    f"{BASE_URL}/agents/approval/determine-chain",
    json={"document_type": "requisition", "document_id": "req-001"}
).json()
print(f"Approvals needed: {len(approvals['result'].get('approval_chain', []))}")
```

## 🆘 Troubleshooting

### Agent Returns "Unhealthy"
- Check agent imports
- Verify Bedrock connectivity
- Check agent configuration

### Document Not Found
- Verify document ID exists
- Check document type is correct
- Ensure document is in database

### Agent Execution Failed
- Check detailed error message
- Review agent logs
- Verify input document format

---

**For Full Details**: See [STEP8_COMPLETION_REPORT.md](STEP8_COMPLETION_REPORT.md)  
**API Status**: ✅ Production Ready
