#!/usr/bin/env python
"""Start server with full logging."""
import sys
import os
import asyncio
import logging

# Setup path FIRST
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

# Configure root logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting server...")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info(f"Python path: {sys.path[:3]}")
    
    try:
        import uvicorn
        logger.info("uvicorn imported")
        
        # Run with simpler configuration
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info",
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)
