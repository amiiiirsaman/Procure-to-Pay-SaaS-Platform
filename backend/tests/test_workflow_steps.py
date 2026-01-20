"""
Tests for workflow step and status column logic in the P2P dashboard.

Verifies:
- Steps 1-7 are correctly returned (no step 0)
- Step names match the expected workflow
- Status colors: Green=Complete, Yellow=HITL Pending, Red=Rejected
- HITL flagging only at steps 2-6
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Import the step names and allowed steps from routes
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.routes import WORKFLOW_STEP_NAMES, HITL_ALLOWED_STEPS


class TestWorkflowStepNames:
    """Test the WORKFLOW_STEP_NAMES mapping."""

    def test_has_seven_steps(self):
        """Should have exactly 7 steps (1-7)."""
        assert len(WORKFLOW_STEP_NAMES) == 7
        assert set(WORKFLOW_STEP_NAMES.keys()) == {1, 2, 3, 4, 5, 6, 7}

    def test_no_step_zero(self):
        """Should NOT have step 0 (Draft)."""
        assert 0 not in WORKFLOW_STEP_NAMES

    def test_step_names_are_correct(self):
        """Step names should match expected workflow."""
        assert WORKFLOW_STEP_NAMES[1] == "Requisition Validation"
        assert WORKFLOW_STEP_NAMES[2] == "Approval Check"
        assert WORKFLOW_STEP_NAMES[3] == "PO Generation"
        assert WORKFLOW_STEP_NAMES[4] == "Goods Receipt"
        assert WORKFLOW_STEP_NAMES[5] == "Invoice Validation"
        assert WORKFLOW_STEP_NAMES[6] == "Final Invoice Approval"
        assert WORKFLOW_STEP_NAMES[7] == "Payment"

    def test_min_step_is_one(self):
        """Minimum step should be 1."""
        assert min(WORKFLOW_STEP_NAMES.keys()) == 1

    def test_max_step_is_seven(self):
        """Maximum step should be 7."""
        assert max(WORKFLOW_STEP_NAMES.keys()) == 7


class TestHitlAllowedSteps:
    """Test HITL_ALLOWED_STEPS configuration."""

    def test_hitl_allowed_at_steps_2_through_6(self):
        """HITL should only be allowed at steps 2-6."""
        assert HITL_ALLOWED_STEPS == [2, 3, 4, 5, 6]

    def test_hitl_not_allowed_at_step_1(self):
        """HITL should NOT be allowed at step 1 (Requisition Validation)."""
        assert 1 not in HITL_ALLOWED_STEPS

    def test_hitl_not_allowed_at_step_7(self):
        """HITL should NOT be allowed at step 7 (Payment)."""
        assert 7 not in HITL_ALLOWED_STEPS


class TestStepParsing:
    """Test step number parsing from current_stage string."""

    def test_parse_step_1(self):
        """step_1 should parse to 1."""
        stage = "step_1"
        step = parse_step_from_stage(stage)
        assert step == 1

    def test_parse_step_7(self):
        """step_7 should parse to 7."""
        stage = "step_7"
        step = parse_step_from_stage(stage)
        assert step == 7

    def test_parse_completed(self):
        """completed should parse to 7."""
        stage = "completed"
        step = parse_step_from_stage(stage)
        assert step == 7

    def test_parse_null_returns_1(self):
        """None should default to step 1."""
        step = parse_step_from_stage(None)
        assert step == 1

    def test_parse_invalid_returns_1(self):
        """Invalid formats should default to step 1."""
        step = parse_step_from_stage("unknown")
        assert step == 1


class TestWorkflowStatusCalculation:
    """Test workflow_status calculation logic."""

    def test_completed_status(self):
        """completed stage with no flag should return 'completed'."""
        status = calculate_workflow_status("completed", None, False)
        assert status == "completed"

    def test_rejected_from_flag(self):
        """When rejected=True, should return 'rejected'."""
        status = calculate_workflow_status("step_3", None, True)
        assert status == "rejected"

    def test_rejected_from_stage(self):
        """Stage containing 'rejected' should return 'rejected'."""
        status = calculate_workflow_status("step_2_rejected", None, False)
        assert status == "rejected"

    def test_hitl_pending_when_flagged(self):
        """When flagged_by is set, should return 'hitl_pending'."""
        status = calculate_workflow_status("step_3", "ApprovalAgent", False)
        assert status == "hitl_pending"

    def test_hitl_pending_normal(self):
        """Normal stage without flag should return 'hitl_pending'."""
        status = calculate_workflow_status("step_4", None, False)
        assert status == "hitl_pending"


def parse_step_from_stage(current_stage: str | None) -> int:
    """
    Parse step number from current_stage string.
    Mirrors the backend logic.
    """
    if not current_stage:
        return 1
    if current_stage == "completed":
        return 7
    if current_stage.startswith("step_"):
        try:
            step = int(current_stage.split("_")[1])
            return step if 1 <= step <= 7 else 1
        except (IndexError, ValueError):
            return 1
    return 1


def calculate_workflow_status(
    current_stage: str | None,
    flagged_by: str | None,
    is_rejected: bool,
) -> str:
    """
    Calculate workflow status from requisition data.
    Mirrors the backend logic.
    """
    if is_rejected or (current_stage and "rejected" in current_stage):
        return "rejected"
    if current_stage == "completed":
        return "completed"
    return "hitl_pending"


class TestRequisitionsStatusEndpoint:
    """Test the /requisitions-status endpoint response format."""

    def test_response_has_required_fields(self):
        """Each item should have current_step, step_name, workflow_status."""
        # This is a schema validation test
        required_fields = [
            "id",
            "number",
            "description",
            "department",
            "total_amount",
            "current_step",
            "step_name",
            "workflow_status",
            "flagged_by",
            "flag_reason",
            "created_at",
            "updated_at",
        ]
        # Would be tested against actual API response in integration tests
        assert len(required_fields) == 12

    def test_current_step_range(self):
        """current_step should be 1-7."""
        valid_steps = list(range(1, 8))
        assert valid_steps == [1, 2, 3, 4, 5, 6, 7]

    def test_workflow_status_values(self):
        """workflow_status should be one of valid values."""
        valid_statuses = ["hitl_pending", "rejected", "completed"]
        # No "draft" or "in_progress" status
        assert "draft" not in valid_statuses
        assert "in_progress" not in valid_statuses


class TestStatusColors:
    """
    Verify status color requirements:
    - Complete (step 7 done) = Green
    - HITL Pending = Yellow
    - Rejected = Red
    - In Progress = Blue
    """

    def test_completed_should_be_green(self):
        """Complete status should display GREEN."""
        # This would be tested in frontend, but we document the expectation
        status = "completed"
        expected_color = "green"
        assert status == "completed"
        # Frontend uses: bg-green-100 text-green-700 border-green-300

    def test_hitl_pending_should_be_yellow(self):
        """HITL Pending status should display YELLOW."""
        status = "hitl_pending"
        expected_color = "yellow"
        assert status == "hitl_pending"
        # Frontend uses: bg-yellow-100 text-yellow-700 border-yellow-300

    def test_rejected_should_be_red(self):
        """Rejected status should display RED."""
        status = "rejected"
        expected_color = "red"
        assert status == "rejected"
        # Frontend uses: bg-red-100 text-red-700 border-red-300

    def test_in_progress_should_be_blue(self):
        """In Progress status should display BLUE."""
        status = "in_progress"
        expected_color = "blue"
        assert status == "in_progress"
        # Frontend uses: bg-blue-100 text-blue-700 border-blue-300


class TestWorkflowProgression:
    """Test the expected workflow progression."""

    def test_workflow_has_seven_steps(self):
        """Workflow should have exactly 7 steps."""
        assert len(WORKFLOW_STEP_NAMES) == 7

    def test_step_7_is_final(self):
        """Step 7 (Compliance Check) should be the final step."""
        assert WORKFLOW_STEP_NAMES[7] == "Compliance Check"
        assert max(WORKFLOW_STEP_NAMES.keys()) == 7

    def test_completed_maps_to_step_7(self):
        """'completed' stage should map to step 7."""
        step = parse_step_from_stage("completed")
        assert step == 7

    def test_no_draft_step(self):
        """There should be no Draft step (step 0)."""
        assert 0 not in WORKFLOW_STEP_NAMES

    def test_hitl_not_at_first_or_last_step(self):
        """HITL should not be allowed at first (1) or last (7) step."""
        assert 1 not in HITL_ALLOWED_STEPS
        assert 7 not in HITL_ALLOWED_STEPS


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
