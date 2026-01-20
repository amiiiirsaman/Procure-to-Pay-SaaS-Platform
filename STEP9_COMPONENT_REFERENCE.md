# Step 9: Component Export Reference

## Import Everything

```typescript
// From components barrel export
import { 
  AgentButton,
  AgentResultModal,
  AgentStatusBadge,
  AgentHealthPanel,
  RecommendationsList,
  FlagAlert,
} from '../components/agents';

// Individual imports (alternative)
import { AgentButton } from '../components/agents/AgentButton';
import { AgentResultModal } from '../components/agents/AgentResultModal';
```

## API Functions

```typescript
// From utils API client
import {
  // Dedicated Agent Endpoints
  validateRequisition,
  determineApprovalChain,
  generatePO,
  processReceipt,
  validateInvoice,
  analyzeFraud,
  checkCompliance,
  checkAgentHealth,
  
  // Legacy (still available for backward compatibility)
  triggerAgent,
  triggerRequisitionAgent,
  triggerApprovalAgent,
  triggerFraudAgent,
  triggerComplianceAgent,
  triggerPOAgent,
  triggerReceivingAgent,
  triggerInvoiceAgent,
} from '../utils/api';
```

## Component Examples

### AgentButton
```typescript
<AgentButton
  agentName="requisition"
  agentLabel="Validate Requisition"
  onTrigger={() => validateRequisition(docId)}
  variant="default"
  size="md"
  disabled={false}
  className="custom-class"
/>
```

**Props**:
- `agentName` (string): Identifier for the agent
- `agentLabel` (string): Display label on button
- `onTrigger` (async function): Called when button clicked
- `variant?` (default|success|warning|danger): Button style
- `size?` (sm|md|lg): Button size
- `disabled?` (boolean): Disable button
- `className?` (string): Additional CSS classes

---

### AgentResultModal
```typescript
<AgentResultModal
  isOpen={true}
  agentName="RequisitionAgent"
  agentLabel="Requisition Validation"
  status="success"
  result={{ /* agent result */ }}
  notes={[{ timestamp: "...", note: "..." }]}
  flagged={false}
  flagReason="optional"
  onClose={() => {}}
/>
```

**Props**:
- `isOpen` (boolean): Show/hide modal
- `agentName` (string): Agent identifier
- `agentLabel` (string): Display name
- `status` (string): success|error
- `result` (any): Agent output
- `notes` (Array): Agent notes with timestamps
- `flagged` (boolean): If flagged
- `flagReason?` (string): Why flagged
- `onClose` (function): Close handler

---

### AgentStatusBadge
```typescript
<AgentStatusBadge
  status="processing"
  flagged={false}
  className="custom-class"
/>
```

**Props**:
- `status` (pending|processing|success|flagged|error): Badge type
- `flagged?` (boolean): Override to show as flagged
- `className?` (string): Additional CSS

---

### AgentHealthPanel
```typescript
<AgentHealthPanel />
```

**No props** - Fetches and displays agent health automatically.

---

### RecommendationsList
```typescript
<RecommendationsList
  recommendations={[
    {
      type: "warning",
      title: "Duplicate Item",
      description: "Item already exists",
      action: "Review",
      metadata: {}
    }
  ]}
  isLoading={false}
  agentName="RequisitionAgent"
/>
```

**Props**:
- `recommendations?` (Array|Object): Recommendations to display
- `isLoading?` (boolean): Show loading state
- `agentName?` (string): Agent name for display

---

### FlagAlert
```typescript
<FlagAlert
  flagged={true}
  flagReason="High fraud risk detected"
  agentName="FraudAgent"
  severity="critical"
  className="custom-class"
/>
```

**Props**:
- `flagged` (boolean): Show if true
- `flagReason?` (string): Alert message
- `agentName?` (string): Agent name
- `severity?` (warning|critical|info): Severity level
- `className?` (string): Additional CSS

---

## API Function Signatures

### validateRequisition
```typescript
async function validateRequisition(
  documentId: string | number
): Promise<AgentTriggerResponse>
```

### determineApprovalChain
```typescript
async function determineApprovalChain(
  documentId: string | number,
  documentType?: string
): Promise<AgentTriggerResponse>
```

### generatePO
```typescript
async function generatePO(
  documentId: string | number
): Promise<AgentTriggerResponse>
```

### processReceipt
```typescript
async function processReceipt(
  documentId: string | number
): Promise<AgentTriggerResponse>
```

### validateInvoice
```typescript
async function validateInvoice(
  documentId: string | number
): Promise<AgentTriggerResponse>
```

### analyzeFraud
```typescript
async function analyzeFraud(
  documentId: string | number,
  documentType?: string
): Promise<AgentTriggerResponse>
```

