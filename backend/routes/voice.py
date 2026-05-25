from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from gtts import gTTS
from pydantic import BaseModel, Field

from backend.auth import get_current_user

router = APIRouter(prefix="/voice", tags=["voice"])


class TextToSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    language: str = Field("en", min_length=2, max_length=8)


@router.post("/speak")
def speak(payload: TextToSpeechRequest, _user=Depends(get_current_user)):
    try:
        audio_buffer = BytesIO()
        tts = gTTS(text=payload.text, lang=payload.language)
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate speech") from exc

    return StreamingResponse(audio_buffer, media_type="audio/mpeg")
