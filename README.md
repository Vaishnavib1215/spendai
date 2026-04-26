# SpendAI - Quick Start

## Prerequisites
- Node.js 18+
- Python 3.9+
- npm

---

## 1. Backend (Node.js)

```bash
cd backend
npm install
npm run dev
```
Runs on: http://localhost:3001

---

## 2. ML Server (Python Flask)

```bash
cd ml-server
pip install -r requirements.txt
python app.py
```
Runs on: http://localhost:5001

---

## 3. Frontend (Vite React)

```bash
cd frontend
npm install
npm run dev
```
Runs on: http://localhost:5173

---

## Architecture

```
Frontend (Vite React :5173)
  └─► Backend (Node.js Express :3001)
        ├─► SQLite database (database.db)
        └─► ML Server (Python Flask :5001)
```

## Auth
- JWT tokens stored in localStorage
- Token sent as `Authorization: Bearer <token>` header

## ML Models Used
| Model | Purpose |
|-------|---------|
| Linear Regression | Predict next week spending |
| Decision Tree | Overspending risk + explanation |
| Random Forest | (Overspending classification) |
| K-Means | Behavioral segmentation (cluster profiles) |
| Rule-based | Category drift detection |
