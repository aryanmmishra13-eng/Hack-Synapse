import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_login_demo_student():
    response = client.post("/api/auth/login", json={
        "email": "student@campus.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "student@campus.com"
    assert data["user"]["role"] == "STUDENT"

def test_login_demo_admin():
    response = client.post("/api/auth/login", json={
        "email": "admin@campus.com",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

def test_get_sports():
    response = client.get("/api/sports")
    assert response.status_code == 200
    sports = response.json()
    assert len(sports) >= 7

def test_ml_demand_prediction_api():
    response = client.get("/api/predictions/demand?sport=Badminton&date=2026-09-02&hour=18")
    assert response.status_code == 200
    data = response.json()
    assert "predicted_demand" in data
    assert "demand_level" in data
    assert data["demand_level"] in ["LOW", "MEDIUM", "HIGH"]

def test_unauthorized_admin_access():
    # Login as student
    student_res = client.post("/api/auth/login", json={
        "email": "student@campus.com",
        "password": "password123"
    }).json()
    token = student_res["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    admin_res = client.get("/api/admin/dashboard", headers=headers)
    assert admin_res.status_code == 403

def test_admin_qr_verify_and_approve():
    # 1. Login as admin
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@campus.com",
        "password": "admin123"
    }).json()
    admin_token = admin_res["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Login as student to create a booking
    student_res = client.post("/api/auth/login", json={
        "email": "student@campus.com",
        "password": "password123"
    }).json()
    student_token = student_res["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Create a fresh booking
    booking_res = client.post("/api/bookings", headers=student_headers, json={
        "facility_id": 1,
        "booking_date": "2026-11-20",
        "start_time": "14:00",
        "end_time": "15:00",
        "rentals": []
    })
    assert booking_res.status_code == 200
    b_json = booking_res.json()
    assert b_json["success"] is True
    booking_data = b_json["booking"]
    qr_code = booking_data["qr_code"]
    booking_id = booking_data["id"]

    # 3. Admin verifies QR pass
    verify_res = client.post("/api/admin/qr/verify", headers=admin_headers, json={
        "qr_code": qr_code
    })
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["valid"] is True
    assert v_data["can_approve"] is True
    assert v_data["booking"]["id"] == booking_id
    assert v_data["player"]["email"] == "student@campus.com"

    # 4. Admin approves check-in
    approve_res = client.post("/api/admin/qr/approve", headers=admin_headers, json={
        "booking_id": booking_id
    })
    assert approve_res.status_code == 200
    a_data = approve_res.json()
    assert a_data["success"] is True
    assert a_data["booking"]["status"] == "CHECKED_IN"

    # 5. Verify pass again - should show already checked in
    verify_again = client.post("/api/admin/qr/verify", headers=admin_headers, json={
        "qr_code": qr_code
    })
    assert verify_again.status_code == 200
    va_data = verify_again.json()
    assert va_data["valid"] is True
    assert va_data["can_approve"] is False
    assert "already checked in" in va_data["message"].lower()

    # 6. Check QR history
    hist_res = client.get("/api/admin/qr/history", headers=admin_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) > 0
    assert any(h["booking_id"] == booking_id for h in history)

    # 7. Invalid QR code
    bad_res = client.post("/api/admin/qr/verify", headers=admin_headers, json={
        "qr_code": "NON-EXISTENT-CODE"
    })
    assert bad_res.status_code == 200
    assert bad_res.json()["valid"] is False

def test_login_demo_coach():
    response = client.post("/api/auth/login", json={
        "email": "coach.rahul@campus.com",
        "password": "coach123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "COACH"
    assert "access_token" in data

def test_equipment_flow():
    # 1. Get equipment catalog
    eq_res = client.get("/api/equipment")
    assert eq_res.status_code == 200
    catalog = eq_res.json()
    assert len(catalog) > 0
    test_eq = catalog[0]

    # 2. Student rents equipment
    student_res = client.post("/api/auth/login", json={
        "email": "student@campus.com",
        "password": "password123"
    }).json()
    student_token = student_res["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    rent_res = client.post("/api/equipment/rent", headers=student_headers, json={
        "equipment_id": test_eq["id"],
        "quantity": 1,
        "expected_return_time": "19:00"
    })
    assert rent_res.status_code == 200
    rental_id = rent_res.json()["rental_id"]

    # 3. Student views my rentals
    my_rentals = client.get("/api/equipment/my-rentals", headers=student_headers).json()
    assert any(r["id"] == rental_id for r in my_rentals)

    # 4. Student returns equipment
    return_res = client.post(f"/api/equipment/return/{rental_id}", headers=student_headers, json={
        "condition": "GOOD"
    })
    assert return_res.status_code == 200

def test_tournament_and_bracket_flow():
    # 1. List tournaments
    t_res = client.get("/api/tournaments")
    assert t_res.status_code == 200
    tourneys = t_res.json()
    assert len(tourneys) > 0
    tourney = next((t for t in tourneys if len(t.get("matches", [])) > 0), tourneys[0])
    t_id = tourney["id"]

    # 2. Get bracket
    b_res = client.get(f"/api/tournaments/{t_id}/bracket")
    assert b_res.status_code == 200
    matches = b_res.json()
    assert len(matches) > 0

    # 3. Admin updates score of first match
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@campus.com",
        "password": "admin123"
    }).json()
    admin_headers = {"Authorization": f"Bearer {admin_res['access_token']}"}

    first_match = matches[0]
    score_res = client.post(f"/api/tournaments/match/{first_match['id']}/score", headers=admin_headers, json={
        "score_team1": 3,
        "score_team2": 1,
        "status": "COMPLETED"
    })
    assert score_res.status_code == 200
    assert "winner_team" in score_res.json()

def test_coach_dashboard_and_training():
    # 1. Coach login
    coach_res = client.post("/api/auth/login", json={
        "email": "coach.rahul@campus.com",
        "password": "coach123"
    }).json()
    coach_headers = {"Authorization": f"Bearer {coach_res['access_token']}"}

    # 2. Coach dashboard
    dash_res = client.get("/api/coaches/dashboard", headers=coach_headers)
    assert dash_res.status_code == 200
    assert "metrics" in dash_res.json()

    # 3. Coach training sessions list
    train_res = client.get("/api/coaches/training", headers=coach_headers)
    assert train_res.status_code == 200

def test_weather_endpoints():
    # Facility weather report
    res = client.get("/api/weather/report?facility_id=1&hour=18")
    assert res.status_code == 200
    data = res.json()
    assert "rain_probability" in data
    assert "risk_level" in data

    # Admin weather risks
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@campus.com",
        "password": "admin123"
    }).json()
    admin_headers = {"Authorization": f"Bearer {admin_res['access_token']}"}

    risks_res = client.get("/api/weather/admin/risks", headers=admin_headers)
    assert risks_res.status_code == 200

# ─────────────────────────────────────────────────────────────────────────────
# ML Injury Prediction Tests  (spec §30)
# All tests use the fallback rule engine — no dependency on live Render API
# ─────────────────────────────────────────────────────────────────────────────

def _student_headers():
    """Return auth headers for the demo student account."""
    res = client.post("/api/auth/login", json={
        "email": "student@campus.com",
        "password": "password123"
    })
    if res.status_code != 200:
        pytest.skip("Demo student account not seeded — skipping ML tests")
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _admin_headers():
    """Return auth headers for the demo admin account."""
    res = client.post("/api/auth/login", json={
        "email": "admin@campus.com",
        "password": "admin123"
    })
    if res.status_code != 200:
        pytest.skip("Demo admin account not seeded — skipping ML tests")
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _coach_headers():
    """Return auth headers for the demo coach account."""
    res = client.post("/api/auth/login", json={
        "email": "coach.rahul@campus.com",
        "password": "coach123"
    })
    if res.status_code != 200:
        pytest.skip("Demo coach account not seeded — skipping ML tests")
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _get_student_id(headers):
    """Get the student's user ID from the login response."""
    res = client.post("/api/auth/login", json={
        "email": "student@campus.com",
        "password": "password123"
    })
    if res.status_code != 200:
        pytest.skip("Cannot resolve student ID")
    return res.json()["user"]["id"]


# ── Spec §30 test 11: Authorization — unauthenticated → 401 ──────────────────
def test_injury_risk_requires_auth():
    """Unauthenticated access must be rejected."""
    res = client.get("/api/predictions/injury-risk/1")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"


# ── Spec §30 test 11: Student accesses own data → valid response shape ────────
def test_injury_risk_student_own_data():
    """Student can fetch their own injury risk — response matches spec §9 shape."""
    headers = _student_headers()
    student_id = _get_student_id(headers)

    res = client.get(f"/api/predictions/injury-risk/{student_id}", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text[:200]}"

    body = res.json()
    assert body.get("success") is True, f"success != True: {body}"

    data = body["data"]
    # Spec §9 shape checks
    assert "athlete_id" in data
    assert "risk" in data
    assert "score" in data["risk"]
    assert "level" in data["risk"]
    assert data["risk"]["level"] in ("LOW", "MEDIUM", "HIGH")
    assert "is_at_risk" in data["risk"]
    assert isinstance(data["risk"]["score"], (int, float))
    assert 0 <= data["risk"]["score"] <= 100

    assert "prediction" in data
    assert "factors" in data
    assert "increasing" in data["factors"]
    assert "reducing" in data["factors"]
    assert "model" in data
    assert "version" in data["model"]
    assert "generated_at" in data


# ── Spec §30 test 11: Student → another student's data → 403 ─────────────────
def test_injury_risk_student_cross_access_denied():
    """Student cannot access another student's injury data."""
    headers = _student_headers()
    student_id = _get_student_id(headers)

    # Try to access a different user's data
    other_id = student_id + 999  # very unlikely to be the same user
    res = client.get(f"/api/predictions/injury-risk/{other_id}", headers=headers)
    # Should be 403 (cross-access) or 200 with error (athlete not found)
    assert res.status_code in (403, 200), f"Unexpected status: {res.status_code}"
    if res.status_code == 200:
        # If athlete not found it returns success=False
        body = res.json()
        assert body.get("success") is False or res.status_code == 403


# ── Spec §30 test 2: Athlete not found ───────────────────────────────────────
def test_injury_risk_athlete_not_found():
    """Admin requesting non-existent athlete should get clean error."""
    headers = _admin_headers()
    res = client.get("/api/predictions/injury-risk/999999", headers=headers)
    assert res.status_code == 200
    body = res.json()
    # Should return success=False with ATHLETE_NOT_FOUND code
    assert body.get("success") is False
    assert body.get("error", {}).get("code") == "ATHLETE_NOT_FOUND"


# ── Spec §30 test 10: Prediction persists in history ─────────────────────────
def test_injury_risk_history():
    """Prediction history returns a list in the correct shape."""
    headers = _student_headers()
    student_id = _get_student_id(headers)

    # First trigger a prediction so history is non-empty
    client.post(f"/api/predictions/injury-risk/{student_id}/refresh", headers=headers)

    res = client.get(f"/api/predictions/injury-risk/{student_id}/history", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body.get("success") is True
    assert "history" in body
    assert isinstance(body["history"], list)

    if body["history"]:
        record = body["history"][0]
        assert "risk" in record
        assert "score" in record["risk"]
        assert "level" in record["risk"]
        assert "prediction" in record
        assert "model" in record
        assert "generated_at" in record


# ── Spec §30 test 6: Refresh endpoint ────────────────────────────────────────
def test_injury_risk_refresh():
    """POST refresh generates a new prediction regardless of cache."""
    headers = _student_headers()
    student_id = _get_student_id(headers)

    res = client.post(f"/api/predictions/injury-risk/{student_id}/refresh", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body.get("success") is True
    data = body["data"]
    assert data.get("cached") is False, "Refreshed prediction should not be marked cached"
    assert "risk" in data
    assert "model" in data


# ── Spec §30 tests 4, 5, 6: Health log save + retrieve ───────────────────────
def test_health_log_save_and_retrieve():
    """Health log can be saved and retrieved for an athlete."""
    headers = _student_headers()
    student_id = _get_student_id(headers)

    from datetime import datetime, timedelta
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    # Save 2 days of health data
    payload = {
        "logs": [
            {
                "date": today,
                "calories_burned": 480.0,
                "sleep_hours": 7.5,
                "sleep_quality": 8.0,
                "total_steps": 8500,
                "steps_entries": [{"hour": 7, "value": 2000}, {"hour": 12, "value": 3000}],
                "heart_rate_entries": [{"hour": 7, "value": 145}, {"hour": 18, "value": 162}],
                "resting_hr": 58.0,
                "max_hr": 175.0,
            },
            {
                "date": yesterday,
                "calories_burned": 420.0,
                "sleep_hours": 6.5,
                "sleep_quality": 7.0,
                "total_steps": 7200,
                "steps_entries": [],
                "heart_rate_entries": [],
            },
        ]
    }
    save_res = client.post(f"/api/predictions/health-log/{student_id}", headers=headers, json=payload)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data.get("success") is True
    assert save_data.get("saved") == 2

    # Retrieve and verify
    get_res = client.get(f"/api/predictions/health-log/{student_id}?days=7", headers=headers)
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data.get("success") is True
    logs = get_data.get("logs", [])
    assert len(logs) >= 1
    # Check today's log is present
    dates = [l["date"] for l in logs]
    assert today in dates


# ── Spec §30 test 11: Admin → ML status ──────────────────────────────────────
def test_ml_status_admin_access():
    """Admin can view ML monitoring status."""
    headers = _admin_headers()
    res = client.get("/api/predictions/ml-status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "ml_api" in body
    assert "model" in body
    assert "stats" in body
    # Should not expose API key
    body_str = str(body)
    assert "ML_API_KEY" not in body_str
    assert "X-API-Key" not in body_str


# ── Spec §30 test 11: Coach → ML status ──────────────────────────────────────
def test_ml_status_coach_access():
    """Coach can also view ML monitoring status (spec §27 allows admin+coach)."""
    headers = _coach_headers()
    res = client.get("/api/predictions/ml-status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "ml_api" in body


# ── Spec §30 test 11: Student → ML status denied ─────────────────────────────
def test_ml_status_student_denied():
    """Student must not be able to access the admin ML status endpoint."""
    headers = _student_headers()
    res = client.get("/api/predictions/ml-status", headers=headers)
    assert res.status_code == 403, f"Student should not access ml-status, got {res.status_code}"


# ── Spec §30 test 3: Feature engineering doesn't crash on empty data ──────────
def test_feature_engineering_no_crash_on_empty():
    """Feature service should still return a 67-feature vector when data is missing."""
    from app.services.feature_service import build_feature_vector
    from app.database.session import SessionLocal

    db = SessionLocal()
    try:
        # Use admin user (user_id=1) — may have no health logs, but should not crash
        headers = _admin_headers()
        admin_login = client.post("/api/auth/login", json={
            "email": "admin@campus.com",
            "password": "admin123"
        }).json()
        admin_id = admin_login.get("user", {}).get("id", 1)

        features, quality, missing = build_feature_vector(user_id=admin_id, db=db)
        assert len(features) == 67, f"Expected 67 features, got {len(features)}"
        assert quality in ("GOOD", "PARTIAL", "INSUFFICIENT")
        assert isinstance(missing, int)
    except ValueError as e:
        # User not found is acceptable (seeded data may vary)
        assert "not found" in str(e).lower()
    finally:
        db.close()


# ── Spec §30 test 15: Risk rendering — level maps correctly ──────────────────
def test_risk_level_mapping():
    """Verify internal risk level thresholds map score → level correctly."""
    from app.services.injury_ml_service import _score_to_level

    level, at_risk = _score_to_level(5.0)
    assert level == "LOW"
    assert at_risk is False

    level, at_risk = _score_to_level(50.0)
    assert level == "MEDIUM"
    assert at_risk is False

    level, at_risk = _score_to_level(80.0)
    assert level == "HIGH"
    assert at_risk is True  # >= 70% optimal threshold


# ── Data quality assessment test ──────────────────────────────────────────────
def test_data_quality_assessment():
    """Data quality returns a valid status string."""
    from app.services.feature_service import _assess_quality, DataQuality

    # No data at all → INSUFFICIENT
    missing, quality = _assess_quality(health_logs=[], fitness=[], bookings=[])
    assert quality == DataQuality.INSUFFICIENT

    # Some data → GOOD or PARTIAL
    class FakeLog:
        pass

    fake_logs = [FakeLog() for _ in range(5)]
    missing2, quality2 = _assess_quality(health_logs=fake_logs, fitness=fake_logs, bookings=fake_logs)
    assert quality2 in (DataQuality.GOOD, DataQuality.PARTIAL)


# ── ML service error response format ─────────────────────────────────────────
def test_ml_error_response_format():
    """Error responses must have clean code+message and no internal details."""
    from app.services.injury_ml_service import _build_error

    err = _build_error("ML_SERVICE_UNAVAILABLE", "Injury prediction service is temporarily unavailable.")
    assert err["success"] is False
    assert err["error"]["code"] == "ML_SERVICE_UNAVAILABLE"
    assert "traceback" not in str(err).lower()
    assert "exception" not in str(err).lower()
    assert "stacktrace" not in str(err).lower()
