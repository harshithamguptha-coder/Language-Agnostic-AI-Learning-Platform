import json
import logging
import os
import random
import re
import time

import requests

from backend.services.ai_service import OLLAMA_HOST, OLLAMA_MODEL

QUIZ_MAX_NOTES_CHARS = int(os.getenv("QUIZ_MAX_NOTES_CHARS", "3000"))
QUIZ_OLLAMA_TIMEOUT_SECONDS = int(os.getenv("QUIZ_OLLAMA_TIMEOUT_SECONDS", "90"))
QUIZ_NUM_PREDICT = int(os.getenv("QUIZ_NUM_PREDICT", "150"))
QUIZ_OLLAMA_MAX_TOKENS = int(os.getenv("QUIZ_OLLAMA_MAX_TOKENS", "150"))
QUIZ_QUESTION_COUNT = int(os.getenv("QUIZ_QUESTION_COUNT", "2"))
QUIZ_MAX_QUESTION_COUNT = int(os.getenv("QUIZ_MAX_QUESTION_COUNT", "5"))
QUIZ_CHUNK_MIN_SIZE = int(os.getenv("QUIZ_CHUNK_MIN_SIZE", "1000"))
QUIZ_CHUNK_MAX_SIZE = int(os.getenv("QUIZ_CHUNK_MAX_SIZE", "1500"))
QUIZ_SELECTED_CHUNKS = int(os.getenv("QUIZ_SELECTED_CHUNKS", "3"))
QUIZ_MAX_CHUNKS = int(os.getenv("QUIZ_MAX_CHUNKS", "40"))
QUIZ_MAX_SOURCE_CHARS = int(os.getenv("QUIZ_MAX_SOURCE_CHARS", "40000"))
QUIZ_TOO_LARGE_MESSAGE = (
    "The document is too large for local Mistral quiz generation. "
    "Please upload a shorter document or reduce the quiz size."
)

logger = logging.getLogger(__name__)


def generate_quiz_from_text(
    notes_text: str,
    question_count: int | None = None,
    difficulty: str = "Easy",
    retry_items: list[dict] | None = None,
) -> dict:
    started_at = time.perf_counter()
    requested_count = _normalize_question_count(question_count)
    normalized_difficulty = _normalize_difficulty(difficulty)
    raw_text = re.sub(r"\s+", " ", notes_text).strip()
    chunks = _split_text_into_chunks(raw_text)
    if len(chunks) > QUIZ_MAX_CHUNKS and len(raw_text) > QUIZ_MAX_SOURCE_CHARS:
        logger.warning(
            "Quiz document too large for local inference: total_chars=%s, total_chunks=%s",
            len(raw_text),
            len(chunks),
        )
        raise ValueError(QUIZ_TOO_LARGE_MESSAGE)

    selected_chunks = _select_quiz_chunks(chunks, requested_count)
    logger.info(
        "Quiz generation started: total_chars=%s, total_chunks=%s, selected_chunks=%s, questions=%s, difficulty=%s, timeout=%ss",
        len(raw_text),
        len(chunks),
        len(selected_chunks),
        requested_count,
        normalized_difficulty,
        QUIZ_OLLAMA_TIMEOUT_SECONDS,
    )
    prompt = _build_quiz_prompt(selected_chunks, requested_count, normalized_difficulty, retry_items)
    response_text = _ask_ollama_for_quiz(prompt)
    try:
        quiz = _parse_quiz_json(response_text, requested_count)
    except ValueError as exc:
        logger.exception("Quiz JSON parsing failed. Raw model output follows:\n%s", response_text)
        logger.warning("Using fallback quiz because model returned invalid JSON: %s", exc)
        quiz = _fallback_quiz_from_text(excerpt, requested_count)
    logger.info("Quiz generation finished in %.2fs", time.perf_counter() - started_at)
    return quiz


