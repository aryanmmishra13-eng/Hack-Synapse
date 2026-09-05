import os
import joblib
from datetime import datetime
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "model.joblib")

class MLDemandService:
    def __init__(self):
        self.model_data = None
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model_data = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"Warning: Could not load ML model from {MODEL_PATH}: {e}")
                self.model_data = None
        else:
            self.model_data = None

    def predict_demand(self, sport: str, date_str: str, hour: int) -> dict:
        """
        Predicts sports facility demand using trained ML model with deterministic fallback.
        """
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            dt = datetime.now()

        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week in [5, 6] else 0
        month = dt.month

        if self.model_data and "model" in self.model_data:
            model = self.model_data["model"]
            sport_map = self.model_data.get("sport_map", {})
            sport_code = sport_map.get(sport, 0)

            X_input = pd.DataFrame([{
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "month": month,
                "sport_code": sport_code
            }])
            
            raw_pred = float(model.predict(X_input)[0])
            predicted_demand = max(2, int(round(raw_pred)))
            confidence = 0.92 if self.model_data.get("metrics", {}).get("r2", 0) > 0.7 else 0.85
        else:
            # Deterministic fallback logic
            base = 12
            if sport in ["Badminton", "Football"]:
                base += 15
            elif sport == "Gym":
                base += 20
            
            if 17 <= hour <= 20:
                base += 20
            elif 7 <= hour <= 9:
                base += 10

            predicted_demand = base
            confidence = 0.82

        # Map to Demand Level
        if predicted_demand < 20:
            demand_level = "LOW"
        elif predicted_demand < 38:
            demand_level = "MEDIUM"
        else:
            demand_level = "HIGH"

        return {
            "sport": sport,
            "date": date_str,
            "hour": hour,
            "predicted_demand": predicted_demand,
            "confidence": confidence,
            "demand_level": demand_level
        }

ml_service = MLDemandService()
