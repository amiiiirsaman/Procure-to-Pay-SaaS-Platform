/**
 * Shared workflow constants for the P2P SaaS Platform.
 * Single source of truth for step names, status colors, and workflow utilities.
 * 
 * Workflow Steps (1-9):
 * - Step 1: Requisition Validation
 * - Step 2: Approval Check (HITL possible)
 * - Step 3: PO Generation (HITL possible)
 * - Step 4: Goods Receipt (HITL possible)
 * - Step 5: Invoice Validation (HITL possible)
 * - Step 6: Fraud Analysis
 * - Step 7: Compliance Check
 * - Step 8: Final Approval (HITL required)
 * - Step 9: Payment (final step)
 * 
 * HITL (Human-in-the-Loop) flagging is allowed at steps 2-5 and required at step 8.
 */

/**
 * Step number to step name mapping (1-9)
 */
export const WORKFLOW_STEP_NAMES: Record<number, string> = {
  1: 'Requisition Validation',
  2: 'Approval Check',
  3: 'PO Generation',
  4: 'Goods Receipt',
  5: 'Invoice Validation',
  6: 'Fraud Analysis',
  7: 'Compliance Check',
  8: 'Final Approval',
  9: 'Payment',
};

/**
 * Steps where HITL (Human-in-the-Loop) flagging is allowed
 */
export const HITL_ALLOWED_STEPS = [2, 3, 4, 5, 8] as const;

/**
 * Workflow status types (no in_progress - only hitl_pending, rejected, completed)
 */
export type WorkflowStatus = 'hitl_pending' | 'rejected' | 'completed';

/**
 * Status display labels
 */
export const STATUS_DISPLAY_TEXT: Record<WorkflowStatus | string, string> = {
  completed: 'Complete',
  hitl_pending: 'HITL Pending',
  rejected: 'Rejected',
};

/**
 * Get Tailwind CSS classes for status badge background and text color.
 * - Green: Complete (step 7 done)
 * - Yellow: HITL Pending
 * - Red: Rejected
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'hitl_pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

/**
 * Get circle indicator color for step display
 */
export function getStepCircleColor(step: number, status: string): string {
  if (status === 'completed') return 'text-green-500';
  if (status === 'rejected') return 'text-red-500';
  if (status === 'hitl_pending') return 'text-yellow-500';
  return 'text-gray-500';
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: string): string {
  return STATUS_DISPLAY_TEXT[status] || status;
}

/**
 * Get step name from step number
 */
export function getStepName(step: number): string {
  return WORKFLOW_STEP_NAMES[step] || `Step ${step}`;
}

/**
 * Parse step number from current_stage string (e.g., "step_3" -> 3)
 */
export function parseStepFromStage(currentStage?: string | null): number {
  if (!currentStage) return 1;
  if (currentStage === 'completed' || currentStage === 'payment_completed') return 9;
  
  const match = currentStage.match(/step_(\d+)/);
  if (match) {
    const step = parseInt(match[1], 10);
    return step >= 1 && step <= 9 ? step : 1;
  }
  return 1;
}

/**
 * Calculate workflow status from requisition data
 * Only 3 statuses: completed, hitl_pending, rejected (no in_progress)
 */
export function calculateWorkflowStatus(
  currentStage?: string | null,
  flaggedBy?: string | null,
  isRejected?: boolean
): WorkflowStatus {
  // Rejected takes priority
  if (isRejected || currentStage?.includes('rejected')) {
    return 'rejected';
  }
  
  // Completed if at step 9 (payment_completed) or completed status
  if (currentStage === 'completed' || currentStage === 'payment_completed' || currentStage === 'step_9') {
    return 'completed';
  }
  
  // Everything else is HITL pending (waiting for next step)
  return 'hitl_pending';
}

/**
 * Check if HITL flagging is allowed at the given step
 */
export function isHitlAllowedAtStep(step: number): boolean {
  return (HITL_ALLOWED_STEPS as readonly number[]).includes(step);
}

/**
 * Minimum and maximum step numbers
 */
export const MIN_STEP = 1;
export const MAX_STEP = 9;

/**
 * Total number of workflow steps
 */
export const TOTAL_STEPS = 9;