def _build_quiz_prompt(
    selected_chunks: list[str],
    question_count: int,
    difficulty: str,
    retry_items: list[dict] | None = None,
) -> str:
    retry_instruction = ""
    if retry_items:
        weak_topics = "; ".join(
            str(item.get("question", "")).strip()
            for item in retry_items
            if item.get("question")
        )[:1000]
        retry_instruction = (
            "Retry mode: create new rephrased questions only for these missed ideas. "
            "Keep the same topic, but twist the wording and options. "
            f"Missed ideas: {weak_topics}\n"
        )

    chunk_text = "\n\n".join(
        f"Chunk {index + 1}:\n{chunk}" for index, chunk in enumerate(selected_chunks)
    )
    prompt = (
        f"Generate exactly {question_count} MCQs.\n"
        "Return ONLY valid JSON.\n"
        "Use only the selected notes chunks below. Do not use any other document content.\n"
        "Format:\n"
        "[\n"
        "{\n"
        "\"question\": \"...\",\n"
        "\"options\": [\"A\", \"B\", \"C\", \"D\"],\n"
        "\"answer\": \"...\"\n"
        "}\n"
        "]\n"
        "Selected notes chunks:\n"
        f"{chunk_text}\n"
    )
    if difficulty:
        prompt += f"Difficulty: {difficulty}\n"
    if retry_instruction:
        prompt += f"{retry_instruction}\n"
    return prompt


def _ask_ollama_for_quiz(prompt: str) -> str:
    started_at = time.perf_counter()
    logger.info(
        "Ollama quiz request start: url=%s, model=%s, prompt_chars=%s, num_predict=%s",
        f"{OLLAMA_HOST}/api/generate",
        OLLAMA_MODEL,
        len(prompt),
        QUIZ_NUM_PREDICT,
    )
    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0,
                "num_predict": QUIZ_NUM_PREDICT,
                "max_tokens": QUIZ_OLLAMA_MAX_TOKENS,
                "num_ctx": 4096,
            },
        },
        timeout=QUIZ_OLLAMA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    elapsed = time.perf_counter() - started_at
    logger.info("Ollama quiz response received: status=%s, elapsed=%.2fs", response.status_code, elapsed)
    try:
        data = response.json()
        response_text = data.get("response", "") if isinstance(data, dict) else ""
    except ValueError:
        response_text = response.text or ""
        logger.warning("Ollama quiz response JSON decode failed; using raw text.\n%s", response_text)
    if not response_text:
        response_text = response.text or ""
    logger.info("Raw Ollama quiz response:\n%s", response_text)
    return response_text


def run_direct_quiz_test() -> dict:
    started_at = time.perf_counter()
    prompt = _build_quiz_prompt(
        _select_quiz_chunks(_split_text_into_chunks(
            "Photosynthesis is how plants use sunlight, water, and carbon dioxide to make food and oxygen."
        ), QUIZ_QUESTION_COUNT),
        QUIZ_QUESTION_COUNT,
        "Easy",
    )
    response_text = _ask_ollama_for_quiz(prompt)
    try:
        quiz = _parse_quiz_json(response_text, QUIZ_QUESTION_COUNT)
        parse_error = None
    except ValueError as exc:
        logger.exception("Direct quiz test JSON parsing failed. Raw model output follows:\n%s", response_text)
        quiz = _fallback_quiz_from_text("Photosynthesis helps plants make food using sunlight.", QUIZ_QUESTION_COUNT)
        parse_error = str(exc)
    return {
        "elapsed_seconds": round(time.perf_counter() - started_at, 2),
        "prompt_chars": len(prompt),
        "raw_response": response_text,
        "parse_error": parse_error,
        "quiz": quiz,
    }


def _prepare_notes_excerpt(notes_text: str) -> str:
    compact_text = re.sub(r"\s+", " ", notes_text).strip()
    if len(compact_text) <= QUIZ_MAX_NOTES_CHARS:
        return compact_text

    excerpt = compact_text[:QUIZ_MAX_NOTES_CHARS]
    last_sentence_end = max(excerpt.rfind("."), excerpt.rfind("?"), excerpt.rfind("!"))
    if last_sentence_end > QUIZ_MAX_NOTES_CHARS * 0.7:
        excerpt = excerpt[: last_sentence_end + 1]
    return excerpt


