"""
WebSocket connection manager for P2P SaaS Platform.
"""

import json
import logging
from typing import Any, Optional

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, workflow_id: str) -> None:
        """Accept connection and add to active connections."""
        await websocket.accept()
        if workflow_id not in self.active_connections:
            self.active_connections[workflow_id] = []
        self.active_connections[workflow_id].append(websocket)
        logger.info(f"WebSocket connected for workflow: {workflow_id}")

    def disconnect(self, websocket: WebSocket, workflow_id: str) -> None:
        """Remove connection from active connections."""
        if workflow_id in self.active_connections:
            if websocket in self.active_connections[workflow_id]:
                self.active_connections[workflow_id].remove(websocket)
            if not self.active_connections[workflow_id]:
                del self.active_connections[workflow_id]
        logger.info(f"WebSocket disconnected for workflow: {workflow_id}")

    async def broadcast(self, message: dict, workflow_id: Optional[str] = None) -> None:
        """Broadcast message to all connections or specific workflow."""
        message_json = json.dumps(message, default=str)

        if workflow_id:
            # Broadcast to specific workflow
            if workflow_id in self.active_connections:
                for connection in self.active_connections[workflow_id]:
                    try:
                        await connection.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Error broadcasting to connection: {e}")
        else:
            # Broadcast to all connections
            for connections in self.active_connections.values():
                for connection in connections:
                    try:
                        await connection.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Error broadcasting to connection: {e}")

    async def send_workflow_update(
        self,
        workflow_id: str,
        event_type: str,
        data: dict[str, Any],
        agent_name: Optional[str] = None,
    ) -> None:
        """
        Send a workflow update to clients subscribed to a specific workflow.

        Args:
            workflow_id: The workflow ID to send update to
            event_type: Type of event (e.g., 'agent_started', 'agent_completed', 'stage_changed')
            data: Event data payload
            agent_name: Optional agent name that triggered the event
        """
        message = {
            "type": "workflow_update",
            "event": event_type,
            "workflow_id": workflow_id,
            "agent": agent_name,
            "data": data,
        }
        await self.broadcast(message, workflow_id)
        logger.debug(f"Sent workflow update: {event_type} for workflow {workflow_id}")

    async def send_agent_health_update(self, health_data: dict[str, Any]) -> None:
        """
        Broadcast agent health status to all connected clients.

        Args:
            health_data: Agent health information
        """
        message = {
            "type": "agent_health",
            "data": health_data,
        }
        await self.broadcast(message)
        logger.debug("Broadcast agent health update")

    async def handle_ws_connection(
        self, websocket: WebSocket, workflow_id: str
    ) -> None:
        """Handle WebSocket connection lifecycle."""
        await self.connect(websocket, workflow_id)
        try:
            while True:
                # Keep connection alive, handle any incoming messages
                data = await websocket.receive_text()
                # Optionally handle client messages (ping/pong, etc.)
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except json.JSONDecodeError:
                    pass
        except WebSocketDisconnect:
            self.disconnect(websocket, workflow_id)


# Global manager instance
manager = ConnectionManager()
