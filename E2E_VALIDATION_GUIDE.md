# End-to-End Validation Guide

Complete testing procedures for validating the P2P SaaS Platform.

## Test Environment Setup

### 1. Start Backend (Mock Mode)

```bash
cd backend
.venv\Scripts\activate
$env:USE_MOCK_AGENTS="true"
uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Verify Services

| Check | URL | Expected |
|-------|-----|----------|
| Backend Health | http://localhost:8000/health | `{"status": "healthy"}` |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Frontend | http://localhost:5173 | Dashboard loads |

## Workflow Validation

### Test 1: Complete 9-Step Workflow

**Objective**: Validate all workflow steps execute successfully

1. Navigate to **Automation** view
2. Select requisition from dropdown (e.g., REQ-001)
3. Click **Run Full Workflow**
4. Verify each step completes:

| Step | Expected Status | Agent |
|------|-----------------|-------|
| 1 | ✓ Green checkmark | Requisition |
| 2 | ✓ Green checkmark | Approval |
| 3 | ✓ Green checkmark | PO |
| 4 | ✓ Green checkmark | Goods Receipt |
| 5 | ✓ Green checkmark | Invoice |
| 6 | ✓ Green checkmark | Fraud |
| 7 | ✓ Green checkmark | Compliance |
| 8 | ⏸ Yellow (HITL) | Final Approval |
| 9 | Pending | Payment |

5. Click **Approve** on Step 8
6. Verify Step 9 completes with green checkmark

**Pass Criteria**: All 9 steps show green checkmarks

### Test 2: HITL Rejection Flow

**Objective**: Validate rejection handling

1. Run workflow to Step 8 (Final Approval)
2. Click **Reject** button
3. Enter rejection reason
4. Verify workflow stops with rejection status

**Pass Criteria**: Workflow shows rejected state, no payment executed

### Test 3: Start From Specific Step

**Objective**: Validate `start_from_step` parameter

1. In Automation view, select requisition
2. Use step selector to choose Step 5
3. Click **Run from Step 5**
4. Verify Steps 1-4 show "Skipped" status
5. Verify Steps 5-9 execute

**Pass Criteria**: Only Steps 5-9 execute

### Test 4: Real-Time WebSocket Updates

**Objective**: Validate live status updates

1. Open browser DevTools → Network → WS
2. Run workflow
3. Verify WebSocket messages received for each step
4. Check message format:
```json
{
  "type": "workflow_update",
  "step": 3,
  "status": "completed"
}
```

**Pass Criteria**: WebSocket messages received for all steps

## API Validation

### Test 5: Workflow API

```bash
# Start workflow
curl -X POST http://localhost:8000/api/v1/agents/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"requisition_id": 1768931613, "start_from_step": 1}'

# Check status
curl http://localhost:8000/api/v1/agents/workflow/status/{workflow_id}

# HITL decision
curl -X POST http://localhost:8000/api/v1/agents/workflow/{workflow_id}/hitl \
  -H "Content-Type: application/json" \
  -d '{"step": 8, "decision": "approve"}'
```

**Pass Criteria**: All endpoints return 200 with valid JSON

### Test 6: Individual Agent Endpoints

```bash
# Requisition Agent
curl -X POST http://localhost:8000/api/v1/agents/requisition/validate \
  -H "Content-Type: application/json" \
  -d '{"requisition_id": 1768931613}'

# PO Agent
curl -X POST http://localhost:8000/api/v1/agents/po/generate \
  -H "Content-Type: application/json" \
  -d '{"requisition_id": 1768931613}'
```

**Pass Criteria**: Each agent returns verdict and checks

## UI Component Validation

### Test 7: Dashboard Metrics

1. Navigate to **Dashboard**
2. Verify stat cards display:
   - Total Requisitions
   - Pending Approvals
   - Active POs
   - Payment Volume

**Pass Criteria**: All metrics load with values

### Test 8: Requisition CRUD

1. Navigate to **Requisitions**
2. Click **New Requisition**
3. Fill form and submit
4. Verify requisition appears in list
5. Click requisition to view details
6. Edit requisition
7. Delete requisition

**Pass Criteria**: All CRUD operations succeed

### Test 9: 3D Procurement Graph

1. Navigate to **Procurement Graph**
2. Verify 3D force-directed graph loads
3. Hover over nodes to see tooltips
4. Click and drag to rotate view
5. Zoom in/out with scroll

**Pass Criteria**: Graph renders with document relationships

## Automated Tests

### Backend Unit Tests

```bash
cd backend
pytest -v

# Expected output:
# tests/test_agents.py::test_requisition_agent PASSED
# tests/test_agents.py::test_approval_agent PASSED
# tests/test_api.py::test_workflow_endpoint PASSED
# ...
```

### Frontend Unit Tests

```bash
cd frontend
npm run test

# Expected output:
# ✓ AgentButton renders correctly
# ✓ AgentResultModal displays results
# ✓ WorkflowTracker shows all steps
# ...
```

### E2E Tests (Playwright)

```bash
cd frontend
npx playwright test

# Run specific test file
npx playwright test e2e/requisitions.spec.ts

# Run with UI
npx playwright test --ui
```

## Performance Validation

### Test 10: Workflow Completion Time

| Step | Target Time |
|------|-------------|
| Single Step (Mock) | < 500ms |
| Single Step (Bedrock) | < 5s |
| Full Workflow (Mock) | < 10s |
| Full Workflow (Bedrock) | < 60s |

**Test Command**:
```bash
time curl -X POST http://localhost:8000/api/v1/agents/workflow/run \
  -d '{"requisition_id": 1768931613}'
```

## Error Handling Validation

### Test 11: Invalid Requisition

```bash
curl -X POST http://localhost:8000/api/v1/agents/workflow/run \
  -d '{"requisition_id": 999999}'
```

**Expected**: 404 error with message

### Test 12: Network Failure Recovery

1. Start workflow
2. Stop backend mid-workflow
3. Restart backend
4. Verify frontend shows error state
5. Retry workflow

**Pass Criteria**: Graceful error handling, recovery possible

## Validation Checklist

| # | Test | Status |
|---|------|--------|
| 1 | Complete 9-step workflow | ☐ |
| 2 | HITL rejection flow | ☐ |
| 3 | Start from specific step | ☐ |
| 4 | WebSocket real-time updates | ☐ |
| 5 | Workflow API endpoints | ☐ |
| 6 | Individual agent endpoints | ☐ |
| 7 | Dashboard metrics | ☐ |
| 8 | Requisition CRUD | ☐ |
| 9 | 3D procurement graph | ☐ |
| 10 | Performance targets | ☐ |
| 11 | Invalid requisition handling | ☐ |
| 12 | Network failure recovery | ☐ |

All tests passing indicates the platform is fully operational.
