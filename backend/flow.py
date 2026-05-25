from typing import Dict, List, Tuple

from ai import log_analyzing, log_eligibility, log_submitting


def _next_step(current_step: str) -> str:
    transitions = {
        "start": "ask_type",
        "ask_type": "ask_location",
        "ask_location": "upload",
        "upload": "eligibility",
        "eligibility": "submit",
        "submit": "done",
    }
    return transitions.get(current_step, "done")


def _is_blank(value: str) -> bool:
    return not value.strip()


def process_chat(session: Dict[str, object], user_input: str) -> Tuple[str, str, List[str], Dict[str, object]]:
    step = session["step"]
    data = dict(session["data"])
    logs: List[str] = [log_analyzing(), f"Current step: {step}"]
    text = user_input.strip()

    if step == "start":
        reply = "Welcome! What type of business are you planning?"
        next_step = _next_step(step)
        logs.append(f"Transitioning {step} -> {next_step}.")
        return reply, next_step, logs, data

    if step == "ask_type":
        if _is_blank(text):
            logs.append("Missing business type.")
            return "Please provide your business type.", step, logs, data
        data["business_type"] = text
        logs.append(f"Captured business type: {text}.")
        next_step = _next_step(step)
        logs.append(f"Transitioning {step} -> {next_step}.")
        return "Great. Where will your business be located?", next_step, logs, data

    if step == "ask_location":
        if _is_blank(text):
            logs.append("Missing location.")
            return "Please provide your business location.", step, logs, data
        data["location"] = text
        logs.append(f"Captured location: {text}.")
        next_step = _next_step(step)
        logs.append(f"Transitioning {step} -> {next_step}.")
        return "Thank you. Please upload your documents using /upload.", next_step, logs, data

    if step == "upload":
        logs.append("Upload pending; chat ignored.")
        return "Please upload your documents first by calling /upload.", step, logs, data

    if step == "eligibility":
        if _is_blank(text):
            logs.append("Missing age.")
            return "Please provide your age.", step, logs, data
        logs.append(log_eligibility())
        try:
            age = int(text)
        except ValueError:
            logs.append(f"Invalid age provided: {text}.")
            return "Age must be a number.", step, logs, data
        data["age"] = age
        data["eligibility"] = "Startup India scheme" if age < 35 else "Standard review"
        logs.append(f"Eligibility set to {data['eligibility']}.")
        next_step = _next_step(step)
        logs.append(f"Transitioning {step} -> {next_step}.")
        return "Eligibility checked. Reply yes to submit.", next_step, logs, data

    if step == "submit":
        if _is_blank(text):
            logs.append("Missing submission confirmation.")
            return "Please reply yes to submit.", step, logs, data
        if text.lower() in {"yes", "y", "submit", "confirm"}:
            logs.append(log_submitting())
            data["submitted"] = True
            next_step = _next_step(step)
            logs.append(f"Transitioning {step} -> {next_step}.")
            return "Your application has been submitted.", next_step, logs, data
        logs.append(f"Submission declined: {text}.")
        return "Submission not confirmed. Reply yes to submit.", step, logs, data

    if step == "done":
        logs.append("Session already complete.")
        return "Your application is complete.", step, logs, data

    logs.append("Unknown step encountered.")
    return "Unable to continue the flow.", step, logs, data


def process_upload(session: Dict[str, object], file_name: str) -> Tuple[str, str, List[str], Dict[str, object]]:
    step = session["step"]
    data = dict(session["data"])
    logs: List[str] = [log_analyzing(), f"Current step: {step}"]

    if step != "upload":
        logs.append("Upload attempted at wrong step.")
        return "Upload is only allowed after location is provided.", step, logs, data

    if _is_blank(file_name):
        logs.append("Missing file name.")
        return "Please provide a file_name for upload.", step, logs, data

    data["uploaded_file"] = file_name
    logs.append(f"Simulated processing of file {file_name}.")
    next_step = _next_step(step)
    logs.append(f"Transitioning {step} -> {next_step}.")
    return "Document processed. Please provide your age.", next_step, logs, data
