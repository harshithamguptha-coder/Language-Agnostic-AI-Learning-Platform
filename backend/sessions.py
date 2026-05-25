from typing import Any, Dict, Optional

# Global session store keyed by session_id.
sessions: Dict[str, Dict[str, Any]] = {}


def create_session(session_id: str) -> Dict[str, Any]:
    """Initialize a session with the start step."""
    session = {
        "session_id": session_id,
        "step": "start",
        "data": {},
    }
    sessions[session_id] = session
    return session


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a session by ID."""
    return sessions.get(session_id)


def update_session(session_id: str, step: str, data: Dict[str, Any]) -> None:
    """Store updated step and data in an existing session."""
    if session_id in sessions:
        sessions[session_id]["step"] = step
        sessions[session_id]["data"] = data


def all_sessions() -> Dict[str, Dict[str, Any]]:
    """Return all active sessions."""
    return sessions
