from typing import Any, Dict, List


def make_response(reply: str, step: str, logs: List[str], extra: Dict[str, Any] = None) -> Dict[str, Any]:
    """Standard response format for the API."""
    response = {
        "reply": reply,
        "step": step,
        "status": get_status(step),
        "logs": logs,
    }
    if extra:
        response.update(extra)
    return response


def get_status(step: str) -> str:
    """Derive a session status from the current flow step."""
    return "complete" if step == "done" else "in_progress"


def log_analyzing() -> str:
    return "Analyzing input..."


def log_eligibility() -> str:
    return "Checking eligibility..."


def log_submitting() -> str:
    return "Submitting application..."