def _split_text_into_chunks(text: str) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for word in words:
        if current and current_len + len(word) + 1 > QUIZ_CHUNK_MAX_SIZE:
            if current_len < QUIZ_CHUNK_MIN_SIZE:
                current.append(word)
                current_len += len(word) + 1
                continue
            chunks.append(" ".join(current).strip())
            current = [word]
            current_len = len(word) + 1
        else:
            current.append(word)
            current_len += len(word) + 1

    if current:
        chunks.append(" ".join(current).strip())

    return chunks


def _select_quiz_chunks(chunks: list[str], question_count: int) -> list[str]:
    if not chunks:
        return []

    selected_count = min(QUIZ_SELECTED_CHUNKS, len(chunks))
    if len(chunks) <= selected_count:
        return chunks

    # Select a few representative chunks to keep local inference fast.
    return random.sample(chunks, selected_count)


def _parse_quiz_json(response_text: str, question_count: int) -> dict:
    logger.info("Parsing quiz JSON: raw_chars=%s", len(response_text))
    logger.info("Raw model output before JSON parsing:\n%s", response_text)
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        quiz_json = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("Direct JSON parse failed: %s", exc)
        match = re.search(r"(\[.*?\]|\{.*?\})", cleaned, re.DOTALL)
        if not match:
            raise ValueError("AI did not return any JSON structure")
        try:
            quiz_json = json.loads(match.group(1))
        except json.JSONDecodeError as nested_exc:
            raise ValueError(f"AI returned invalid quiz JSON: {nested_exc}") from nested_exc

    if isinstance(quiz_json, list):
        questions = quiz_json
    elif isinstance(quiz_json, dict):
        if isinstance(quiz_json.get("questions"), list):
            questions = quiz_json["questions"]
        elif "question" in quiz_json:
            questions = [quiz_json]
        else:
            raise ValueError("Quiz JSON must contain a question array or a single question object")
    else:
        raise ValueError("Quiz JSON must be a JSON array or object")

    normalized_questions = []
    for item in questions[:question_count]:
        question = str(item.get("question", "")).strip()
        options = item.get("options", [])
        answer_value = str(item.get("answer") or item.get("correct_answer") or "").strip()

        if not question or not isinstance(options, list) or len(options) != 4:
            raise ValueError("Each quiz question must contain 4 options")

        normalized_options = [str(option).strip() for option in options]
        if len(answer_value) == 1 and answer_value.upper() in {"A", "B", "C", "D"}:
            answer_index = ord(answer_value.upper()) - 65
            if 0 <= answer_index < len(normalized_options):
                answer_value = normalized_options[answer_index]

        if answer_value not in normalized_options:
            raise ValueError("Correct answer must match one of the options")

        normalized_questions.append(
            {
                "question": question,
                "options": normalized_options,
                "correct_answer": answer_value,
            }
        )

    if len(normalized_questions) < 1:
        raise ValueError("No valid quiz questions found")

    logger.info("Quiz JSON parsed successfully: returned_questions=%s, requested=%s", len(normalized_questions), question_count)
    return {"questions": normalized_questions}


def _fallback_quiz_from_text(notes_excerpt: str, question_count: int) -> dict:
    subject = notes_excerpt[:80].strip() or "the uploaded notes"
    return {
        "questions": [
            {
                "question": f"What is the main topic of these notes: {subject}?",
                "options": ["Main idea", "Unrelated fact", "Random term", "None"],
                "correct_answer": "Main idea",
            },
            {
                "question": "What should you review first from the notes?",
                "options": ["Key points", "Page numbers", "File name", "Font size"],
                "correct_answer": "Key points",
            },
            {
                "question": "What is the best way to use this quiz?",
                "options": ["Revise notes", "Ignore notes", "Skip answers", "Close app"],
                "correct_answer": "Revise notes",
            },
        ][:question_count]
    }


def _normalize_question_count(question_count: int | None) -> int:
    if question_count is None:
        return QUIZ_QUESTION_COUNT
    return max(1, min(int(question_count), QUIZ_MAX_QUESTION_COUNT))


def _normalize_difficulty(difficulty: str) -> str:
    normalized = difficulty.strip().title()
    return normalized if normalized in {"Easy", "Medium", "Hard"} else "Easy"
