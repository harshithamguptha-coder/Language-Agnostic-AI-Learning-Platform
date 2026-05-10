# AI-Powered Multilingual Educational Assistant

A full-stack educational assistant for students learning in English, Kannada, and Hindi. The app provides authenticated AI chat, user-specific chat history, document upload, OCR for scans and handwritten notes, and document-based question answering with Ollama.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios, React Router DOM
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: MySQL
- AI: Ollama with the `mistral` model by default
- OCR: Tesseract OCR with `pytesseract`, image preprocessing, and scanned-PDF fallback OCR
- Language detection: `langdetect`

## Project Structure

```text
chatbot/
|-- backend/
|   |-- models/
|   |-- routes/
|   |-- schemas/
|   |-- services/
|   |-- uploads/
|   |-- auth.py
|   |-- database.py
|   |-- main.py
|   |-- requirements.txt
|   `-- setup.sql
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   `-- services/
|   |-- package.json
|   |-- tailwind.config.js
|   `-- vite.config.js
|-- .env.example
`-- README.md
```

## Setup

1. Create a backend environment file if it is missing:

```powershell
Copy-Item backend\.env.example backend\.env
```

Update `backend\.env` if your MySQL username, password, or Tesseract path is different.

2. Create the MySQL database and user:

```powershell
mysql -u root -p < backend\setup.sql
```

3. Install backend dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

4. Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

5. Install and prepare Ollama:

```powershell
ollama pull mistral
```

Make sure Ollama is running at `http://localhost:11434`.

6. Install Tesseract OCR.

On Windows, the common executable path is:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

For Kannada OCR, install Kannada trained data (`kan.traineddata`) into your Tesseract `tessdata` folder. Hindi support needs `hin.traineddata`.

Optional OCR tuning values in `backend\.env`:

```text
OCR_LANGUAGES=eng+hin+kan
OCR_MIN_TEXT_CHARS=40
PDF_OCR_DPI=220
```

`OCR_MIN_TEXT_CHARS` controls when a PDF page falls back to OCR, and `PDF_OCR_DPI` controls scan rendering quality.

## Run Commands

Run the backend from the project root:

```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Run the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

API docs are available at:

```text
http://localhost:8000/docs
```

## API Endpoints

- `POST /signup`: create a user account
- `POST /login`: authenticate and receive a JWT plus user profile
- `GET /me`: fetch the current authenticated user
- `POST /chat`: send an educational query
- `GET /history/{user_id}`: fetch user-specific chat history
- `POST /upload`: upload PDF, DOCX, PPTX, TXT, image files, or scanned notes and optionally ask a question. The response includes extracted text, extraction method, OCR page count, confidence when available, and text length.

## Verification

These checks passed:

```powershell
python -m compileall backend
python -c "from backend.main import app; print(app.title)"
cd frontend
npm run build
```
