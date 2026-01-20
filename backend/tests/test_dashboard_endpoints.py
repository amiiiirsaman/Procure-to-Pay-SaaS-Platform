"""
Tests for P2P Dashboard API endpoints.

These tests verify that all dashboard endpoints return the correct schemas
and respond appropriately to various filter parameters.
"""
import pytest
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Requisition, WorkflowStep


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    """Create a database session for tests."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


class TestPipelineStatsEndpoint:
    """Tests for GET /api/v1/dashboard/pipeline-stats"""

    def test_pipeline_stats_returns_200(self, client):
        """Verify endpoint returns 200 OK."""
        response = client.get("/api/v1/dashboard/pipeline-stats")
        assert response.status_code == 200

    def test_pipeline_stats_schema(self, client):
        """Verify response contains all required fields."""
        response = client.get("/api/v1/dashboard/pipeline-stats")
        data = response.json()
        
        # Required fields
        required_fields = [
            "total_requisitions",
            "requisitions_in_progress",
            "requisitions_completed",
            "requisitions_hitl_pending",
            "requisitions_rejected",
            "automation_rate",
            "avg_processing_time_manual_hours",
            "avg_processing_time_agent_hours",
            "time_savings_percent",
            "compliance_score",
            "roi_minutes_saved",
            "flagged_for_review_count",
            "accuracy_score",
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_pipeline_stats_data_types(self, client):
        """Verify correct data types for numeric fields."""
        response = client.get("/api/v1/dashboard/pipeline-stats")
        data = response.json()
        
        # Integer fields
        assert isinstance(data["total_requisitions"], int)
        assert isinstance(data["requisitions_in_progress"], int)
        assert isinstance(data["requisitions_completed"], int)
        assert isinstance(data["requisitions_hitl_pending"], int)
        assert isinstance(data["requisitions_rejected"], int)
        assert isinstance(data["roi_minutes_saved"], int)
        assert isinstance(data["flagged_for_review_count"], int)
        
        # Float fields
        assert isinstance(data["automation_rate"], (int, float))
        assert isinstance(data["avg_processing_time_manual_hours"], (int, float))
        assert isinstance(data["avg_processing_time_agent_hours"], (int, float))
        assert isinstance(data["time_savings_percent"], (int, float))
        assert isinstance(data["compliance_score"], (int, float))
        assert isinstance(data["accuracy_score"], (int, float))

    def test_pipeline_stats_value_ranges(self, client):
        """Verify values are within expected ranges."""
        response = client.get("/api/v1/dashboard/pipeline-stats")
        data = response.json()
        
        # Non-negative integers
        assert data["total_requisitions"] >= 0
        assert data["requisitions_in_progress"] >= 0
        assert data["requisitions_completed"] >= 0
        
        # Percentages should be 0-100
        assert 0 <= data["automation_rate"] <= 100
        assert 0 <= data["time_savings_percent"] <= 100
        assert 0 <= data["compliance_score"] <= 100
        assert 0 <= data["accuracy_score"] <= 100


class TestRequisitionsStatusEndpoint:
    """Tests for GET /api/v1/dashboard/requisitions-status"""

    def test_requisitions_status_returns_200(self, client):
        """Verify endpoint returns 200 OK."""
        response = client.get("/api/v1/dashboard/requisitions-status")
        assert response.status_code == 200

    def test_requisitions_status_returns_list(self, client):
        """Verify response is a list."""
        response = client.get("/api/v1/dashboard/requisitions-status")
        data = response.json()
        assert isinstance(data, list)

    def test_requisitions_status_hitl_filter(self, client):
        """Verify hitl_only filter works."""
        response = client.get("/api/v1/dashboard/requisitions-status?hitl_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there are results, all should be HITL pending
        for item in data:
            assert item.get("workflow_status") == "hitl_pending"

    def test_requisitions_status_schema_when_data_exists(self, client):
        """Verify response item schema when data exists."""
        response = client.get("/api/v1/dashboard/requisitions-status")
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            required_fields = [
                "id", "number", "title", "department", "total_amount",
                "current_step", "step_name", "workflow_status",
            ]
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
            
            # Verify step is 0-7
            assert 0 <= item["current_step"] <= 7
            
            # Verify workflow_status is valid
            valid_statuses = ["draft", "in_progress", "hitl_pending", "rejected", "completed"]
            assert item["workflow_status"] in valid_statuses


class TestProcurementGraphEndpoint:
    """Tests for GET /api/v1/dashboard/procurement-graph"""

    def test_procurement_graph_returns_200(self, client):
        """Verify endpoint returns 200 OK."""
        response = client.get("/api/v1/dashboard/procurement-graph")
        assert response.status_code == 200

    def test_procurement_graph_schema(self, client):
        """Verify response contains nodes and edges arrays."""
        response = client.get("/api/v1/dashboard/procurement-graph")
        data = response.json()
        
        assert "nodes" in data
        assert "edges" in data
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)

    def test_procurement_graph_with_department_filter(self, client):
        """Verify department filter parameter works."""
        response = client.get("/api/v1/dashboard/procurement-graph?department=ENGINEERING")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data

    def test_procurement_graph_with_budget_filter(self, client):
        """Verify budget_threshold filter parameter works."""
        response = client.get("/api/v1/dashboard/procurement-graph?budget_threshold=1000")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data

    def test_procurement_graph_with_status_filter(self, client):
        """Verify status_filter parameter works."""
        response = client.get("/api/v1/dashboard/procurement-graph?status_filter=completed")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data

    def test_procurement_graph_with_all_filters(self, client):
        """Verify all filters can be combined."""
        response = client.get(
            "/api/v1/dashboard/procurement-graph"
            "?department=IT"
            "&budget_threshold=5000"
            "&status_filter=in_progress"
        )
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data

    def test_procurement_graph_node_schema_when_data_exists(self, client):
        """Verify node schema when data exists."""
        response = client.get("/api/v1/dashboard/procurement-graph")
        data = response.json()
        
        if len(data["nodes"]) > 0:
            node = data["nodes"][0]
            required_fields = ["id", "type", "name", "color"]
            for field in required_fields:
                assert field in node, f"Missing node field: {field}"
            
            # Verify type is valid
            valid_types = ["department", "requisition", "category", "supplier", "status"]
            assert node["type"] in valid_types

    def test_procurement_graph_edge_schema_when_data_exists(self, client):
        """Verify edge schema when data exists."""
        response = client.get("/api/v1/dashboard/procurement-graph")
        data = response.json()
        
        if len(data["edges"]) > 0:
            edge = data["edges"][0]
            required_fields = ["source", "target", "type"]
            for field in required_fields:
                assert field in edge, f"Missing edge field: {field}"


class TestDashboardRouterIntegration:
    """Integration tests for dashboard router."""

    def test_dashboard_routes_are_registered(self, client):
        """Verify all dashboard routes are accessible (not 404)."""
        endpoints = [
            "/api/v1/dashboard/pipeline-stats",
            "/api/v1/dashboard/requisitions-status",
            "/api/v1/dashboard/procurement-graph",
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code != 404, f"Endpoint not found: {endpoint}"

    def test_invalid_dashboard_endpoint_returns_404(self, client):
        """Verify non-existent dashboard endpoint returns 404."""
        response = client.get("/api/v1/dashboard/nonexistent")
        assert response.status_code == 404


class TestWorkflowStepNames:
    """Tests for step name mappings."""

    def test_step_names_in_requisitions_status(self, client):
        """Verify step names are returned correctly."""
        response = client.get("/api/v1/dashboard/requisitions-status")
        data = response.json()
        
        expected_step_names = {
            0: "Draft",
            1: "Requisition Validation",
            2: "Approval Check",
            3: "PO Generation",
            4: "Goods Receipt",
            5: "Invoice Validation",
            6: "Fraud Analysis",
            7: "Compliance Check",
        }
        
        for item in data:
            step = item.get("current_step", 0)
            step_name = item.get("step_name", "")
            if step in expected_step_names:
                assert step_name == expected_step_names[step], \
                    f"Step {step} should be '{expected_step_names[step]}', got '{step_name}'"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
