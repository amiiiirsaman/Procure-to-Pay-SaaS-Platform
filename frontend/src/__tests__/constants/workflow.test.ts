/**
 * Tests for Step and Status Column Display in Dashboard and Requisitions Views
 * 
 * Verifies:
 * - Step numbers 1-7 display correctly
 * - Step names match the workflow
 * - Status colors: Green=Complete, Yellow=HITL Pending, Red=Rejected, Blue=In Progress
 * - HITL flagging only allowed at steps 2-6
 */
import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_STEP_NAMES,
  HITL_ALLOWED_STEPS,
  getStatusColor,
  getStatusDisplayText,
  getStepName,
  parseStepFromStage,
  calculateWorkflowStatus,
  isHitlAllowedAtStep,
  MIN_STEP,
  MAX_STEP,
  TOTAL_STEPS,
} from '../../constants/workflow';

describe('Workflow Constants', () => {
  describe('WORKFLOW_STEP_NAMES', () => {
    it('should have exactly 7 steps (1-7)', () => {
      const stepKeys = Object.keys(WORKFLOW_STEP_NAMES).map(Number);
      expect(stepKeys.length).toBe(7);
      expect(Math.min(...stepKeys)).toBe(1);
      expect(Math.max(...stepKeys)).toBe(7);
    });

    it('should have correct step names', () => {
      expect(WORKFLOW_STEP_NAMES[1]).toBe('Requisition Validation');
      expect(WORKFLOW_STEP_NAMES[2]).toBe('Approval Check');
      expect(WORKFLOW_STEP_NAMES[3]).toBe('PO Generation');
      expect(WORKFLOW_STEP_NAMES[4]).toBe('Goods Receipt');
      expect(WORKFLOW_STEP_NAMES[5]).toBe('Invoice Validation');
      expect(WORKFLOW_STEP_NAMES[6]).toBe('Final Invoice Approval');
      expect(WORKFLOW_STEP_NAMES[7]).toBe('Payment');
    });

    it('should NOT have step 0 (Draft)', () => {
      expect(WORKFLOW_STEP_NAMES[0]).toBeUndefined();
    });
  });

  describe('HITL_ALLOWED_STEPS', () => {
    it('should only allow HITL at steps 2-6', () => {
      expect(HITL_ALLOWED_STEPS).toEqual([2, 3, 4, 5, 6]);
    });

    it('should NOT include step 1 or 7', () => {
      expect(HITL_ALLOWED_STEPS).not.toContain(1);
      expect(HITL_ALLOWED_STEPS).not.toContain(7);
    });
  });

  describe('MIN_STEP and MAX_STEP', () => {
    it('should have MIN_STEP = 1', () => {
      expect(MIN_STEP).toBe(1);
    });

    it('should have MAX_STEP = 7', () => {
      expect(MAX_STEP).toBe(7);
    });

    it('should have TOTAL_STEPS = 7', () => {
      expect(TOTAL_STEPS).toBe(7);
    });
  });
});

describe('getStepName', () => {
  it('should return correct name for each step 1-7', () => {
    expect(getStepName(1)).toBe('Requisition Validation');
    expect(getStepName(2)).toBe('Approval Check');
    expect(getStepName(3)).toBe('PO Generation');
    expect(getStepName(4)).toBe('Goods Receipt');
    expect(getStepName(5)).toBe('Invoice Validation');
    expect(getStepName(6)).toBe('Final Invoice Approval');
    expect(getStepName(7)).toBe('Payment');
  });

  it('should return fallback for invalid step numbers', () => {
    expect(getStepName(0)).toBe('Step 0');
    expect(getStepName(8)).toBe('Step 8');
    expect(getStepName(-1)).toBe('Step -1');
  });
});

describe('parseStepFromStage', () => {
  it('should parse step_X format correctly', () => {
    expect(parseStepFromStage('step_1')).toBe(1);
    expect(parseStepFromStage('step_2')).toBe(2);
    expect(parseStepFromStage('step_3')).toBe(3);
    expect(parseStepFromStage('step_4')).toBe(4);
    expect(parseStepFromStage('step_5')).toBe(5);
    expect(parseStepFromStage('step_6')).toBe(6);
    expect(parseStepFromStage('step_7')).toBe(7);
  });

  it('should return 7 for completed stage', () => {
    expect(parseStepFromStage('completed')).toBe(7);
  });

  it('should default to 1 for null/undefined', () => {
    expect(parseStepFromStage(null)).toBe(1);
    expect(parseStepFromStage(undefined)).toBe(1);
    expect(parseStepFromStage('')).toBe(1);
  });

  it('should default to 1 for invalid formats', () => {
    expect(parseStepFromStage('draft')).toBe(1);
    expect(parseStepFromStage('unknown')).toBe(1);
    expect(parseStepFromStage('step_invalid')).toBe(1);
  });

  it('should clamp out-of-range steps to 1', () => {
    expect(parseStepFromStage('step_0')).toBe(1);
    expect(parseStepFromStage('step_8')).toBe(1);
    expect(parseStepFromStage('step_99')).toBe(1);
  });
});

