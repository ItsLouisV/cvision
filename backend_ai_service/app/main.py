from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.supabase import supabase
from app.core.gemini import gemini
from app.api import cv, jobs, interview
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Khởi tạo FastAPI
app = FastAPI(
    title="Job Match AI API",
    description="AI-powered Job Matching & Interview System",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Khởi tạo services
@app.on_event("startup")
async def startup():
    logger.info("🚀 Khởi động Job Match AI Service...")

    # Khởi tạo Supabase
    supabase.init()
    logger.info("✅ Supabase ready")

    # Khởi tạo Gemini
    gemini.model  # Test connection
    logger.info("✅ Gemini AI ready")

    logger.info("🎯 Service sẵn sàng!")


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Job Match AI",
        "version": "1.0.0"
    }


# API Routes
app.include_router(cv.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)