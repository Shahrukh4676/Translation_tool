import os
import sys
import asyncio
import logging

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from routers import transliterate, overrides
from services.pdf_processor import pdf_jobs

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("akshara.main")

# Concurrency Semaphore to cap maximum heavy OCR/PDF tasks to 3 simultaneous jobs
CONCURRENCY_SEMAPHORE = asyncio.Semaphore(3)

# Rate Limiter setup (20 requests per minute per IP)
limiter = Limiter(key_func=get_remote_address, default_limits=["20 per minute"])

app = FastAPI(
    title="Akshara | Kannada-to-Devanagari Transliteration API",
    description="Deterministic script transliteration engine for Kannada to Devanagari using Aksharamukha.",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transliterate.router)
app.include_router(overrides.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Kannada-to-Devanagari Transliteration Engine"}

@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    """General status polling endpoint for async background OCR & PDF jobs."""
    if job_id not in pdf_jobs:
        return {"job_id": job_id, "status": "not_found", "progress": 0}
    return pdf_jobs[job_id]

# Serve static files for frontend React app in production
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(dist_path):
    logger.info(f"Serving static frontend files from: {dist_path}")
    
    # Mount assets folder
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
        
    # Catch-all route to serve index.html for SPA routing (React Router)
    @app.get("/{fallback:path}")
    async def fallback_route(request: Request, fallback: str):
        # Do not hijack API paths
        if fallback.startswith("api/") or fallback.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Serve favicon or other static root files if they exist
        file_path = os.path.join(dist_path, fallback)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        index_path = os.path.join(dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend file not found")
