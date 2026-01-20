# P2P SaaS Platform - Quick Start Guide

## Overview
This guide walks you through setting up and running the complete P2P SaaS Platform with backend API, frontend UI, and real-time agent activities.

## Prerequisites
- Python 3.10+
- Node.js 16+
- npm or yarn
- Git
- 5-10 minutes setup time

## Backend Setup

### Step 1: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Initialize Database (Optional - for fresh start)
```bash
python -m scripts.seed_database --reset --users 20 --suppliers 15 --products 50 --requisitions 30
```

This creates realistic test data:
- 20 users with different roles
- 15 suppliers
- 50 products
- 30+ requisitions with related POs, receipts, invoices

### Step 3: Start Backend Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**API Documentation available at:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Frontend Setup

### Step 1: Install Node Dependencies
```bash
cd frontend
npm install
```

### Step 2: Configure API URL (if needed)
Create `.env.local`:
```
REACT_APP_API_URL=http://localhost:8000
```

### Step 3: Start Frontend Development Server
```bash
npm start
```

Application will open at: http://localhost:3000

## Verifying Setup

### 1. Check Backend Health
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "p2p-saas-platform",
  "version": "1.0.0"
}
```

### 2. Check API Documentation
Visit http://localhost:8000/docs and explore the endpoints

### 3. Verify Database
Backend starts, the database is initialized with schema and seed data

### 4. Verify Frontend
- Navigate to http://localhost:3000
- Dashboard should load with sample data
- Navigate through all menu items

## Testing Workflows

### Test 1: View Existing Data
1. Go to Dashboard - see metrics
2. Go to Requisitions - view 30+ requisitions
3. Go to Suppliers - view 15 suppliers
4. Go to Invoices - view processed invoices

### Test 2: Create New Requisition
1. Navigate to Requisitions view
2. Look for "Create Requisition" button (if implemented in view)
3. Or manually test via curl:

```bash
curl -X POST http://localhost:8000/api/v1/requisitions \
  -H "Content-Type: application/json" \
  -d '{
    "requisition_number": "REQ-2024-999",
    "requestor_id": "user1",
    "department": "IT",
    "supplier_id": 1,
    "description": "Test Requisition",
    "total_amount": 5000,
    "urgency": "normal",
    "budget_code": "BC-001",
    "cost_center": "CC-001",
    "line_items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 2500
      }
    ]
  }'
```

### Test 3: Trigger Agent Manually
```bash
curl -X POST http://localhost:8000/api/v1/agents/requisition/run \
  -H "Content-Type: application/json" \
  -d '{
    "document_type": "requisition",
    "document_id": 1
  }'
```

Expected response:
```json
{
  "agent_name": "requisition",
  "status": "completed",
  "result": { ... },
  "notes": ["Requisition agent completed"],
  "flagged": false,
  "flag_reason": null
}
```

### Test 4: WebSocket Connection (Real-time Updates)
```bash
# Install wscat first: npm install -g wscat
wscat -c ws://localhost:8000/ws/workflow/req-1
```

Send heartbeat:
```json
{"type": "ping"}
```

Should receive:
```json
{"type": "pong"}
```

## Available Endpoints

### Dashboard & Analytics
- `GET /api/v1/dashboard/metrics` - Overview metrics
- `GET /api/v1/dashboard/spend-by-category` - Category breakdown
- `GET /api/v1/dashboard/spend-by-vendor` - Vendor breakdown

### Requisitions
- `GET /api/v1/requisitions` - List all (paginated)
- `POST /api/v1/requisitions` - Create new
- `GET /api/v1/requisitions/{id}` - Get details
- `POST /api/v1/requisitions/{id}/submit` - Submit for approval
- `GET /api/v1/requisitions/under-review` - Get flagged items

### Purchase Orders
- `GET /api/v1/purchase-orders` - List all
- `POST /api/v1/purchase-orders` - Create new
- `GET /api/v1/purchase-orders/{id}` - Get details

### Invoices
- `GET /api/v1/invoices` - List all
- `POST /api/v1/invoices` - Create new
- `GET /api/v1/invoices/{id}` - Get details
- `GET /api/v1/invoices/awaiting-final-approval` - For approval

### Agents (Manual Triggers)
- `POST /api/v1/agents/{agent_name}/run` - Trigger agent
- `GET /api/v1/agents/{agent_name}/history` - Agent activity history

Valid agent names: `requisition`, `approval`, `po`, `receiving`, `invoice`, `fraud`, `compliance`

### Audit & Compliance
- `GET /api/v1/audit-logs` - Audit trail
- `GET /api/v1/compliance/metrics` - Compliance status

## Frontend Components

### Main Views
- **Dashboard**: Overview and key metrics
- **Requisitions**: Create and manage requisitions
- **Purchase Orders**: Manage POs
- **Invoices**: Process and track invoices
- **Approvals**: Pending approvals
- **Suppliers**: Supplier management
- **Goods Receipts**: Receipt processing
- **Payments**: Payment tracking
- **Compliance**: Compliance monitoring

### Detail Views
- **RequisitionDetailView** (`/requisitions/:id`):
  - Full requisition information
  - Workflow tracker
  - Agent activity feed
  - Manual agent trigger buttons

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.10+

# Check port 8000 is available
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Frontend won't connect to API
```bash
# Check API is running
curl http://localhost:8000/health

