from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


sessions: dict[str, dict[str, Any]] = {}

HOUSE_STEPS = [
    "ask_location",
    "show_documents",
    "show_permissions",
    "show_cost",
    "ask_proceed",
    "upload",
    "done",
]

BUSINESS_STEPS = [
    "ask_location",
    "show_documents",
    "show_permissions",
    "show_cost",
    "ask_proceed",
    "upload",
    "done",
]


class ChatRequest(BaseModel):
    message: str
    session_id: str


class PermissionsRequest(BaseModel):
    idea: str
    location: str


def create_response(
    reply: str,
    step: str,
    *,
    documents: list[str] | None = None,
    permissions: list[str] | None = None,
    offices: list[str] | None = None,
    cost_estimation: dict[str, str] | None = None,
    extracted_data: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    data: dict[str, Any] = {}

    if documents is not None:
        data["documents"] = documents
    if permissions is not None:
        data["permissions"] = permissions
    if offices is not None:
        data["offices"] = offices
    if cost_estimation is not None:
        data["cost_estimation"] = cost_estimation
    if extracted_data is not None:
        data["extracted_data"] = extracted_data

    return {
        "reply": reply,
        "step": step,
        "data": data,
    }


def detect_intent(message: str) -> str:
    lowered = message.lower()

    if "house" in lowered:
        return "house"
    if "business" in lowered:
        return "business"

    return ""


def get_or_create_session(session_id: str) -> dict[str, Any]:
    if session_id not in sessions:
        sessions[session_id] = {
            "flow": "",
            "step": "",
            "data": {
                "documents": [],
            },
        }
    return sessions[session_id]


def get_local_permissions(location: str) -> list[str]:
    if location.strip().lower() == "bangalore":
        return ["BBMP", "BESCOM", "BWSSB"]
    return ["Local Municipal Authority"]


def get_house_documents() -> list[str]:
    return [
        "Land ownership proof",
        "Building plan",
        "Aadhaar Card",
        "PAN Card",
        "Address Proof (optional)",
    ]


def get_business_documents() -> list[str]:
    return ["Business ID proof", "Address proof", "PAN card", "Registration form"]


def get_house_cost() -> dict[str, str]:
    return {
        "approval_fee": "Rs. 50,000",
        "construction_estimate": "Rs. 10L - Rs. 50L",
    }


def get_business_cost() -> dict[str, str]:
    return {
        "registration_fee": "Rs. 10,000",
        "setup_estimate": "Rs. 50,000 - Rs. 5L",
    }


def extract_document_data(filename: str, text: str) -> dict[str, Any]:
    lowered_filename = filename.lower()

    if "aadhaar" in lowered_filename or "aadhaar" in text:
        return {
            "type": "aadhaar",
            "name": "Krupa G",
            "dob": "2006-07-23",
            "address": "J.P Nagar, Bangalore",
            "aadhaar": "2842 5249 6445",
            "gender": "Female",
        }

    if "pan" in lowered_filename or "pan" in text:
        return {
            "type": "pan",
            "name": "Krupa G",
            "dob": "2006-07-23",
            "pan": "BNTFE1296F",
        }

    if "land" in lowered_filename or "land" in text:
        return {
            "type": "property",
            "name": "Krupa G",
            "dob": "N/A",
            "plot_number": "A21",
            "location": "Bangalore",
        }

    if "plan" in lowered_filename or "plan" in text:
        return {
            "type": "building_plan",
            "approval_status": "Pending",
            "area": "1200 sq ft",
        }

    return {
        "type": "unknown",
        "name": "Test User",
        "dob": "2000-01-01",
    }


def get_permissions_explorer_data(idea: str, location: str) -> dict[str, Any]:
    normalized_idea = idea.lower()
    normalized_location = location.lower()

    if "house" in normalized_idea and normalized_location == "bangalore":
        return {
            "permissions": [
                {
                    "name": "Building Plan Approval",
                    "link": "https://bbmp.gov.in",
                },
                {
                    "name": "Online Plan Approval (BPAS)",
                    "link": "https://bpas.bbmpgov.in",
                },
                {
                    "name": "Electricity Connection",
                    "link": "https://bescom.karnataka.gov.in",
                },
                {
                    "name": "Water & Sewage Connection",
                    "link": "https://bwssb.karnataka.gov.in",
                },
                {
                    "name": "Occupancy Certificate",
                    "link": "https://bbmp.gov.in",
                },
            ]
        }

    return {
        "permissions": [
            {
                "name": "Local Authority Approval",
                "link": "https://services.india.gov.in",
            }
        ]
    }


def handle_house_flow(session: dict[str, Any], message: str) -> dict[str, Any]:
    message_lower = message.lower().strip()
    current_step = session["step"] or "ask_location"

    if current_step == "ask_location":
        location = message.strip()
        if not location or "house" in message_lower:
            session["step"] = "ask_location"
            return create_response(
                "Which city are you planning to build the house in?",
                "ask_location",
            )

        session["data"]["location"] = location
        session["data"].setdefault("documents", [])
        session["step"] = "show_documents"
        return create_response(
            "Here are the documents needed for the house approval process.",
            "show_documents",
            documents=get_house_documents(),
        )

    if current_step == "show_documents":
        permissions = get_local_permissions(session["data"].get("location", ""))
        session["step"] = "show_permissions"
        return create_response(
            "These permissions and offices are typically involved.",
            "show_permissions",
            permissions=permissions,
            offices=permissions,
        )

    if current_step == "show_permissions":
        session["step"] = "show_cost"
        return create_response(
            "Here is a rough cost estimate for the process.",
            "show_cost",
            cost_estimation=get_house_cost(),
        )

    if current_step == "show_cost":
        session["step"] = "ask_proceed"
        return create_response(
            "Do you want to proceed with application?",
            "ask_proceed",
        )

    if current_step == "ask_proceed":
        if any(word in message_lower for word in ["yes", "proceed", "continue"]):
            session["step"] = "upload"
            return create_response(
                "Please upload your document now.",
                "upload",
            )

        session["step"] = "done"
        return create_response(
            "Okay, the house workflow is paused. Come back anytime to continue.",
            "done",
        )

    if current_step == "upload":
        extracted_data = session["data"].get("documents", [])
        if extracted_data:
            session["step"] = "done"
            return create_response(
                "Document received and application workflow completed successfully.",
                "done",
                documents=get_house_documents(),
                extracted_data=extracted_data,
            )

        return create_response(
            "Please upload a document using the upload API to continue.",
            "upload",
        )

    return create_response(
        "House application workflow completed successfully.",
        "done",
        documents=get_house_documents(),
        extracted_data=session["data"].get("documents", []),
    )


def handle_business_flow(session: dict[str, Any], message: str) -> dict[str, Any]:
    message_lower = message.lower().strip()
    current_step = session["step"] or "ask_location"

    if current_step == "ask_location":
        location = message.strip()
        if not location or "business" in message_lower:
            session["step"] = "ask_location"
            return create_response(
                "Which city do you want to register the business in?",
                "ask_location",
            )

        session["data"]["location"] = location
        session["data"].setdefault("documents", [])
        session["step"] = "show_documents"
        return create_response(
            "These are the common documents required for business registration.",
            "show_documents",
            documents=get_business_documents(),
        )

    if current_step == "show_documents":
        permissions = get_local_permissions(session["data"].get("location", ""))
        session["step"] = "show_permissions"
        return create_response(
            "These permissions and offices usually apply for business setup.",
            "show_permissions",
            permissions=permissions,
            offices=permissions,
        )

    if current_step == "show_permissions":
        session["step"] = "show_cost"
        return create_response(
            "Here is a rough business setup cost estimate.",
            "show_cost",
            cost_estimation=get_business_cost(),
        )

    if current_step == "show_cost":
        session["step"] = "ask_proceed"
        return create_response(
            "Do you want to proceed with application?",
            "ask_proceed",
        )

    if current_step == "ask_proceed":
        if any(word in message_lower for word in ["yes", "proceed", "continue"]):
            session["step"] = "upload"
            return create_response(
                "Please upload your business document now.",
                "upload",
            )

        session["step"] = "done"
        return create_response(
            "Okay, the business workflow is paused. Come back anytime to continue.",
            "done",
        )

    if current_step == "upload":
        extracted_data = session["data"].get("documents", [])
        if extracted_data:
            session["step"] = "done"
            return create_response(
                "Business document received and workflow completed successfully.",
                "done",
                documents=get_business_documents(),
                extracted_data=extracted_data,
            )

        return create_response(
            "Please upload a document using the upload API to continue.",
            "upload",
        )

    return create_response(
        "Business workflow completed successfully.",
        "done",
        documents=get_business_documents(),
        extracted_data=session["data"].get("documents", []),
    )


@app.post("/chat")
async def chat(request: ChatRequest):
    session = get_or_create_session(request.session_id)
    detected_flow = detect_intent(request.message)

    if not session["flow"] and not detected_flow:
        return create_response(
            "Please tell me whether you need help with a house or business workflow.",
            "intent_detection",
        )

    if detected_flow:
        session["flow"] = detected_flow
        session["step"] = HOUSE_STEPS[0] if detected_flow == "house" else BUSINESS_STEPS[0]
        session["data"] = {"documents": []}

        if detected_flow == "house":
            return create_response(
                "Sure, let's start your house approval workflow. Which city are you planning to build the house in?",
                "ask_location",
            )

        return create_response(
            "Sure, let's start your business workflow. Which city do you want to register the business in?",
            "ask_location",
        )

    if session["flow"] == "house":
        return handle_house_flow(session, request.message)

    return handle_business_flow(session, request.message)


@app.post("/permissions")
def get_permissions_route(data: dict):
    idea = data.get("idea", "").lower()
    location = data.get("location", "").lower()

    if "bangalore" in location and (
        "house" in idea or
        "build" in idea or
        "permission" in idea
    ):
        return {
            "permissions": [
                {
                    "name": "Building Plan Approval",
                    "link": "https://bbmp.gov.in",
                },
                {
                    "name": "Online Plan Approval (BPAS)",
                    "link": "https://bpas.bbmpgov.in",
                },
                {
                    "name": "Land Authority Approval (BDA)",
                    "link": "https://bda.karnataka.gov.in",
                },
                {
                    "name": "Commencement Certificate",
                    "link": "https://bbmp.gov.in",
                },
                {
                    "name": "Electricity Connection (BESCOM)",
                    "link": "https://bescom.karnataka.gov.in",
                },
                {
                    "name": "Water & Sewage (BWSSB)",
                    "link": "https://bwssb.karnataka.gov.in",
                },
                {
                    "name": "Fire Safety NOC",
                    "link": "https://karnataka.gov.in",
                },
                {
                    "name": "Environmental Clearance",
                    "link": "https://kspcb.karnataka.gov.in",
                },
                {
                    "name": "Occupancy Certificate",
                    "link": "https://bbmp.gov.in",
                },
            ]
        }

    return {
        "permissions": [
            {
                "name": "Local Authority Approval",
                "link": "https://india.gov.in",
            }
        ]
    }


@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    session_id: str | None = Form(None),
):
    content = await file.read()
    text = content.decode(errors="ignore").lower()
    extracted_data = extract_document_data(file.filename or "", text)

    if session_id:
        session = get_or_create_session(session_id)
        session["data"].setdefault("documents", [])
        session["data"]["documents"].append(extracted_data)
        if session["step"] == "upload":
            session["step"] = "done"

    return extracted_data
