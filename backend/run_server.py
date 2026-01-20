#!/usr/bin/env python
"""Simple script to run the uvicorn server."""
import os
import sys
import traceback
import asyncio

# Fix for Windows asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure we're in the right directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

# Add to path
sys.path.insert(0, backend_dir)

print(f"Starting server from: {backend_dir}")
print(f"Python: {sys.executable} ({sys.version})")

if __name__ == "__main__":
    try:
        import uvicorn
        print("uvicorn imported OK")
        
        # Configure uvicorn with proper settings
        config = uvicorn.Config(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info",
            reload=False,
            workers=1,
        )
        server = uvicorn.Server(config)
        print("Server configured, starting...")
        server.run()
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        sys.exit(1)
