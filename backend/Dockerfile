# ═══════════════════════════════════════════════════════════════════
# SMART-INFRA AI — BACKEND SERVICE DOCKERFILE
# Python 3.10 slim runtime with OpenCV & PyTorch AI support
# ═══════════════════════════════════════════════════════════════════

FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for OpenCV, PyTorch, and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir scipy -r requirements.txt

# Copy backend source code
COPY . /app

# Ensure runtime directories exist
RUN mkdir -p /app/uploads /app/detections /app/logs

EXPOSE 8000

# Health check to ensure FastAPI is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/docs || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
