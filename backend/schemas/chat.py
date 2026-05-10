from pydantic import BaseModel, Field
from typing import List, Optional


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    language_hint: Optional[str] = None
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    query: str
    response: str
    created_at: str
    session_id: int


class HistoryResponse(BaseModel):
    history: List[ChatResponse]


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str


class ChatSessionsResponse(BaseModel):
    sessions: List[ChatSessionResponse]


class UploadResponse(BaseModel):
    message: str
    extracted_text: str
    ai_answer: str
    session_id: Optional[int] = None
    file_name: str
    file_type: str
    extraction_method: str
    page_count: Optional[int] = None
    ocr_pages: int = 0
    average_confidence: Optional[float] = None
    text_length: int
