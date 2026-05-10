import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.auth import get_current_user
from backend.database import get_db
from backend.services.document_service import extract_text_from_upload
from backend.services.ai_service import generate_response, detect_language
from backend.models.chat_history import ChatHistory
from backend.schemas.chat import UploadResponse

router = APIRouter(prefix="", tags=["upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


@router.post("/upload", response_model=UploadResponse)
def upload_document(
    file: UploadFile = File(...),
    question: str | None = Form(default=None),
    session_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    try:
        extracted = extract_text_from_upload(file, UPLOAD_DIR)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    active_session_id = None
    if question:
        from backend.routes.chat import _get_or_create_session

        session = _get_or_create_session(db, user.id, session_id, question)
        active_session_id = session.id
        session.updated_at = func.now()
        language_hint = detect_language(question)
        answer = generate_response(question, language_hint, context=extracted.text)
        history = ChatHistory(user_id=user.id, session_id=session.id, query=question, response=answer)
        db.add(history)
        db.commit()
    else:
        answer = "File processed successfully. Ask a question to get answers based on the document."
    return {
        "message": "Upload successful",
        "extracted_text": extracted.text,
        "ai_answer": answer,
        "session_id": active_session_id,
        **extracted.metadata(),
    }
