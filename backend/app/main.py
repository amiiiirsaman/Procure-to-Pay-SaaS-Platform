"""
FastAPI application entry point for P2P SaaS Platform.
"""

import asyncio
import json
import logging
import traceback
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import init_db
from .ws_manager import manager
from .api.routes import router


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    import sys
    import traceback
    try:
        # Startup
        logger.info("Starting P2P SaaS Platform API...")
        settings = get_settings()
        logger.info(f"Environment: {settings.environment}")
        sys.stdout.flush()

        # Initialize database
        logger.info("About to call init_db()...")
        sys.stdout.flush()
        try:
            # TEMPORARY: Comment out to avoid hang - tables will be created on first access
            # init_db()
            logger.info("DB init skipped - will create tables on first DB access")
            sys.stdout.flush()
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            traceback.print_exc()
            sys.stdout.flush()
            raise

        logger.info("Application startup complete - ready to serve requests")
        sys.stdout.flush()
        yield
        logger.info("Application shutdown initiated")
        sys.stdout.flush()

    except Exception as e:
        logger.error(f"Lifespan error: {e}")
        traceback.print_exc()
        sys.stdout.flush()
        raise
    finally:
        # Shutdown
        logger.info("Shutting down P2P SaaS Platform API...")
        sys.stdout.flush()


# Create FastAPI application
app = FastAPI(
    title="P2P SaaS Platform API",
    description="Procure-to-Pay SaaS Platform with AI-powered agents",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS - Allow all localhost ports for development
settings = get_settings()
cors_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5177",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to log all unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and log them."""
    error_detail = f"{type(exc).__name__}: {str(exc)}"
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception on {request.url}: {error_detail}")
    logger.error(f"Traceback:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": error_detail, "traceback": tb.split("\n")[-10:]},
    )


# Include API routes
app.include_router(router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "p2p-saas-platform",
        "version": "1.0.0",
    }


# WebSocket endpoint for real-time workflow updates
@app.websocket("/ws/workflow/{workflow_id}")
async def websocket_endpoint(websocket: WebSocket, workflow_id: str) -> None:
    """
    WebSocket endpoint for real-time workflow updates.

    Clients connect to receive updates about agent actions, approval
    requests, and workflow state changes.
    """
    await manager.connect(websocket, workflow_id)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "workflow_id": workflow_id,
            "message": "Connected to workflow updates",
        })

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (heartbeat, commands, etc.)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0,
                )
                message = json.loads(data)

                # Handle client messages
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "subscribe":
                    # Client wants to subscribe to additional events
                    await websocket.send_json({
                        "type": "subscribed",
                        "events": message.get("events", []),
                    })

            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_json({"type": "heartbeat"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, workflow_id)
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        manager.disconnect(websocket, workflow_id)


# Utility function for agents to send real-time updates
async def send_workflow_update(
    workflow_id: str,
    agent_name: str,
    action: str,
    details: Optional[dict] = None,
) -> None:
    """
    Send a workflow update to connected clients.

    Called by agents during workflow execution to provide real-time updates.
    """
    message = {
        "type": "agent_update",
        "workflow_id": workflow_id,
        "agent": agent_name,
        "action": action,
        "details": details or {},
    }
    await manager.send_message(workflow_id, message)


# Entry point for running with uvicorn
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
