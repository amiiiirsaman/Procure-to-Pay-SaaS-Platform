# Phase 3 Step 6: Full E2E Workflow Execution & Validation

## Objective
Validate complete workflows from requisition creation through payment, including WebSocket events and real-time UI updates.

## Workflow Paths to Validate

### Path 1: Happy Path - Complete P2P Cycle
```
1. Create Requisition (DRAFT)
   ↓ POST /requisitions/
   ↓ Event: workflow_created
   ↓
2. Submit Requisition (PENDING_APPROVAL)
   ↓ POST /requisitions/{id}/submit
   ↓ Event: status_changed
   ↓
3. Create Purchase Order (APPROVED)
   ↓ POST /purchase-orders/
   ↓ Event: po_created
   ↓
4. Send Purchase Order (ORDERED)
   ↓ POST /purchase-orders/{id}/send
   ↓ Event: po_sent
   ↓
5. Confirm Goods Receipt (RECEIVED)
   ↓ POST /goods-receipts/{po_id}/confirm
   ↓ Event: goods_received
   ↓
6. Create Invoice (PENDING_APPROVAL)
   ↓ POST /invoices/
   ↓ Event: invoice_created
   ↓
7. Get Final Approval Report
   ↓ GET /invoices/{id}/final-approval-report
   ↓ Report with recommendation
   ↓
8. Approve Invoice (FINAL_APPROVED)
   ↓ POST /invoices/{id}/final-approve (action: approve)
   ↓ Event: invoice_finalized
   ↓
9. Create Payment (PAID)
   ↓ POST /payments/
   ↓ Invoice marked as PAID
```

**Expected Outcomes:**
- 8 WebSocket events broadcast
- Database records created and updated
- All status transitions correct
- Real-time UI updates received

---

### Path 2: HITL Approval Workflow
```
1. Create Requisition (DRAFT)
   ↓
2. Submit Requisition (PENDING_APPROVAL)
   ↓
3. Flag Requisition for Review (UNDER_REVIEW)
   ↓ POST /requisitions/{id}/flag
   ↓ Agent creates AgentNote
   ↓
4. Human Review Decision
   ├─ Approve: POST /requisitions/{id}/approve → APPROVED
   └─ Reject: POST /requisitions/{id}/reject → REJECTED
   ↓
5. Continue to PO/Invoice (if approved)
```

**Expected Outcomes:**
- Requisition transitions to UNDER_REVIEW
- AgentNote and AuditLog records created
- Human decision properly recorded
- Correct downstream processing

---

### Path 3: Invoice Rejection Workflow
```
1. Complete steps 1-6 from Path 1
   ↓
2. Approve Invoice or Reject Invoice
   ├─ Reject: POST /invoices/{id}/final-approve (action: reject)
   │  ↓
   │  ↓ Invoice status → REJECTED
   │  ↓
   │  ↓ Event: invoice_finalized (payment_scheduled: false)
   │  ↓
   │  ↓ No payment created
   └─
```

**Expected Outcomes:**
- Invoice marked as REJECTED
- No payment scheduled
- Event includes payment_scheduled: false
- Audit trail complete

---

### Path 4: Override Approval
```
1. Complete invoice processing with flags/concerns
   ↓
2. System recommends: REJECT or REVIEW_REQUIRED
   ↓
3. Approver chooses: APPROVE with override_reason
   ↓ POST /invoices/{id}/final-approve
   ├─ action: approve
   ├─ override_reason: "Business justification..."
   └─ comments: "Approving despite concerns"
   ↓
4. Invoice approved with override recorded
   ↓ Event: invoice_finalized (override_reason in audit log)
```

**Expected Outcomes:**
- Override reason captured in AuditLog
- Invoice marked FINAL_APPROVED
- Payment scheduled despite recommendation
- Clear audit trail of override

---

## WebSocket Event Validation

