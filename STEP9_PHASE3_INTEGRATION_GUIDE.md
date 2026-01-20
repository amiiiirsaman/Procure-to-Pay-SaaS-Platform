# Step 9: Phase 3 Integration Guide

**Quick Reference for Adding Agent Buttons to Views**

---

## Pattern: Adding Agent Buttons to Any View

### 1. Import Required Components

```typescript
import { AgentButton, AgentResultModal } from '../components/agents';
import { 
  validateRequisition,
  determineApprovalChain,
  generatePO,
  processReceipt,
  validateInvoice,
  analyzeFraud,
  checkCompliance
} from '../utils/api';
```

### 2. Add State Management

```typescript
const [agentResults, setAgentResults] = useState<Record<number, any>>({});
const [selectedDocForModal, setSelectedDocForModal] = useState<Document | null>(null);
```

### 3. Add Button in Table/List

```typescript
<button
  onClick={() => {
    const result = validateRequisition(doc.id);
    result.then(res => {
      setAgentResults({ ...agentResults, [doc.id]: res });
      setSelectedDocForModal(doc);
    });
  }}
  className="btn-icon btn-ghost text-blue-600 hover:bg-blue-50"
  title="Validate with Agent"
>
  ✓
</button>
```

### 4. Add Modal Display

```typescript
{selectedDocForModal && agentResults[selectedDocForModal.id] && (
  <AgentResultModal
    isOpen={true}
    agentName="RequisitionAgent"
    agentLabel="Validation Complete"
    status={agentResults[selectedDocForModal.id].status}
    result={agentResults[selectedDocForModal.id].result}
    notes={agentResults[selectedDocForModal.id].notes || []}
    flagged={agentResults[selectedDocForModal.id].flagged || false}
    flagReason={agentResults[selectedDocForModal.id].flag_reason}
    onClose={() => setSelectedDocForModal(null)}
  />
)}
```

---

## View-Specific Integration Points

### PurchaseOrdersView
**Agent**: POAgent (generatePO)
**Location**: After requisition is approved
**Button Label**: "Generate PO"
**Status Filter**: PENDING_PO

```typescript
// Import
import { generatePO } from '../utils/api';

// Button
<button
  onClick={() => {
    generatePO(req.id).then(res => {
      setAgentResults({ ...agentResults, [req.id]: res });
      setSelectedReqForModal(req);
      loadRequisitions(); // Refresh to show generated PO
    });
  }}
  className="btn-sm btn-primary"
  title="Generate Purchase Order"
>
  Generate PO
</button>
```

### InvoicesView
**Agents**: InvoiceAgent (validateInvoice), FraudAgent (analyzeFraud)
**Location**: Invoice list and detail view
**Buttons**: "Validate" and "Check Fraud"
**Status Filter**: PENDING_VALIDATION

```typescript
// Validation button
<button
  onClick={() => {
    validateInvoice(inv.id).then(res => {
      setAgentResults({ ...agentResults, [inv.id]: res });
      setSelectedInvForModal(inv);
    });
  }}
  className="btn-sm btn-blue"
>
  Validate
</button>

// Fraud analysis button
<button
  onClick={() => {
    analyzeFraud(inv.id, 'invoice').then(res => {
      setAgentResults({ ...agentResults, [inv.id]: res });
      setSelectedInvForModal(inv);
    });
  }}
  className="btn-sm btn-warning"
>
  Check Fraud
</button>
```

### ApprovalsView
**Agent**: ApprovalAgent (determineApprovalChain)
**Location**: After requisition submitted
**Button Label**: "Determine Chain"
**Status**: PENDING_APPROVAL

```typescript
// Import
import { determineApprovalChain } from '../utils/api';

// Button
<button
  onClick={() => {
    determineApprovalChain(req.id, 'requisition').then(res => {
      setAgentResults({ ...agentResults, [req.id]: res });
      setSelectedReqForModal(req);
    });
  }}
  className="btn-sm btn-primary"
>
  Determine Chain
</button>
```

### GoodsReceiptsView
**Agent**: ReceivingAgent (processReceipt)
**Location**: After PO received
**Button Label**: "Process Receipt"
**Status**: PENDING_RECEIVING

```typescript
// Import
import { processReceipt } from '../utils/api';

// Button
<button
  onClick={() => {
    processReceipt(gr.id).then(res => {
      setAgentResults({ ...agentResults, [gr.id]: res });
      setSelectedGrForModal(gr);
      loadReceipts(); // Refresh
    });
  }}
  className="btn-sm btn-primary"
>
  Process
</button>
```

### ComplianceView
**Agent**: ComplianceAgent (checkCompliance)
**Location**: Document review section
**Button Label**: "Check Compliance"
**Status**: All documents

```typescript
// Import
import { checkCompliance } from '../utils/api';

// Button
<button
  onClick={() => {
    checkCompliance(doc.id, doc.type).then(res => {
      setAgentResults({ ...agentResults, [doc.id]: res });
      setSelectedDocForModal(doc);
    });
  }}
  className="btn-sm btn-primary"
>
  Check
</button>
```

---

## Component Usage Patterns

### Pattern 1: Simple List with Agent Action