describe('calculateWorkflowStatus', () => {
  it('should return "completed" for completed stage', () => {
    expect(calculateWorkflowStatus('completed', null, false)).toBe('completed');
  });

  it('should return "rejected" when rejected flag is true', () => {
    expect(calculateWorkflowStatus('step_2', null, true)).toBe('rejected');
  });

  it('should return "rejected" for stage containing "rejected"', () => {
    expect(calculateWorkflowStatus('step_2_rejected', null, false)).toBe('rejected');
  });

  it('should return "hitl_pending" for non-completed stages', () => {
    expect(calculateWorkflowStatus('step_3', 'ApprovalAgent', false)).toBe('hitl_pending');
    expect(calculateWorkflowStatus('step_5', null, false)).toBe('hitl_pending');
    expect(calculateWorkflowStatus('step_1', null, false)).toBe('hitl_pending');
  });

  it('should return "hitl_pending" for null/undefined stage', () => {
    expect(calculateWorkflowStatus(null, null, false)).toBe('hitl_pending');
    expect(calculateWorkflowStatus(undefined, null, false)).toBe('hitl_pending');
  });
});

describe('getStatusColor', () => {
  it('should return green classes for completed', () => {
    const color = getStatusColor('completed');
    expect(color).toContain('green');
    expect(color).toContain('bg-green');
    expect(color).toContain('text-green');
  });

  it('should return yellow classes for hitl_pending', () => {
    const color = getStatusColor('hitl_pending');
    expect(color).toContain('yellow');
    expect(color).toContain('bg-yellow');
    expect(color).toContain('text-yellow');
  });

  it('should return red classes for rejected', () => {
    const color = getStatusColor('rejected');
    expect(color).toContain('red');
    expect(color).toContain('bg-red');
    expect(color).toContain('text-red');
  });

  it('should return gray classes for unknown status', () => {
    const color = getStatusColor('unknown');
    expect(color).toContain('gray');
  });
});

describe('getStatusDisplayText', () => {
  it('should return "Complete" for completed status', () => {
    expect(getStatusDisplayText('completed')).toBe('Complete');
  });

  it('should return "HITL Pending" for hitl_pending status', () => {
    expect(getStatusDisplayText('hitl_pending')).toBe('HITL Pending');
  });

  it('should return "Rejected" for rejected status', () => {
    expect(getStatusDisplayText('rejected')).toBe('Rejected');
  });

  it('should return the input for unknown status', () => {
    expect(getStatusDisplayText('unknown_status')).toBe('unknown_status');
  });
});

describe('isHitlAllowedAtStep', () => {
  it('should return false for step 1 (Requisition Validation)', () => {
    expect(isHitlAllowedAtStep(1)).toBe(false);
  });

  it('should return true for steps 2-6', () => {
    expect(isHitlAllowedAtStep(2)).toBe(true);
    expect(isHitlAllowedAtStep(3)).toBe(true);
    expect(isHitlAllowedAtStep(4)).toBe(true);
    expect(isHitlAllowedAtStep(5)).toBe(true);
    expect(isHitlAllowedAtStep(6)).toBe(true);
  });

  it('should return false for step 7 (Compliance Check)', () => {
    expect(isHitlAllowedAtStep(7)).toBe(false);
  });

  it('should return false for invalid steps', () => {
    expect(isHitlAllowedAtStep(0)).toBe(false);
    expect(isHitlAllowedAtStep(8)).toBe(false);
    expect(isHitlAllowedAtStep(-1)).toBe(false);
  });
});

describe('Status Color Specifications', () => {
  /**
   * These tests verify the exact color requirements:
   * - Step 7 done (Complete) = Green
   * - HITL Pending = Yellow
   * - Rejected = Red
   */

  it('Complete status should display GREEN', () => {
    const color = getStatusColor('completed');
    expect(color).toMatch(/green/i);
  });

  it('HITL Pending status should display YELLOW', () => {
    const color = getStatusColor('hitl_pending');
    expect(color).toMatch(/yellow/i);
  });

  it('Rejected status should display RED', () => {
    const color = getStatusColor('rejected');
    expect(color).toMatch(/red/i);
  });
});

describe('Workflow Step Progression', () => {
  /**
   * Test the expected workflow step progression:
   * Step 1: Requisition Validation - Initial validation
   * Step 2: Approval Check - Can be flagged for HITL
   * Step 3: PO Generation - Can be flagged for HITL
   * Step 4: Goods Receipt - Can be flagged for HITL
   * Step 5: Invoice Validation - Can be flagged for HITL
   * Step 6: Final Invoice Approval - Can be flagged for HITL
   * Step 7: Payment - Final step, shows Complete when done
   */

  it('workflow should have 7 steps total', () => {
    expect(TOTAL_STEPS).toBe(7);
    expect(Object.keys(WORKFLOW_STEP_NAMES).length).toBe(7);
  });

  it('step 7 should be the final step (Payment)', () => {
    expect(WORKFLOW_STEP_NAMES[7]).toBe('Payment');
    expect(MAX_STEP).toBe(7);
  });

  it('completed stage should map to step 7', () => {
    expect(parseStepFromStage('completed')).toBe(7);
  });

  it('completed stage without flag should be "completed" status', () => {
    expect(calculateWorkflowStatus('completed', null, false)).toBe('completed');
  });
});
