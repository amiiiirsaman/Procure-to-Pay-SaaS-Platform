# Procure-to-Pay (P2P) SaaS Platform

An enterprise-grade procurement automation platform featuring a 9-step AI-powered workflow with AWS Bedrock Nova Pro agents.

![P2P Platform](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-FF9900?style=flat&logo=amazon-aws&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## Overview

This platform automates the complete procure-to-pay lifecycle using AI agents for intelligent decision-making:

**Requisition → Approval → PO → Goods Receipt → Invoice → Fraud Detection → Compliance → Final Approval → Payment**

Each step is powered by a specialized AI agent that performs validation, risk assessment, and provides recommendations. Human-in-the-loop (HITL) checkpoints ensure oversight at critical decision points.

## Key Features

- **9-Step Automated Workflow** — End-to-end procurement automation
- **AI-Powered Agents** — AWS Bedrock Nova Pro for intelligent processing
- **Real-Time Updates** — WebSocket integration for live status tracking
- **Human-in-the-Loop** — HITL controls at steps 2, 3, 4, 5, and 8
- **3D Procurement Graph** — Force-directed visualization of document relationships
- **Fraud Detection** — AI-driven analysis for duplicate invoices, split transactions, shell companies
- **Compliance Engine** — SOD matrix enforcement, approval chain validation
- **Modern React UI** — Responsive dashboard with TailwindCSS

## Tech Stack

### Backend
| Technology | Version |
|------------|---------|
| FastAPI | 0.111+ |
| SQLAlchemy | 2.0+ |
| LangChain | 0.2+ |
| LangGraph | 0.2+ |
| AWS Bedrock | Nova Pro v1 |
| Python | 3.10+ |

### Frontend
| Technology | Version |
|------------|---------|
| React | 19.2+ |
| TypeScript | 5.9+ |
| Vite | 7.2+ |
| TailwindCSS | 3.4+ |
| React Router | 6.22+ |
| Recharts | 2.12+ |
| React Force Graph 3D | 1.29+ |

### Database
- **Development**: SQLite
- **Production**: PostgreSQL 15

## Project Structure

```
Procure_to_Pay_(P2P)_SaaS_Platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── ws_manager.py        # WebSocket manager
│   │   │
│   │   ├── agents/              # AI Agents
│   │   │   ├── base_agent.py        # BedrockAgent base class
│   │   │   ├── requisition_agent.py # Step 1
│   │   │   ├── approval_agent.py    # Step 2
│   │   │   ├── po_agent.py          # Step 3
│   │   │   ├── receiving_agent.py   # Step 4
│   │   │   ├── invoice_agent.py     # Step 5
│   │   │   ├── fraud_agent.py       # Step 6
│   │   │   ├── compliance_agent.py  # Step 7
│   │   │   └── payment_agent.py     # Step 9
│   │   │
│   │   ├── api/
│   │   │   ├── routes.py            # API endpoints
│   │   │   ├── schemas.py           # Pydantic schemas
│   │   │   └── agent_field_utils.py # Agent utilities
│   │   │
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── requisition.py
│   │   │   ├── purchase_order.py
│   │   │   ├── goods_receipt.py
│   │   │   ├── invoice.py
│   │   │   ├── supplier.py
│   │   │   └── ...
│   │   │
│   │   └── orchestrator/        # LangGraph workflow
│   │       ├── workflow.py          # P2POrchestrator
│   │       └── state.py             # Workflow state
│   │
│   ├── requirements.txt
│   └── p2p_platform.db          # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   ├── types.ts             # TypeScript interfaces
│   │   │
│   │   ├── components/
│   │   │   ├── agents/          # Agent UI components
│   │   │   │   ├── AgentButton.tsx
│   │   │   │   ├── AgentHealthPanel.tsx
│   │   │   │   ├── AgentResultModal.tsx
│   │   │   │   ├── AgentStatusBadge.tsx
│   │   │   │   ├── FlagAlert.tsx
│   │   │   │   └── RecommendationsList.tsx
│   │   │   │
│   │   │   ├── common/          # Reusable components
│   │   │   │   ├── Badges.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   │
│   │   │   ├── layout/          # Layout components
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   │
│   │   │   ├── EnhancedWorkflowFlow.tsx
│   │   │   ├── RequisitionForm.tsx
│   │   │   ├── RequisitionChatbot.tsx
│   │   │   ├── WorkflowTracker.tsx
│   │   │   └── ...
│   │   │
│   │   ├── views/               # Page views
│   │   │   ├── AutomationView.tsx       # 9-step workflow UI
│   │   │   ├── DashboardView.tsx
│   │   │   ├── RequisitionsView.tsx
│   │   │   ├── PurchaseOrdersView.tsx
│   │   │   ├── GoodsReceiptsView.tsx
│   │   │   ├── InvoicesView.tsx
│   │   │   ├── PaymentsView.tsx
│   │   │   ├── SuppliersView.tsx
│   │   │   ├── ComplianceView.tsx
│   │   │   ├── ApprovalsView.tsx
│   │   │   ├── ProcurementGraphView.tsx # 3D visualization
│   │   │   └── ...
│   │   │
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts      # Real-time updates
│   │   │
│   │   ├── utils/
│   │   │   ├── api.ts               # API client
│   │   │   └── formatters.ts        # Data formatting
│   │   │
│   │   └── constants/
│   │       └── workflow.ts          # Workflow definitions
│   │
│   ├── e2e/                     # Playwright E2E tests
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── docker-compose.yml           # PostgreSQL setup
```

## Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- AWS account with Bedrock access (us-east-1)

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Environment Configuration

Create `backend/.env`:

```env
ENVIRONMENT=development
DATABASE_URL=sqlite:///./p2p_platform.db
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
USE_MOCK_AGENTS=false
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
DEBUG=true
```

## Running the Application

### Start Backend

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend

```bash
cd frontend
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 9-Step Workflow

| Step | Name | Agent | HITL |
|------|------|-------|------|
| 1 | Requisition Validation | RequisitionAgent | — |
| 2 | Approval Check | ApprovalAgent | ✓ |
| 3 | PO Generation | POAgent | ✓ |
| 4 | Goods Receipt | ReceivingAgent | ✓ |
| 5 | Invoice Validation | InvoiceAgent | ✓ |
| 6 | Fraud Analysis | FraudAgent | — |
| 7 | Compliance Check | ComplianceAgent | — |
| 8 | Final Approval | Manual | ✓ (Required) |
| 9 | Payment | PaymentAgent | — |

## API Endpoints

### Workflow
```
POST /api/v1/agents/workflow/run          # Run workflow
GET  /api/v1/agents/workflow/status/{id}  # Get status
POST /api/v1/agents/workflow/{id}/hitl    # HITL decision
```

### Agents
```
POST /api/v1/agents/requisition/validate
POST /api/v1/agents/approval/chain
POST /api/v1/agents/po/generate
POST /api/v1/agents/receiving/process
POST /api/v1/agents/invoice/validate
POST /api/v1/agents/fraud/analyze
POST /api/v1/agents/compliance/check
```

### Resources
```
GET/POST   /api/v1/requisitions
GET/POST   /api/v1/purchase-orders
GET/POST   /api/v1/goods-receipts
GET/POST   /api/v1/invoices
GET/POST   /api/v1/suppliers
GET        /api/v1/dashboard/metrics
```

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test        # Unit tests (Vitest)
npm run e2e         # E2E tests (Playwright)
```

## Docker Deployment

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database on port 5432
- Backend API on port 8000

## Mock Mode

For development without AWS credentials:

```bash
# Windows
$env:USE_MOCK_AGENTS="true"
uvicorn app.main:app --reload

# Linux/Mac
USE_MOCK_AGENTS=true uvicorn app.main:app --reload
```

## License

MIT License
