from pydantic import BaseModel


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer: str


class QuizPayload(BaseModel):
    questions: list[QuizQuestion]


class QuizResponse(BaseModel):
    file_name: str
    file_type: str
    text_length: int
    quiz: QuizPayload