```typescript
// For lists of documents
<table>
  <tbody>
    {documents.map(doc => (
      <tr key={doc.id}>
        <td>{doc.title}</td>
        <td>{doc.status}</td>
        <td>
          <AgentButton
            agentName={agentType}
            agentLabel="Validate"
            onTrigger={() => apiFunction(doc.id)}
            size="sm"
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Pattern 2: Detail View with Results

```typescript
// For single document detail view
<div className="document-detail">
  <div className="document-info">
    {/* Document details */}
  </div>
  
  <div className="agent-actions">
    <h3>Agent Analysis</h3>
    <AgentButton
      agentName="fraud"
      agentLabel="Analyze Fraud Risk"
      onTrigger={() => analyzeFraud(docId)}
    />
  </div>
  
  {agentResult && (
    <AgentResultModal
      isOpen={true}
      agentName={agentResult.agent_name}
      agentLabel="Fraud Analysis"
      status={agentResult.status}
      result={agentResult.result}
      notes={agentResult.notes}
      flagged={agentResult.flagged}
      flagReason={agentResult.flag_reason}
      onClose={() => setAgentResult(null)}
    />
  )}
</div>
```

### Pattern 3: Inline Status

```typescript
// For showing agent-flagged documents
{document.flagged_by_agents && (
  <FlagAlert
    flagged={true}
    flagReason={document.flag_reason}
    agentName={document.flagged_agent}
    severity="critical"
  />
)}
```

---

## Common Patterns

### Trigger and Refresh

```typescript
onClick={() => {
  validateRequisition(id).then(res => {
    setAgentResults({ ...agentResults, [id]: res });
    setSelectedDoc(doc);
    loadData(); // Refresh list
  });
}}
```

### Conditional Display

```typescript
{doc.status === 'PENDING_APPROVAL' && (
  <AgentButton
    agentName="approval"
    agentLabel="Determine Chain"
    onTrigger={() => determineApprovalChain(doc.id)}
  />
)}
```

### Multiple Agents

```typescript
<div className="flex gap-2">
  <AgentButton
    agentName="invoice"
    agentLabel="Validate"
    onTrigger={() => validateInvoice(doc.id)}
  />
  <AgentButton
    agentName="fraud"
    agentLabel="Fraud Check"
    onTrigger={() => analyzeFraud(doc.id)}
  />
  <AgentButton
    agentName="compliance"
    agentLabel="Compliance"
    onTrigger={() => checkCompliance(doc.id)}
  />
</div>
```

---

## Response Handling

### Success Response

```typescript
{
  "agent_name": "RequisitionAgent",
  "status": "success",
  "result": { /* agent-specific data */ },
  "notes": [
    { "timestamp": "2024-01-01T12:00:00Z", "note": "Validation passed" }
  ],
  "flagged": false
}
```

### Flagged Response

```typescript
{
  "agent_name": "FraudAgent",
  "status": "success",
  "result": { "risk_score": 0.85 },
  "notes": [...],
  "flagged": true,
  "flag_reason": "High fraud risk detected: unusual supplier"
}
```

### Error Response

```typescript
{
  "agent_name": "RequisitionAgent",
  "status": "error",
  "result": null,
  "notes": [],
  "flagged": false
}
```

---

## Tips & Best Practices

1. **Always Set Document Before Modal**
   - Set `selectedDoc` before or with `agentResults`
   - Makes modal opening smoother

2. **Auto-refresh After Success**
   - Call `loadData()` after agent completes
   - Updates document status if agent made changes

3. **Show Loading State**
   - `AgentButton` shows spinner automatically
   - Disable other actions during processing

4. **Handle Flags Prominently**
   - Always show flag alerts to users
   - Consider disabling subsequent actions if flagged

5. **Batch Multiple Agents**
   - Don't call agents sequentially
   - Use Promise.all for multiple documents

6. **Clear on Unmount**
   - Clear `agentResults` when view unmounts
   - Prevents stale results on re-render

---

## Testing the Integration

### 1. Basic Test
```typescript
// Should show button
const button = screen.getByTitle('Validate with Agent');
expect(button).toBeInTheDocument();

// Should trigger agent
fireEvent.click(button);
await waitFor(() => {
  expect(mockAgent).toHaveBeenCalledWith(docId);
});
```

### 2. Modal Test
```typescript
// Modal should open with results
await waitFor(() => {
  expect(screen.getByText('Validation Complete')).toBeInTheDocument();
});

// Should display result
expect(screen.getByText(result.result)).toBeInTheDocument();
```

### 3. Flag Test
```typescript
// Flagged response should show alert
if (result.flagged) {
  expect(screen.getByText(result.flag_reason)).toBeInTheDocument();
}
```

---

## Files Ready for Integration

- ✅ RequisitionsView - **DONE** (example implementation)
- ⏳ PurchaseOrdersView
- ⏳ InvoicesView
- ⏳ ApprovalsView
- ⏳ GoodsReceiptsView
- ⏳ ComplianceView

---

## Time Estimate

- Per view: 15-20 minutes
- All 5 remaining views: ~90 minutes
- Total Phase 3: **~2 hours**

---

**Reference**: See `RequisitionsView.tsx` for a complete working example.
