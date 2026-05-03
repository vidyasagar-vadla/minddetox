import json
import pandas as pd
from joblib import load

MODEL_PATH = "outputs/stomach_health_model.joblib"  # change if needed

REQUIRED_KEYS = [
    "age", "gender", "bmi", "activity_level", "screen_time_hours", "stress_0_10",
    "sleep_hours", "irregular_meal_flag", "fast_food_meals_per_week",
    "street_food_times_per_week", "fried_snacks_times_per_week",
    "sugary_drinks_per_week", "spicy_food_level_0_3", "late_night_meals_per_week",
    "tea_coffee_cups_per_day", "water_liters_per_day", "fiber_servings_per_day",
    "fruits_veg_servings_per_day", "dairy_freq_per_week", "alcohol_units_per_week",
    "smoking_per_day", "antacid_use_per_week", "acidity_days_per_month",
    "bloating_days_per_month", "stomach_pain_days_per_month"
]

def validate(payload: dict):
    missing = [k for k in REQUIRED_KEYS if k not in payload]
    if missing:
        raise ValueError(f"Missing keys in JSON: {missing}")

def predict_from_json(payload: dict):
    validate(payload)

    model = load(MODEL_PATH)

    # Create dataframe in the same feature order
    X = pd.DataFrame([{k: payload[k] for k in REQUIRED_KEYS}])

    pred_class = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    proba_map = dict(zip(model.classes_, [float(round(p, 4)) for p in proba]))

    print("Prediction:", pred_class)
    print("Probabilities:", proba_map)

if __name__ == "__main__":
    # Example JSON (replace with your frontend JSON)
    sample_json = """
    {
      "age": 24,
      "gender": "Male",
      "bmi": 25.8,
      "activity_level": "Sedentary",
      "screen_time_hours": 7.0,
      "stress_0_10": 6.0,
      "sleep_hours": 6.0,
      "irregular_meal_flag": 1,
      "fast_food_meals_per_week": 5,
      "street_food_times_per_week": 4,
      "fried_snacks_times_per_week": 6,
      "sugary_drinks_per_week": 5,
      "spicy_food_level_0_3": 3,
      "late_night_meals_per_week": 4,
      "tea_coffee_cups_per_day": 3,
      "water_liters_per_day": 1.5,
      "fiber_servings_per_day": 1.5,
      "fruits_veg_servings_per_day": 2.0,
      "dairy_freq_per_week": 5,
      "alcohol_units_per_week": 0,
      "smoking_per_day": 0,
      "antacid_use_per_week": 2,
      "acidity_days_per_month": 8,
      "bloating_days_per_month": 6,
      "stomach_pain_days_per_month": 3
    }
    """

    payload = json.loads(sample_json)
    predict_from_json(payload)
