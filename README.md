# AI-Powered Procure-to-Pay (P2P) SaaS Platform

## 🎯 Project Overview

This project is a production-ready, multi-agent Procure-to-Pay (P2P) SaaS platform. The system automates the entire procurement lifecycle, from requisition to payment, using a collaborative team of AI agents. The application features a professional FastAPI backend with real-time WebSocket updates and robust, scalable architecture.

### Key Features

- **Multi-Agent Architecture**: 7 specialized agents collaborating to manage the P2P workflow
- **Full P2P Lifecycle Automation**: End-to-end process automation from requisition to invoice payment
- **Real-time Collaboration**: WebSocket-based agent status updates visible to users
- **Fraud Detection**: Integrated AI agent dedicated to identifying and flagging suspicious transactions
- **3-Way Matching**: Automated PO-GR-Invoice matching with configurable tolerances
- **Compliance Controls**: SOD (Separation of Duties) enforcement and audit trail

---

## 🤖 Multi-Agent Architecture

The system is orchestrated by **LangGraph**, managing the state and flow of the P2P process. Each agent uses **AWS Bedrock Nova Pro** as the LLM provider.

| Agent | Role & Responsibilities |
|-------|------------------------|
| **Requisition Agent** | Validates requisitions, suggests products/vendors, checks for duplicates |
| **Approval Agent** | Manages multi-tier approval workflow, routes requests based on amount |
| **PO Agent** | Generates and dispatches Purchase Orders, handles supplier selection |
| **Receiving Agent** | Facilitates goods receipt, flags discrepancies, quality checks |
| **Invoice Agent** | Processes invoices, performs 3-way match against POs and receipts |
| **Fraud Detection Agent** | Monitors transactions for fraudulent patterns using 12+ detection rules |
| **Compliance Agent** | Ensures SOD compliance, maintains audit trail, validates documentation |

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py              # Settings and thresholds
│   ├── database.py            # SQLAlchemy setup
│   ├── main.py                # FastAPI application entry point
│   │
│   ├── models/                # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── enums.py           # Status, role, and type enums
│   │   ├── base.py            # Mixin classes (timestamps, audit)
│   │   ├── user.py
│   │   ├── supplier.py
│   │   ├── product.py
│   │   ├── requisition.py
│   │   ├── purchase_order.py
│   │   ├── goods_receipt.py
│   │   ├── invoice.py
│   │   ├── approval.py
│   │   └── audit.py
│   │
│   ├── agents/                # AI agents
│   │   ├── __init__.py
│   │   ├── base_agent.py      # BedrockAgent base class
│   │   ├── requisition_agent.py
│   │   ├── approval_agent.py
│   │   ├── po_agent.py
│   │   ├── receiving_agent.py
│   │   ├── invoice_agent.py
│   │   ├── fraud_agent.py
│   │   └── compliance_agent.py
│   │
│   ├── rules/                 # Business rules
│   │   ├── __init__.py
│   │   ├── approval_rules.py  # Approval tiers and routing
│   │   ├── fraud_rules.py     # Fraud detection patterns
│   │   └── compliance_rules.py # SOD and documentation rules
│   │
│   ├── orchestrator/          # LangGraph workflow
│   │   ├── __init__.py
│   │   ├── state.py           # P2PState TypedDict
│   │   └── workflow.py        # P2POrchestrator class
│   │
│   └── api/                   # FastAPI routes
│       ├── __init__.py
│       ├── schemas.py         # Pydantic request/response models
│       └── routes.py          # REST endpoints
│
├── tests/                     # Test suite
│   ├── __init__.py
│   ├── conftest.py            # Pytest fixtures
│   ├── test_models.py         # Model unit tests
│   ├── test_rules.py          # Business rules tests
│   ├── test_agents.py         # Agent unit tests
│   ├── test_routes.py         # API endpoint tests
│   └── test_integration.py    # End-to-end tests
│
└── requirements.txt
```

---

## ⚙️ Technology Stack

| Component | Technology |
|-----------|------------|
| **API Framework** | FastAPI 0.111+ |
| **Database** | SQLAlchemy 2.0+ with SQLite (dev) / PostgreSQL (prod) |
| **LLM Provider** | AWS Bedrock Nova Pro (`amazon.nova-pro-v1:0`) |
| **Orchestration** | LangGraph 0.2+ |
| **Real-time** | WebSockets |
| **Testing** | pytest, pytest-asyncio, httpx |
| **Validation** | Pydantic v2 |

---

## 💼 Business Rules

### Approval Tiers (US Coupa-style)

| Tier | Amount Range | Required Approver |
|------|--------------|-------------------|
| Auto-Approve | $0 - $1,000 | System |
| Manager | $1,001 - $5,000 | Direct Manager |
| Director | $5,001 - $25,000 | Department Director |
| VP | $25,001 - $50,000 | Vice President |
| SVP | $50,001 - $100,000 | Senior VP |
| Executive | $100,001+ | CFO/CEO |

### Fraud Detection Rules

- **Duplicate Invoice Detection**: Same vendor invoice number + supplier
- **Split Transaction Detection**: Multiple invoices under threshold within 24 hours
- **Round Dollar Pattern**: Exact round amounts over $5,000
- **New Supplier Risk**: Transactions with suppliers < 90 days old
- **Rush Payment Requests**: Expedited payment requests
- **Weekend/Holiday Submissions**: Unusual submission timing
- **Sequential Invoice Numbers**: Suspicious numbering patterns
- **Threshold Avoidance**: Amounts just under approval thresholds

### 3-Way Match Tolerances

- **Quantity Tolerance**: 5%
- **Price Tolerance**: 2%
- **Auto-match Threshold**: $100

---

## 🔌 API Endpoints

### Users
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/` - List users
- `GET /api/v1/users/{id}` - Get user

