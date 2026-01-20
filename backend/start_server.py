"""
Quick server starter script.
"""
import sys
import os
import traceback

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Now run directly
if __name__ == "__main__":
    import uvicorn
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,  # Disable reload to see errors better
            log_level="debug"
        )
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
