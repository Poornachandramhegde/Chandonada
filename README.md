# 🕉️ Chandonāda — Chandas Recognition and Melodic Sanskrit Recitation System

Chandonāda is a computational system that analyzes Sanskrit verses, detects their **chandas (metrical structure)**, and generates **melodic chant-style audio aligned with the rhythmic structure of the verse**.

The current prototype focuses on **Anuṣṭubh Chandas**, one of the most widely used metres in classical Sanskrit literature, including the **Bhagavad Gītā**, and **Mahābhārata**.

The system integrates **metrical analysis, Indic transliteration, rāga-based pitch mapping, and audio synthesis** to create an interactive platform for exploring Sanskrit poetic structure and recitation.

---

## 🌐 Live Demo

Frontend
https://chandonada.vercel.app

Backend API
https://chandonada-backend.onrender.com

API Documentation
https://chandonada-backend.onrender.com/docs

---

## ✨ Features

* 🕉️ **Anuṣṭubh Chandas Detection** — Identifies the metrical structure of Sanskrit ślokas
* 🔤 **Indic Transliteration Support** — Handles Sanskrit input in Devanagari
* 🎼 **Melodic Chant Generation** — Generates chant-style audio output
* 🎵 **Rāga Pitch Mapping** — Maps syllables to musical swaras using rāga rules
* 🌐 **FastAPI Backend** — High-performance API architecture
* 🖥️ **Interactive Frontend** — User interface for analysing and listening to chants

---

## 🏗️ Project Architecture

```
Chandonada
│
├── chandas_backend
│   ├── main.py
│   ├── raga_layer.py
│   ├── requirements.txt
│   ├── audio/
│   └── chant_outputs/
│
├── chandas_frontend
│   ├── src/
│   ├── App.js
│   └── RagaPanel.js
│
└── README.md
```

---

## ⚙️ Backend Setup

Navigate to the backend folder:

```
cd chandas_backend
```

Install dependencies:

```
pip install -r requirements.txt
```

Run the FastAPI server:

```
python -m uvicorn main:app --reload --port 8000
```

Backend will run at:

```
http://localhost:8000
```

API documentation:

```
http://localhost:8000/docs
```

---

## 💻 Frontend Setup

Navigate to the frontend folder:

```
cd chandas_frontend
```

Install dependencies:

```
npm install
```

Run the frontend:

```
npm start
```

Frontend will run at:

```
http://localhost:3000
```

---

## 🔄 System Workflow

1. User inputs a Sanskrit verse
2. Text is transliterated and syllabified
3. Chandas detection verifies the **Anuṣṭubh metrical pattern**
4. Syllables are mapped to **Laghu / Guru weights**
5. Pitch mapping assigns **rāga-based musical frequencies**
6. Audio chant is generated and returned to the user

---

## 🧠 Technologies Used

* **Python**
* **FastAPI**
* **NumPy**
* **gTTS**
* **Librosa**
* **Indic Transliteration**
* **React**

---

## 🎯 Use Cases

* Sanskrit education
* Computational linguistics
* Digital humanities research
* Chant learning tools
* Indian Knowledge Systems research

---

## 🚀 Future Improvements

* Support for additional Sanskrit metres
* Realistic **Vedic chant pitch modelling**
* Real-time **audio waveform visualization**
* Machine-learning based chandas classification

---

## ⚠️ Note

The backend is hosted on a free cloud instance.
The first request after inactivity may take **20–40 seconds** while the server wakes up.
