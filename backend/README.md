# Backend (FastAPI)

This folder contains the FastAPI server for Smart-Infra.

Quick start

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoints
- `GET /api/health` - service health
- `POST /api/upload` - upload image file (multipart)

DB configuration
- Set `DATABASE_URL` environment variable (e.g. `mysql+pymysql://user:pass@host:3306/dbname`)