### Event 1: workflow_created (Requisition)
**Trigger:** POST /requisitions/
**Payload:**
```json
{
  "event_type": "workflow_created",
  "document_type": "requisition",
  "document_id": 1,
  "document_number": "REQ-000001",
  "status": "draft",
  "total_amount": 5000.0,
  "urgency": "normal",
  "timestamp": "2026-01-13T10:30:00",
  "message": "Requisition REQ-000001 created and ready for submission"
}
```
**Frontend Handler:** 
- RequisitionDetailView receives event
- Updates status badge
- Shows in AgentActivityFeed

---

### Event 2: status_changed (Requisition)
**Trigger:** POST /requisitions/{id}/submit
**Payload:**
```json
{
  "event_type": "status_changed",
  "document_type": "requisition",
  "document_id": 1,
  "document_number": "REQ-000001",
  "previous_status": "draft",
  "new_status": "pending_approval",
  "timestamp": "2026-01-13T10:31:00",
  "message": "Requisition REQ-000001 submitted for approval"
}
```
**Frontend Handler:**
- WorkflowTracker updates stage
- AgentActivityFeed logs event
- Navigation updates lists

---

### Event 3: po_created (Purchase Order)
**Trigger:** POST /purchase-orders/
**Payload:**
```json
{
  "event_type": "po_created",
  "document_type": "po",
  "document_id": 1,
  "document_number": "PO-000001",
  "supplier_id": "supplier1",
  "supplier_name": "TechCorp Inc.",
  "status": "draft",
  "total_amount": 5000.0,
  "timestamp": "2026-01-13T10:32:00",
  "message": "Purchase Order PO-000001 created for supplier TechCorp Inc."
}
```
**Frontend Handler:**
- PODetailView displays PO
- Shows supplier info
- Enables Send action

---

### Event 4: po_sent (Purchase Order)
**Trigger:** POST /purchase-orders/{id}/send
**Payload:**
```json
{
  "event_type": "po_sent",
  "document_type": "po",
  "document_id": 1,
  "document_number": "PO-000001",
  "supplier_id": "supplier1",
  "status": "ordered",
  "timestamp": "2026-01-13T10:33:00",
  "message": "Purchase Order PO-000001 sent to supplier"
}
```
**Frontend Handler:**
- Status updates to ORDERED
- WorkflowTracker advances to "Sent" stage
- Disables Send button
- Shows delivery tracking info

---

### Event 5: goods_received (Goods Receipt)
**Trigger:** POST /goods-receipts/{po_id}/confirm
**Payload:**
```json
{
  "event_type": "goods_received",
  "document_type": "goods_receipt",
  "document_id": 1,
  "document_number": "GR-000001",
  "purchase_order_id": 1,
  "purchase_order_number": "PO-000001",
  "status": "received",
  "items_received": 5,
  "items_rejected": 0,
  "all_items_received": true,
  "timestamp": "2026-01-13T10:34:00",
  "message": "Goods Receipt GR-000001 confirmed - All items received"
}
```
**Frontend Handler:**
- GoodsReceiptDetailView displays receipt
- Shows received/rejected breakdown
- Enables "Proceed to Invoice" button
- Updates PurchaseOrdersView status

---

### Event 6: invoice_created (Invoice)
**Trigger:** POST /invoices/
**Payload:**
```json
{
  "event_type": "invoice_created",
  "document_type": "invoice",
  "document_id": 1,
  "document_number": "INV-000001",
  "supplier_id": "supplier1",
  "supplier_name": "TechCorp Inc.",
  "vendor_invoice_number": "TC-INV-12345",
  "status": "pending_approval",
  "total_amount": 5400.0,
  "due_date": "2026-02-12",
  "timestamp": "2026-01-13T10:35:00",
  "message": "Invoice INV-000001 received from TechCorp Inc."
}
```
**Frontend Handler:**
- InvoiceDetailView displays invoice
- Shows line items and amounts
- Loads final approval report
- Enables approval/rejection buttons

---

