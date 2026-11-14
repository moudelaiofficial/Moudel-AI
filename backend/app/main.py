
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.search.routes import router as search_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://moudel-ai.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    search_router,
    prefix=f"{settings.api_v1_prefix}/search",
    tags=["Research Search"],
)


@app.get("/health/live", tags=["Health"])
async def liveness():
    return {"status": "ok"}


@app.get("/health/ready", tags=["Health"])
async def readiness():
    return {"status": "ok"}
