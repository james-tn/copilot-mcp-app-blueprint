# Pega Blueprint MCP server — container image for Azure Container Apps.
# Pure-Python deps only (no compiled wheels), so the build is fast and reliable.
FROM python:3.11-slim

# Don't write .pyc, unbuffer stdout/stderr for live logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PEGA_MCP_HOST=0.0.0.0 \
    PEGA_MCP_PORT=8000

WORKDIR /app

# Install dependencies first (better layer caching).
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application (includes pega_mcp/web/widget.html).
COPY pega_mcp ./pega_mcp
COPY pyproject.toml ./

EXPOSE 8000

# Container Apps sends traffic to the ingress target port (8000). The module-level
# `app = build_app()` in pega_mcp/server.py is the ASGI entry point.
CMD ["python", "-m", "uvicorn", "pega_mcp.server:app", "--host", "0.0.0.0", "--port", "8000"]
