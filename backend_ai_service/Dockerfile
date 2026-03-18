# ---- Base image ----
FROM python:3.12-slim

LABEL maintainer="Louis"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Cài đặt các gói hệ thống tối thiểu (nếu sau này cần có thể bổ sung thêm tại đây)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Cài dependencies trước (tận dụng Docker cache layer)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy toàn bộ source code
COPY . .

EXPOSE 8000

# Chạy app bằng gunicorn + uvicorn worker (phù hợp production)
ENV PORT=8000
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "120"]
