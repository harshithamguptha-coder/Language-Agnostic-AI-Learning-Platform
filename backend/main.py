import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from backend.database import initialize_database
from backend.routes import auth as auth_router
from backend.routes import chat as chat_router
from backend.routes import upload as upload_router

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI(
    title="AI-Powered Multilingual Educational Assistant API",
    version="1.0.0",
    description="FastAPI backend for a multilingual educational assistant using Ollama, OCR, and MySQL",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(upload_router.router)


@app.on_event("startup")
def startup_event():
    initialize_database()
    logging.info("Database tables created or verified")


@app.middleware("http")
async def catch_exceptions(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        logging.exception("Unhandled exception")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
