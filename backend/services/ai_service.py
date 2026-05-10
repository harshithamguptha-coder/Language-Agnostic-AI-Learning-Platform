import os
import re
from pathlib import Path

import requests
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")
load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "500"))

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
    "ro": "English",
    "kannada": "Kannada",
    "hindi": "Hindi",
    "english": "English",
}

ENGLISH_STUDY_COMMANDS = {
    "answer",
    "define",
    "describe",
    "explain",
    "explain this",
    "notes",
    "outline",
    "quiz me",
    "summary",
    "summarise",
    "summarize",
    "summarize it",
    "summarize this",
}

TRANSLATION_PATTERNS = [
    re.compile(r"translate\s+(?P<text>.+?)\s+(?:to|into|in)\s+(?P<target>kannada|hindi|english)", re.IGNORECASE | re.DOTALL),
    re.compile(r"(?P<text>.+?)\s+(?:to|into|in)\s+(?P<target>kannada|hindi|english)\s*(?:translation)?", re.IGNORECASE | re.DOTALL),
]

EDUCATIONAL_TRANSLATIONS = {
    "Kannada": {
        "machine learning": "ಯಂತ್ರ ಕಲಿಕೆ",
        "artificial intelligence": "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ",
        "ai": "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ",
        "a class of": "ಒಂದು ವಿಭಾಗವಾಗಿದೆ",
        "is a class of": "ಒಂದು ವಿಭಾಗವಾಗಿದೆ",
        "machine learning is a class of ai": "ಯಂತ್ರ ಕಲಿಕೆ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯ ಒಂದು ವಿಭಾಗವಾಗಿದೆ.",
        "machine learning is a subset of ai": "ಯಂತ್ರ ಕಲಿಕೆ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯ ಒಂದು ಉಪವಿಭಾಗವಾಗಿದೆ.",
        "machine learning is a branch of ai": "ಯಂತ್ರ ಕಲಿಕೆ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯ ಒಂದು ಶಾಖೆಯಾಗಿದೆ.",
    },
    "Hindi": {
        "machine learning": "मशीन लर्निंग",
        "artificial intelligence": "कृत्रिम बुद्धिमत्ता",
        "ai": "कृत्रिम बुद्धिमत्ता",
        "machine learning is a class of ai": "मशीन लर्निंग कृत्रिम बुद्धिमत्ता का एक वर्ग है।",
        "machine learning is a subset of ai": "मशीन लर्निंग कृत्रिम बुद्धिमत्ता का एक उपसमूह है।",
        "machine learning is a branch of ai": "मशीन लर्निंग कृत्रिम बुद्धिमत्ता की एक शाखा है।",
    },
}


def detect_language(text: str) -> str:
    from langdetect import detect

    normalized_text = re.sub(r"\s+", " ", text.strip().lower()).strip(" .?!")
    if normalized_text in ENGLISH_STUDY_COMMANDS:
        return "en"
    if len(normalized_text.split()) <= 2 and re.fullmatch(r"[a-z\s]+", normalized_text):
        return "en"

    try:
        language = detect(text)
        return language if language in {"en", "hi", "kn"} else "en"
    except Exception:
        return "en"


def detect_translation_request(query: str) -> tuple[str, str] | None:
    normalized_query = query.strip().strip('"').strip("'")
    for pattern in TRANSLATION_PATTERNS:
        match = pattern.fullmatch(normalized_query)
        if match:
            text = match.group("text").strip(" :,-\n\t\"'")
            target = match.group("target").lower()
            if text and target in LANGUAGE_NAMES:
                return text, LANGUAGE_NAMES[target]
    return None


def glossary_translate(text: str, target_language: str) -> str | None:
    glossary = EDUCATIONAL_TRANSLATIONS.get(target_language)
    if not glossary:
        return None

    normalized_text = re.sub(r"\s+", " ", text.strip().lower()).strip(" .?!")
    if normalized_text in glossary:
        return glossary[normalized_text]

    translated_text = text
    replacements = sorted(glossary.items(), key=lambda item: len(item[0]), reverse=True)
    replaced_any = False
    for source, translated in replacements:
        if source in {
            "machine learning is a class of ai",
            "machine learning is a subset of ai",
            "machine learning is a branch of ai",
        }:
            continue
        pattern = re.compile(rf"\b{re.escape(source)}\b", re.IGNORECASE)
        translated_text, count = pattern.subn(translated, translated_text)
        replaced_any = replaced_any or count > 0

    return translated_text if replaced_any else None


def build_prompt(query: str, language_hint: str | None = None, context: str | None = None) -> str:
    translation_request = detect_translation_request(query)
    if translation_request:
        text_to_translate, target_language = translation_request
        return (
            f"You are a precise educational translator. Translate the text below into {target_language} only.\n"
            f"Rules:\n"
            f"- Output only the translation.\n"
            f"- Do not explain the translation.\n"
            f"- Do not mix Hindi, English, or any other language unless a technical term truly has no natural equivalent.\n"
            f"- For Kannada, write in Kannada script and prefer natural educational Kannada.\n"
            f"- For Hindi, write in Devanagari script and prefer natural educational Hindi.\n\n"
            f"Text:\n{text_to_translate}"
        )

    output_language = LANGUAGE_NAMES.get((language_hint or "en").lower(), "English")

    if context:
        prompt = (
            f"You are an AI educational assistant. Answer in {output_language}. "
            f"Use the context section to answer the question. If the context looks noisy because it came from OCR, "
            f"summarize only the clearly readable parts and mention when the scan quality is unclear. "
            f"Respond clearly and concisely.\n\n"
            f"Context:\n{context}\n\nQuestion:\n{query}"
        )
    else:
        prompt = (
            f"You are an AI educational assistant. Answer educational questions in {output_language}. "
            f"Use examples when appropriate and keep explanations student-friendly.\n\nQuestion:\n{query}"
        )
    if language_hint:
        prompt += f"\n\nPreferred language: {output_language}."
    return prompt


def generate_response(query: str, language_hint: str | None = None, context: str | None = None) -> str:
    translation_request = detect_translation_request(query)
    if translation_request:
        text_to_translate, target_language = translation_request
        glossary_answer = glossary_translate(text_to_translate, target_language)
        if glossary_answer:
            return glossary_answer

    prompt = build_prompt(query, language_hint, context)
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful multilingual educational assistant."},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {
            "temperature": 0.5,
            "num_predict": OLLAMA_NUM_PREDICT,
        },
    }
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict):
            message = data.get("message")
            if isinstance(message, dict) and message.get("content"):
                return message["content"].strip()
            if data.get("response"):
                return data["response"].strip()
        return "I could not generate an answer at this time. Please try again later."
    except requests.RequestException as exc:
        return f"AI service is unavailable: {exc}"
