import pytest
from fastapi.testclient import TestClient
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


