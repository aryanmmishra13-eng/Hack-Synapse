# Campus Sports Hub — Smart Booking & AI Demand Platform

Campus Sports Hub is a modern, intelligent college sports facility management and smart booking platform. It solves court overbooking, double reservations, and facility overcrowding by combining real-time availability, atomic database concurrency control, configurable fair allocation rules, machine learning demand forecasting, open game lobbies ("Play Now"), player compatibility matching, and an interactive admin console.

---

## 🚀 Key Features & USPs

### 1. AI Demand Forecasting (scikit-learn)
- Trained on 6,000+ historical campus sports session records.
- Evaluates `HistGradientBoostingRegressor` vs `RandomForestRegressor` models (R² score = **0.89**, MAE = **3.65**).
- REST API endpoint `/api/predictions/demand` returning `predicted_demand`, `confidence`, and `demand_level` (LOW, MEDIUM, HIGH).

### 2. Conflict-Free Smart Booking & Concurrency Control
- Atomic database transactions with SQLAlchemy locking and unique slot constraints `(facility_id, booking_date, start_time)`.
- When a facility reaches full capacity, duplicate bookings are blocked and an automated **Smart Alternatives Recommendation Engine** suggests open courts/times with availability scores.
- Automatic waitlist position calculation and auto-promotion upon booking cancellation.

### 3. Play Now Lobbies & Player Matchmaking
- Open game lobbies ("Play Now") allowing students to create or join active games.
- Player compatibility score algorithm based on sport preference, skill level, and schedule match.

### 4. QR Code Check-in & No-Show Tracking
- Generates unique QR pass payload for each confirmed booking.
- Admin / facility scanner check-in endpoint (`/api/bookings/{id}/checkin`) transitioning status to `CHECKED_IN`.
- Tracks check-ins vs no-shows to update student fairness priority scores.

### 5. Admin Analytics Console & What-If Simulator
- Real-time facility occupancy monitor across 15 campus courts.
- Recharts visualizations: Hourly demand line chart, sport demand bar chart, peak hours heatmap.
- **What-If Capacity Simulator**: Slider testing +1, +2 courts to calculate shortage reduction & AI expansion recommendations.
- **Fair Allocation Engine**: Configurable weights (previous usage 30%, waitlist duration 30%, peak frequency 20%, no-show penalty 20%).
- **Maintenance Planner**: AI-suggested low-demand windows (e.g. Wednesday 2-4 PM).

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios, React Router v6.
- **Backend**: Python 3.13, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2, PyJWT, Bcrypt.
- **Machine Learning**: scikit-learn (`HistGradientBoostingRegressor`), pandas, NumPy, joblib.
- **Database**: PostgreSQL (with SQLAlchemy 2.0 ORM & psycopg2 connection pooling).

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student** | `student@campus.com` | `password123` |
| **Admin** | `admin@campus.com` | `admin123` |

---

## 🏁 How to Run Locally

### 1. Backend Setup & Seeding

```bash
cd backend

# 1. Activate Virtual Environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# 2. Run Database Seeder (Seeds 7 sports, 15 facilities, 30 students, 600+ bookings)
python scripts/seed.py

# 3. Train ML Model
python app/ml/train.py

# 4. Start FastAPI Server
uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install Dependencies
npm install

# Start Vite Development Server
npm run dev
```
Frontend web application will open at: `http://localhost:3000`

---

## 🧪 Testing Instructions

Run backend integration test suite:

```bash
cd backend
.\venv\Scripts\python.exe -m pytest tests/test_backend.py
```

All 6 integration tests will execute and pass clean.

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```
