#!/usr/bin/env python
"""Simple server starter to avoid path issues."""
import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    # Also set PYTHONPATH environment variable
    os.environ['PYTHONPATH'] = current_dir + os.pathsep + os.environ.get('PYTHONPATH', '')
    
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        log_level="info",
    )
