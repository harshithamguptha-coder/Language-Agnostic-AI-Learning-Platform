import os
import json
import logging
import time

import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.auth import get_current_user
from backend.schemas.quiz import QuizResponse
from backend.services.document_service import extract_text_from_upload
from backend.services.quiz_service import generate_quiz_from_text, run_direct_quiz_test

router = APIRouter(prefix="/quiz", tags=["quiz"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
QUIZ_FILE_TYPES = {".pdf", ".docx", ".txt"}


@router.post("/generate", response_model=QuizResponse)
def generate_quiz(
    file: UploadFile = File(...),
    question_count: int = Form(default=2),
    difficulty: str = Form(default="Easy"),
    retry_items: str | None = Form(default=None),
    _user=Depends(get_current_user),
):
    started_at = time.perf_counter()
    logger.info("Quiz route reached: file=%s", file.filename)
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in QUIZ_FILE_TYPES:
        raise HTTPException(status_code=400, detail="Upload a PDF, DOCX, or TXT file for quiz generation")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    try:
        extraction_started_at = time.perf_counter()
        extracted = extract_text_from_upload(file, UPLOAD_DIR)
        logger.info(
            "Quiz upload extracted: file=%s, chars=%s, method=%s, elapsed=%.2fs",
            extracted.file_name,
            extracted.text_length,
            extracted.extraction_method,
            time.perf_counter() - extraction_started_at,
        )
        generation_started_at = time.perf_counter()
        retry_payload = json.loads(retry_items) if retry_items else None
        quiz = generate_quiz_from_text(
            extracted.text,
            question_count=question_count,
            difficulty=difficulty,
            retry_items=retry_payload,
        )
        logger.info("Quiz model pipeline elapsed %.2fs", time.perf_counter() - generation_started_at)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except requests.Timeout as exc:
        raise HTTPException(
            status_code=504,
            detail="Quiz generation took too long. Try a shorter document or regenerate once Ollama is idle.",
        ) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail="AI service is unavailable. Check that Ollama Mistral is running.") from exc

    logger.info("Quiz request completed in %.2fs", time.perf_counter() - started_at)
    return {
        "file_name": extracted.file_name,
        "file_type": extracted.file_type,
        "text_length": extracted.text_length,
        "quiz": quiz,
    }


@router.get("/test")
def test_quiz_generation():
    started_at = time.perf_counter()
    logger.info("Quiz test route reached")
    try:
        result = run_direct_quiz_test()
    except requests.Timeout as exc:
        logger.exception("Quiz test timed out after %.2fs", time.perf_counter() - started_at)
        raise HTTPException(
            status_code=504,
            detail="Direct Ollama quiz test timed out. The issue is inside the local Ollama/model call.",
        ) from exc
    except requests.RequestException as exc:
        logger.exception("Quiz test Ollama request failed after %.2fs", time.perf_counter() - started_at)
        raise HTTPException(
            status_code=503,
            detail="Direct Ollama quiz test failed. Check that Ollama is running and the Mistral model is available.",
        ) from exc

    logger.info("Quiz test route completed in %.2fs", time.perf_counter() - started_at)
    return result
