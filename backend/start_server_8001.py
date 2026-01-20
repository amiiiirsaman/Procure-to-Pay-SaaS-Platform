#!/usr/bin/env python
"""Start P2P SaaS backend server."""
import os
import sys

# Set working directory
backend_dir = r"D:\ai_projects\Procure_to_Pay_(P2P)_SaaS_Platform\backend"
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        log_level="info",
        reload=False,
    )
