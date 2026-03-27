# Chandas Detection System

## Project Structure
```
chandas_backend/      ← FastAPI Python backend
  main.py
  requirements.txt

chandas_frontend/     ← React frontend
  src/App.jsx
```

---

## 1. Run the Backend

```bash
cd chandas_backend

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at:     http://localhost:8000/docs

---

## 2. Run the Frontend

```bash
# Create React app (first time only)
npx create-react-app chandas_frontend
cd chandas_frontend

# Replace src/App.js content with src/App.jsx provided
# Then start:
npm start
```

Frontend runs at: http://localhost:3000

---

## API Endpoint

### POST /analyse
Request:
```json
{ "text": "वक्रतुण्ड महाकाय" }
```

Response:
```json
{
  "input_text": "वक्रतुण्ड महाकाय",
  "slp1": "vakratuRqamahAkAya",
  "syllables": [
    { "syllable": "vak", "weight": "G", "symbol": "–" },
    { "syllable": "ra",  "weight": "L", "symbol": "◡" }
  ],
  "pattern": "GLGL...",
  "meter": "Anushtup",
  "match_score": 87.5
}
```

---

## Pipeline
```
Shloka Input
    ↓
Chandas Detection (this system)
    ↓
Rhythm Structure
    ↓
Pitch Control
    ↓
Rāga Selection
    ↓
Chant Audio Output
```
