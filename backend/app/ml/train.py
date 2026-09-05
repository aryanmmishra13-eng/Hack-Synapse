import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
import joblib

DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")

SPORTS = ["Badminton", "Football", "Basketball", "Tennis", "Volleyball", "Cricket", "Gym"]

def generate_synthetic_dataset(num_records=6000):
    """
    Generates a rich, realistic dataset simulating campus sports facility usage over 6 months.
    """
    random.seed(42)
    np.random.seed(42)
    
    start_date = datetime(2026, 3, 1)
    data = []
    
    for _ in range(num_records):
        random_days = random.randint(0, 180)
        random_hour = random.randint(6, 22)  # Facilities open 6am to 10pm
        dt = start_date + timedelta(days=random_days, hours=random_hour)
        
        sport = random.choice(SPORTS)
        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week in [5, 6] else 0
        month = dt.month
        
        # Base demand logic based on realistic campus patterns
        base_demand = 10
        
        # Peak sports: Badminton & Football have higher popularity
        if sport in ["Badminton", "Football"]:
            base_demand += 15
        elif sport in ["Basketball", "Tennis"]:
            base_demand += 10
        elif sport == "Gym":
            base_demand += 20
            
        # Peak hours: 5 PM - 9 PM (17-21) and Morning 7 AM - 9 AM (7-9)
        if 17 <= random_hour <= 20:
            base_demand += 25
        elif 7 <= random_hour <= 9:
            base_demand += 12
        elif 12 <= random_hour <= 14:
            base_demand += 8
        else:
            base_demand += 2

        # Weekend effect
        if is_weekend:
            if 10 <= random_hour <= 18:
                base_demand += 15
                
        # Random noise (weather/academic workload)
        noise = random.randint(-5, 8)
        demand = max(2, int(base_demand + noise))
        
        # Calculate crowd capacity percentage relative to sport typical max
        max_cap = 50 if sport == "Football" else (30 if sport in ["Badminton", "Gym"] else 20)
        crowd_pct = min(100.0, round((demand / max_cap) * 100, 1))
        
        data.append({
            "date": dt.strftime("%Y-%m-%d"),
            "hour": random_hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "month": month,
            "sport": sport,
            "demand": demand,
            "crowd_pct": crowd_pct
        })

    df = pd.DataFrame(data)
    df.to_csv(DATASET_PATH, index=False)
    print(f"Generated dataset with {len(df)} records saved to {DATASET_PATH}")
    return df

def train_demand_model():
    if not os.path.exists(DATASET_PATH):
        df = generate_synthetic_dataset()
    else:
        df = pd.read_csv(DATASET_PATH)

    # Feature Engineering
    # One-hot encode or target encode sports
    sport_map = {s: i for i, s in enumerate(SPORTS)}
    df["sport_code"] = df["sport"].map(sport_map)

    X = df[["hour", "day_of_week", "is_weekend", "month", "sport_code"]]
    y = df["demand"]

    # Split train/test
    train_size = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

    # Compare models
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_mae = mean_absolute_error(y_test, rf_preds)
    rf_rmse = root_mean_squared_error(y_test, rf_preds)
    rf_r2 = r2_score(y_test, rf_preds)

    hgb = HistGradientBoostingRegressor(random_state=42)
    hgb.fit(X_train, y_train)
    hgb_preds = hgb.predict(X_test)
    hgb_mae = mean_absolute_error(y_test, hgb_preds)
    hgb_rmse = root_mean_squared_error(y_test, hgb_preds)
    hgb_r2 = r2_score(y_test, hgb_preds)

    print("--- Model Comparison ---")
    print(f"RandomForestRegressor: MAE={rf_mae:.2f}, RMSE={rf_rmse:.2f}, R2={rf_r2:.2f}")
    print(f"HistGradientBoostingRegressor: MAE={hgb_mae:.2f}, RMSE={hgb_rmse:.2f}, R2={hgb_r2:.2f}")

    best_model = hgb if hgb_r2 >= rf_r2 else rf
    best_model_name = "HistGradientBoostingRegressor" if best_model == hgb else "RandomForestRegressor"
    print(f"Selected best model: {best_model_name}")

    # Save model and metadata
    metadata = {
        "model": best_model,
        "sport_map": sport_map,
        "sports_list": SPORTS,
        "best_model_name": best_model_name,
        "metrics": {"mae": min(rf_mae, hgb_mae), "r2": max(rf_r2, hgb_r2)}
    }
    joblib.dump(metadata, MODEL_PATH)
    print(f"Model saved successfully to {MODEL_PATH}")

if __name__ == "__main__":
    generate_synthetic_dataset()
    train_demand_model()