### checkCompliance
```typescript
async function checkCompliance(
  documentId: string | number,
  documentType?: string
): Promise<AgentTriggerResponse>
```

### checkAgentHealth
```typescript
async function checkAgentHealth(): Promise<AgentHealthStatus>
```

---

## Response Types

### AgentTriggerResponse
```typescript
interface AgentTriggerResponse {
  agent_name: string;
  status: 'success' | 'error';
  result: any;
  notes: AgentNote[];
  flagged: boolean;
  flag_reason?: string;
}

interface AgentNote {
  timestamp: string;
  note: string;
}
```

### AgentHealthStatus
```typescript
interface AgentHealthStatus {
  service: string;
  status: 'healthy' | 'degraded';
  agents: Record<string, {
    status: 'healthy' | 'unhealthy';
    agent_name?: string;
    initialized: boolean;
    error?: string;
  }>;
  timestamp: string;
}
```

---

## Common Patterns

### Pattern 1: Trigger and Display Results
```typescript
const [result, setResult] = useState<AgentTriggerResponse | null>(null);
const [showModal, setShowModal] = useState(false);

<AgentButton
  agentName="requisition"
  agentLabel="Validate"
  onTrigger={async () => {
    const res = await validateRequisition(docId);
    setResult(res);
    setShowModal(true);
    return res;
  }}
/>

{result && (
  <AgentResultModal
    isOpen={showModal}
    agentName={result.agent_name}
    agentLabel="Validation"
    status={result.status}
    result={result.result}
    notes={result.notes}
    flagged={result.flagged}
    flagReason={result.flag_reason}
    onClose={() => setShowModal(false)}
  />
)}
```

### Pattern 2: Multiple Agents
```typescript
<div className="flex gap-2">
  <AgentButton
    agentName="invoice"
    agentLabel="Validate"
    onTrigger={() => validateInvoice(docId)}
    size="sm"
  />
  <AgentButton
    agentName="fraud"
    agentLabel="Fraud Check"
    onTrigger={() => analyzeFraud(docId)}
    size="sm"
    variant="warning"
  />
  <AgentButton
    agentName="compliance"
    agentLabel="Compliance"
    onTrigger={() => checkCompliance(docId)}
    size="sm"
  />
</div>
```

### Pattern 3: Conditional Display
```typescript
{document.status === 'PENDING_VALIDATION' && (
  <AgentButton
    agentName="invoice"
    agentLabel="Validate"
    onTrigger={() => validateInvoice(document.id)}
  />
)}
```

### Pattern 4: With Health Monitoring
```typescript
<div className="space-y-4">
  <AgentHealthPanel />
  
  <AgentButton
    agentName="requisition"
    agentLabel="Validate"
    onTrigger={() => validateRequisition(docId)}
  />
</div>
```

---

## File Structure

```
frontend/src/
├── components/
│   ├── agents/
│   │   ├── AgentButton.tsx          (130 lines)
│   │   ├── AgentResultModal.tsx     (120 lines)
│   │   ├── AgentStatusBadge.tsx     (75 lines)
│   │   ├── AgentHealthPanel.tsx     (130 lines)
│   │   ├── RecommendationsList.tsx  (100 lines)
│   │   ├── FlagAlert.tsx            (90 lines)
│   │   └── index.ts                 (6 lines)
│   └── common/
│       └── (existing components)
│
└── utils/
    └── api.ts                       (updated with 8 new functions)
```

---

## Testing Components

### Jest/Vitest Setup
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentButton } from '../components/agents';

test('AgentButton renders', () => {
  render(
    <AgentButton
      agentName="test"
      agentLabel="Test"
      onTrigger={async () => ({ status: 'success' })}
    />
  );
  expect(screen.getByText('Test')).toBeInTheDocument();
});

test('AgentButton shows loading state', async () => {
  const mockTrigger = jest.fn(() => new Promise(r => setTimeout(r, 100)));
  render(
    <AgentButton
      agentName="test"
      agentLabel="Test"
      onTrigger={mockTrigger}
    />
  );
  
  fireEvent.click(screen.getByText('Test'));
  await waitFor(() => {
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
```

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Performance Notes

- Components memoized and optimized
- Health polling: 30-second intervals
- Modal opens instantly (no extra fetch)
- Agent calls: 1-2 seconds (backend dependent)

---

## Accessibility

- ✅ ARIA labels on buttons
- ✅ Keyboard navigation support
- ✅ Focus management in modals
- ✅ Color + icon indicators
- ✅ Screen reader friendly

---

**Last Updated**: Step 9 Phase 1 & 2 Complete
**Ready for**: Phase 3 - View integration
