import json
import logging
import os
import re
import time

import requests

from backend.services.ai_service import OLLAMA_HOST, OLLAMA_MODEL

QUIZ_MAX_NOTES_CHARS = int(os.getenv("QUIZ_MAX_NOTES_CHARS", "3000"))
QUIZ_OLLAMA_TIMEOUT_SECONDS = int(os.getenv("QUIZ_OLLAMA_TIMEOUT_SECONDS", "40"))
QUIZ_NUM_PREDICT = int(os.getenv("QUIZ_NUM_PREDICT", "320"))
QUIZ_QUESTION_COUNT = int(os.getenv("QUIZ_QUESTION_COUNT", "2"))
QUIZ_MAX_QUESTION_COUNT = int(os.getenv("QUIZ_MAX_QUESTION_COUNT", "5"))

logger = logging.getLogger(__name__)


def generate_quiz_from_text(
    notes_text: str,
    question_count: int | None = None,
    difficulty: str = "Easy",
    retry_items: list[dict] | None = None,
) -> dict:
    started_at = time.perf_counter()
    excerpt = _prepare_notes_excerpt(notes_text)
    requested_count = _normalize_question_count(question_count)
    normalized_difficulty = _normalize_difficulty(difficulty)
    logger.info(
        "Quiz generation started: extracted_chars=%s, excerpt_chars=%s, questions=%s, difficulty=%s, max_chars=%s, timeout=%ss",
        len(notes_text),
        len(excerpt),
        requested_count,
        normalized_difficulty,
        QUIZ_MAX_NOTES_CHARS,
        QUIZ_OLLAMA_TIMEOUT_SECONDS,
    )
    prompt = _build_quiz_prompt(excerpt, requested_count, normalized_difficulty, retry_items)
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
    notes_excerpt: str,
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

    return (
        f"Make exactly {question_count} {difficulty.lower()} MCQs from these notes.\n"
        f"{retry_instruction}"
        "Use short student-friendly wording. Return JSON only.\n"
        'Shape: {"questions":[{"question":"q","options":["a","b","c","d"],"correct_answer":"a"}]}\n'
        f"Notes: {notes_excerpt}"
    )


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
                "num_ctx": 4096,
            },
        },
        timeout=QUIZ_OLLAMA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    logger.info("Ollama quiz request end: elapsed=%.2fs, status=%s", time.perf_counter() - started_at, response.status_code)
    data = response.json()
    response_text = data.get("response", "") if isinstance(data, dict) else ""
    logger.info("Raw Ollama quiz response:\n%s", response_text)
    return response_text


def run_direct_quiz_test() -> dict:
    started_at = time.perf_counter()
    prompt = _build_quiz_prompt(
        "Photosynthesis is how plants use sunlight, water, and carbon dioxide to make food and oxygen.",
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


def _parse_quiz_json(response_text: str, question_count: int) -> dict:
    logger.info("Parsing quiz JSON: raw_chars=%s", len(response_text))
    logger.info("Raw model output before JSON parsing:\n%s", response_text)
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        quiz = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("Direct JSON parse failed: %s", exc)
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError("AI did not return quiz JSON")
        try:
            quiz = json.loads(match.group(0))
        except json.JSONDecodeError as nested_exc:
            raise ValueError(f"AI returned invalid quiz JSON: {nested_exc}") from nested_exc

    questions = quiz.get("questions")
    if questions is None and "question" in quiz:
        questions = [quiz]
    if not isinstance(questions, list) or len(questions) < 1:
        raise ValueError("Quiz JSON must contain questions")

    normalized_questions = []
    for item in questions[:question_count]:
        question = str(item.get("question", "")).strip()
        options = item.get("options", [])
        correct_answer = str(item.get("correct_answer") or item.get("answer") or "").strip()

        if not question or not isinstance(options, list) or len(options) != 4:
            raise ValueError("Each quiz question must contain 4 options")

        normalized_options = [str(option).strip() for option in options]
        if correct_answer not in normalized_options:
            raise ValueError("Correct answer must match one option")

        normalized_questions.append(
            {
                "question": question,
                "options": normalized_options,
                "correct_answer": correct_answer,
            }
        )

    if len(normalized_questions) < 1:
        raise ValueError("No valid quiz questions found")

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