### Event 7: agent_execution (Agent Completion)
**Trigger:** POST /agents/{agent_name}/run
**Payload (Success):**
```json
{
  "event_type": "agent_execution",
  "agent_name": "requisition",
  "document_type": "requisition",
  "document_id": 1,
  "status": "completed",
  "timestamp": "2026-01-13T10:36:00",
  "flagged": false,
  "flag_reason": null,
  "message": "Requisition agent completed execution"
}
```
**Payload (Error):**
```json
{
  "event_type": "agent_execution",
  "agent_name": "fraud",
  "document_type": "invoice",
  "document_id": 1,
  "status": "error",
  "timestamp": "2026-01-13T10:37:00",
  "error": "Failed to connect to fraud detection service",
  "message": "Fraud agent failed"
}
```
**Frontend Handler:**
- AgentActivityFeed displays agent actions
- Color-codes success vs error
- Shows flag reasons if present
- Updates document flags

---

### Event 8: invoice_finalized (Invoice Approval)
**Trigger:** POST /invoices/{id}/final-approve
**Payload (Approved):**
```json
{
  "event_type": "invoice_finalized",
  "document_type": "invoice",
  "document_id": 1,
  "document_number": "INV-000001",
  "action": "approve",
  "previous_status": "awaiting_final_approval",
  "new_status": "final_approved",
  "approver_id": "approver1",
  "payment_scheduled": true,
  "payment_due_date": "2026-02-12",
  "timestamp": "2026-01-13T10:38:00",
  "message": "Invoice INV-000001 approved for payment"
}
```
**Payload (Rejected):**
```json
{
  "event_type": "invoice_finalized",
  "document_type": "invoice",
  "document_id": 1,
  "document_number": "INV-000001",
  "action": "reject",
  "previous_status": "awaiting_final_approval",
  "new_status": "rejected",
  "approver_id": "approver1",
  "payment_scheduled": false,
  "payment_due_date": null,
  "timestamp": "2026-01-13T10:39:00",
  "message": "Invoice INV-000001 rejected - requires resubmission"
}
```
**Frontend Handler:**
- InvoiceDetailView closes approval modal
- Updates status badge
- Shows payment info (if approved)
- Enables payment creation
- Updates DashboardView metrics

---

## Real-Time UI Update Flows

### Flow 1: Detail View Status Updates
```
WebSocket Event Received
  ↓
useWebSocket hook filters by document ID
  ↓
useEffect triggers on messages
  ↓
Calls GET /{document_type}/{id} to refresh
  ↓
setState updates component
  ↓
Badges, WorkflowTracker, AgentActivityFeed re-render
```

**Validation:** Status changes appear instantly without page refresh

---

### Flow 2: List View Notifications
```
WebSocket Broadcast Event
  ↓
DashboardView/ListView receives via useWebSocket(null)
  ↓
Updates document counts and metrics
  ↓
Refreshes table data if filtering matches
  ↓
Shows toast notifications for important events
```

**Validation:** List views show new items immediately

---

### Flow 3: Cross-Document Synchronization
```
Invoice Event Received
  ↓
Checks if related PO subscribed
  ↓
Updates PO status in real-time
  ↓
Updates Requisition status
  ↓
All related views show consistent state
```

**Validation:** Navigating between related documents shows synchronized states

---

## Validation Checklist

### ✓ Database Integrity
- [ ] Requisition created with all line items
- [ ] PO created with correct supplier and amounts
- [ ] GoodsReceipt created with line item mappings
- [ ] Invoice created with GL accounts and cost centers
- [ ] All foreign keys are valid
- [ ] Status transitions are valid per DocumentStatus enum
- [ ] Audit logs created for all major operations
- [ ] Agent notes recorded for agent executions

### ✓ API Response Validation
- [ ] All POST endpoints return 201 status
- [ ] All GET endpoints return 200 status
- [ ] Response bodies contain expected fields
- [ ] Field types match schema definitions
- [ ] Amounts are calculated correctly
- [ ] Dates are formatted properly (ISO 8601)
- [ ] Enum values match defined constants
- [ ] Error responses include detail messages

### ✓ WebSocket Event Flow
- [ ] Event emitted immediately after resource creation
- [ ] Event JSON is valid
- [ ] Required fields present in payload
- [ ] Timestamps are current
- [ ] Document IDs correct
- [ ] Related resource IDs included where applicable
- [ ] All 8 event types broadcast at correct times
- [ ] Broadcast reaches all connected clients

