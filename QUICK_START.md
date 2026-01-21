# Quick Start Guide

Get the P2P SaaS Platform running in under 5 minutes.

## Prerequisites

- Python 3.10+
- Node.js 18+
- Git

## Step 1: Clone & Navigate

```bash
git clone https://github.com/amiiiirsaman/Procure-to-Pay-SaaS-Platform.git
cd Procure-to-Pay-SaaS-Platform
```

## Step 2: Start Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Run with mock agents (no AWS required)
$env:USE_MOCK_AGENTS="true"
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000

## Step 3: Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

## Step 4: Test the Workflow

1. Open http://localhost:5173
2. Navigate to **Automation** in the sidebar
3. Select a requisition from the dropdown
4. Click **Run Full Workflow**
5. Watch all 9 steps execute with AI agent analysis

## Key URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

## Running with Live AWS Bedrock

1. Configure AWS credentials:
```bash
aws configure
```

2. Start backend without mock mode:
```bash
uvicorn app.main:app --reload --port 8000
```

The agents will use AWS Bedrock Nova Pro for real AI processing.

## Available Views

| View | Description |
|------|-------------|
| Dashboard | Overview metrics and statistics |
| Automation | 9-step workflow execution |
| Requisitions | Create and manage purchase requisitions |
| Purchase Orders | View generated POs |
| Goods Receipts | Track received goods |
| Invoices | Process vendor invoices |
| Payments | Payment execution status |
| Suppliers | Vendor management |
| Compliance | Policy adherence tracking |
| Approvals | Pending approval queue |
| Procurement Graph | 3D visualization of document relationships |

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Database issues?**
```bash
# Delete and recreate
rm backend/p2p_platform.db
# Database auto-creates on first run
```

**Frontend dependencies?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Backend dependencies?**
```bash
pip install --upgrade -r requirements.txt
```

## Next Steps

- Read [P2P_AGENT_ARCHITECTURE.md](P2P_AGENT_ARCHITECTURE.md) for technical details
- Follow [E2E_VALIDATION_GUIDE.md](E2E_VALIDATION_GUIDE.md) for testing procedures
