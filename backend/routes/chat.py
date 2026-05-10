from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.auth import get_current_user
from backend.database import get_db
from backend.services.ai_service import generate_response, detect_language
from backend.models.chat_history import ChatHistory, ChatSession
from backend.schemas.chat import ChatRequest, HistoryResponse, ChatResponse, ChatSessionsResponse

router = APIRouter(prefix="", tags=["chat"])


def _make_chat_title(query: str) -> str:
    title = " ".join(query.strip().split())
    if not title:
        return "New chat"
    return title[:57] + "..." if len(title) > 60 else title


def _get_or_create_session(db: Session, user_id: int, session_id: int | None, query: str | None = None) -> ChatSession:
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if query and session.title == "New chat":
            session.title = _make_chat_title(query)
        return session

    session = ChatSession(user_id=user_id, title=_make_chat_title(query or "New chat"))
    db.add(session)
    db.flush()
    return session


@router.post("/chat", response_model=ChatResponse)
def handle_chat(payload: ChatRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = _get_or_create_session(db, user.id, payload.session_id, payload.query)
    language_hint = payload.language_hint or detect_language(payload.query)
    answer = generate_response(payload.query, language_hint)
    if not answer:
        raise HTTPException(status_code=500, detail="Failed to generate AI response")
    session.updated_at = func.now()
    history = ChatHistory(user_id=user.id, session_id=session.id, query=payload.query, response=answer)
    db.add(history)
    db.commit()
    db.refresh(history)
    return {
        "query": history.query,
        "response": history.response,
        "created_at": history.created_at.isoformat(),
        "session_id": session.id,
    }


@router.get("/history/{user_id}", response_model=HistoryResponse)
def get_history(user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    records = db.query(ChatHistory).filter(ChatHistory.user_id == user_id).order_by(ChatHistory.created_at.desc()).all()
    return {
        "history": [
            {
                "query": record.query,
                "response": record.response,
                "created_at": record.created_at.isoformat(),
                "session_id": record.session_id or 0,
            }
            for record in records
        ]
    }


@router.get("/chat-sessions", response_model=ChatSessionsResponse)
def get_chat_sessions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
        .all()
    )
    return {
        "sessions": [
            {
                "id": session.id,
                "title": session.title,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
            }
            for session in sessions
        ]
    }


@router.post("/chat-sessions", response_model=dict)
def create_chat_session(db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = ChatSession(user_id=user.id, title="New chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


@router.get("/chat-sessions/{session_id}/messages", response_model=HistoryResponse)
def get_chat_session_messages(session_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    records = (
        db.query(ChatHistory)
        .filter(ChatHistory.session_id == session_id, ChatHistory.user_id == user.id)
        .order_by(ChatHistory.created_at.asc())
        .all()
    )
    return {
        "history": [
            {
                "query": record.query,
                "response": record.response,
                "created_at": record.created_at.isoformat(),
                "session_id": session.id,
            }
            for record in records
        ]
    }


@router.delete("/chat-sessions/{session_id}", response_model=dict)
def delete_chat_session(session_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted"}