### ✓ Frontend Real-Time Updates
- [ ] Detail views receive and process events
- [ ] Status badges update without refresh
- [ ] WorkflowTracker stages advance correctly
- [ ] AgentActivityFeed shows all events
- [ ] List views update when new items created
- [ ] Modal dialogs reflect server state
- [ ] Navigation links work with updated data
- [ ] Error states display properly

### ✓ Business Logic
- [ ] High-value requisitions trigger approval flags
- [ ] Approval chains determined correctly
- [ ] 3-way match validates correctly
- [ ] Fraud scores calculated
- [ ] Compliance checks enforced
- [ ] Override reasons recorded
- [ ] Payment scheduling only when approved
- [ ] Agent notes linked to correct documents

---

## Manual Test Scenarios

### Scenario 1: Quick Happy Path (15 minutes)
1. Create requisition with 1-2 line items ($500)
2. Submit and watch status update
3. Create PO immediately
4. Confirm goods receipt (full receipt)
5. Create invoice matching PO
6. Review approval report
7. Approve invoice
8. Create payment
**Validation:** All 8 events broadcast, UI stays in sync, data integrity maintained

### Scenario 2: HITL Approval (10 minutes)
1. Create high-value requisition ($150,000)
2. Submit and verify UNDER_REVIEW status
3. Try to approve without override_reason (should fail)
4. Approve with override_reason
5. Verify approval recorded in audit log
**Validation:** HITL workflow enforced, override captured

### Scenario 3: Rejection Workflow (10 minutes)
1. Create and process requisition through invoice
2. Check final approval report recommendations
3. Reject invoice with specific reason
4. Verify status is REJECTED
5. Try to create payment (should fail)
**Validation:** Rejection enforced, no payment created, audit trail complete

### Scenario 4: Partial Receipt (10 minutes)
1. Create requisition for 10 items
2. Create PO
3. Confirm receipt with only 8 items, 2 rejected
4. Verify GR shows partial receipt
5. Verify PO status is PARTIALLY_RECEIVED
6. Try to create invoice (should work, but with notes)
**Validation:** Partial receipts handled correctly, invoice can still proceed

### Scenario 5: WebSocket Synchronization (10 minutes)
1. Open two browser tabs to same requisition
2. In Tab A, change requisition status
3. Watch Tab B update in real-time
4. Open related PO in another tab
5. Verify all show consistent state
**Validation:** WebSocket events reach all clients, state synchronized

---

## Performance Validation

### Response Time Targets
- POST /requisitions: < 200ms
- POST /purchase-orders: < 200ms
- POST /invoices: < 300ms
- GET /invoices/{id}/final-approval-report: < 500ms
- POST /invoices/{id}/final-approve: < 300ms
- POST /payments: < 200ms

### WebSocket Metrics
- Event broadcast latency: < 100ms
- UI update lag: < 500ms
- Max concurrent connections: >= 50
- Message queue depth: stable

---

## Known Issues / Edge Cases

### Edge Case 1: Currency/Rounding
**Status:** ✓ Handled
- All amounts use Decimal for precision
- Tax calculations checked
- Variance thresholds configurable

### Edge Case 2: Concurrent Updates
**Status:** ⚠️ Needs testing
- Multiple users editing same document
- PO and Invoice creation race conditions
- Database locks for critical operations

### Edge Case 3: Network Outages
**Status:** ⚠️ Needs testing
- WebSocket reconnection handling
- Failed event broadcasting
- Frontend state recovery

### Edge Case 4: Large Requisitions
**Status:** ⚠️ Needs testing
- 100+ line items
- Multi-million dollar amounts
- Approval chain complexity

---

## Conclusion

This E2E validation ensures:
1. **Data Integrity:** All records created correctly with valid relationships
2. **Event Flow:** WebSocket events broadcast at correct times with complete payloads
3. **Real-Time UI:** Frontend receives and processes events correctly
4. **Business Rules:** All validations and approvals enforced
5. **Audit Trail:** Complete history of all operations
6. **Error Handling:** Graceful failures with meaningful error messages

**Next Step:** Run pytest test suite for automated validation (Step 7)
