import os
import sys
from pathlib import Path
import uvicorn

if __name__ == "__main__":
    backend_dir = Path(__file__).resolve().parent

    # Exclude directories that exist and should not trigger server reloads
    exclude_dirs = [
        backend_dir / "venv",
        backend_dir / ".venv",
        backend_dir / "detections",
        backend_dir / "uploads",
        backend_dir / "logs",
        backend_dir / "__pycache__",
    ]

    # Only pass existing directories as absolute paths so uvicorn's FileFilter
    # correctly excludes them and does not trigger pathlib.glob on absolute paths
    reload_excludes = [str(d) for d in exclude_dirs if d.is_dir()]
    # Relative file patterns
    reload_excludes.extend(["*.log", "*.pyc", "*.swp"])

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir)],
        reload_excludes=reload_excludes,
        app_dir=str(backend_dir),
    )