### Suppliers
- `POST /api/v1/suppliers/` - Create supplier
- `GET /api/v1/suppliers/` - List suppliers
- `GET /api/v1/suppliers/{id}` - Get supplier

### Products
- `POST /api/v1/products/` - Create product
- `GET /api/v1/products/` - List products
- `GET /api/v1/products/{id}` - Get product

### Requisitions
- `POST /api/v1/requisitions/` - Create requisition
- `GET /api/v1/requisitions/` - List requisitions (paginated)
- `GET /api/v1/requisitions/{id}` - Get requisition
- `POST /api/v1/requisitions/{id}/submit` - Submit for approval

### Purchase Orders
- `POST /api/v1/purchase-orders/` - Create PO
- `GET /api/v1/purchase-orders/` - List POs (paginated)
- `GET /api/v1/purchase-orders/{id}` - Get PO
- `POST /api/v1/purchase-orders/{id}/send` - Send to supplier

### Goods Receipts
- `POST /api/v1/goods-receipts/` - Create receipt
- `GET /api/v1/goods-receipts/` - List receipts
- `GET /api/v1/goods-receipts/{id}` - Get receipt

### Invoices
- `POST /api/v1/invoices/` - Create invoice
- `GET /api/v1/invoices/` - List invoices (paginated)
- `GET /api/v1/invoices/{id}` - Get invoice
- `POST /api/v1/invoices/{id}/hold` - Put on hold
- `POST /api/v1/invoices/{id}/release` - Release hold

### Approvals
- `GET /api/v1/approvals/pending` - Get pending approvals
- `POST /api/v1/approvals/{id}/action` - Process approval

### Dashboard
- `GET /api/v1/dashboard/metrics` - Dashboard KPIs
- `GET /api/v1/dashboard/spend-by-category` - Spend analysis
- `GET /api/v1/dashboard/spend-by-vendor` - Vendor analysis

### Workflows
- `POST /api/v1/workflows/requisition` - Start full P2P workflow
- `GET /api/v1/workflows/{id}` - Get workflow status

### WebSocket
- `WS /ws/workflow/{workflow_id}` - Real-time workflow updates

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- AWS credentials configured for Bedrock access

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Environment Configuration

The application uses these environment variables (optional, defaults provided):

```bash
export DATABASE_URL="sqlite:///./p2p.db"
export AWS_REGION="us-east-1"
export BEDROCK_MODEL_ID="amazon.nova-pro-v1:0"
export ENVIRONMENT="development"
```

### Run the Server

```bash
cd backend
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

- API Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

---

## 🧪 Testing

### Run All Tests

```bash
cd backend
pytest tests/ -v
```

### Run Specific Test Categories

```bash
# Unit tests for models
pytest tests/test_models.py -v

# Unit tests for business rules
pytest tests/test_rules.py -v

# Unit tests for agents
pytest tests/test_agents.py -v

# API endpoint tests
pytest tests/test_routes.py -v

# Integration tests
pytest tests/test_integration.py -v
```

### Test Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

---

## 📊 Test Summary

| Test File | Coverage Area | Test Count |
|-----------|---------------|------------|
| `test_models.py` | SQLAlchemy models | 15+ tests |
| `test_rules.py` | Business rules | 20+ tests |
| `test_agents.py` | AI agents | 25+ tests |
| `test_routes.py` | API endpoints | 30+ tests |
| `test_integration.py` | E2E workflows | 15+ tests |

---

## 🔒 Security Notes

- Authentication is deferred to Phase 2
- All API endpoints will require JWT authentication in production
- Database migrations will be added using Alembic
- Secrets should be managed via AWS Secrets Manager or similar

---

## 📈 Phase 2 Roadmap

- [ ] JWT Authentication & Authorization
- [ ] Alembic database migrations
- [ ] PostgreSQL production database
- [ ] React/TailwindCSS frontend
- [ ] Supplier portal
- [ ] Email notifications
- [ ] Document attachments (S3)
- [ ] Advanced analytics dashboard
- [ ] Batch invoice processing
- [ ] ERP integrations

---

## 📝 License

MIT License