# Check CORS is configured (should be in main.py)
# Verify REACT_APP_API_URL points to correct backend

# Check browser console for errors
# Usually: http://localhost:8000
```

### Database issues
```bash
# Reset database
python -m scripts.seed_database --reset

# Check database file exists
ls -la backend/app/database/p2p.db  # SQLite
# or check PostgreSQL connection if configured
```

### WebSocket connection fails
```bash
# Verify WebSocket route is registered in main.py
# Should have: @app.websocket("/ws/workflow/{workflow_id}")

# Check firewall isn't blocking port 8000
# Test with wscat: wscat -c ws://localhost:8000/ws/workflow/test-1
```

## Common Tasks

### Seed with Different Data Sizes
```bash
# Small test set
python -m scripts.seed_database --users 5 --suppliers 3 --products 10 --requisitions 5

# Medium set (default)
python -m scripts.seed_database --users 20 --suppliers 15 --products 50 --requisitions 30

# Large set for load testing
python -m scripts.seed_database --users 100 --suppliers 50 --products 200 --requisitions 200
```

### Run Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Build Frontend for Production
```bash
cd frontend
npm run build
# Output in: frontend/build/
```

### Access Database Directly (SQLite)
```bash
sqlite3 backend/app/database/p2p.db
> SELECT COUNT(*) FROM requisition;
> SELECT * FROM audit_log LIMIT 5;
```

## Performance Tips

1. **Use Mock Agents** for faster testing (no AWS calls)
   - In orchestrator: `P2POrchestrator(use_mock_agents=True)`

2. **Limit Pagination** to 10-20 items in development
   - Default in API: `skip=0, limit=20`

3. **Browser DevTools**
   - Open DevTools (F12) → Network tab to see API calls
   - Check Console for JavaScript errors

4. **Backend Logs**
   - Watch terminal for detailed request logs
   - Search for agent execution details

## Next Steps

1. **Explore Agent Architecture**
   - Check `backend/app/agents/` for each agent
   - Review `backend/app/orchestrator/workflow.py` for LangGraph setup

2. **Test Complete Workflow**
   - Create requisition → Submit → Trigger agents → Approve → PO → Invoice

3. **Check Real-time Features**
   - Open RequisitionDetailView
   - Trigger agent from button
   - Watch AgentActivityFeed update in real-time

4. **Customize for Your Needs**
   - Update approval thresholds in `backend/app/rules/`
   - Add more suppliers/products in seed script
   - Modify form fields in frontend components

## Support & Documentation

- **API Docs**: http://localhost:8000/docs
- **Source Code**: All files in this repository
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/

## Important Files

### Backend
- `backend/app/main.py` - FastAPI application setup
- `backend/app/api/routes.py` - All API endpoints
- `backend/app/agents/` - AI agent implementations
- `backend/app/orchestrator/workflow.py` - LangGraph workflow
- `backend/app/models/` - Database models

### Frontend
- `frontend/src/App.tsx` - React router setup
- `frontend/src/views/` - Page components
- `frontend/src/components/` - Reusable components
- `frontend/src/utils/api.ts` - API client
- `frontend/src/types.ts` - TypeScript types

## Summary

You now have a fully functional P2P platform with:
✅ Professional UI with real-time updates
✅ Multi-agent orchestration system
✅ Complete API with 40+ endpoints
✅ Database with 100+ sample records
✅ WebSocket support for live collaboration
✅ Type-safe frontend and backend

Start testing and building! 🚀
