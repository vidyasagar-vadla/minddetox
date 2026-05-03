import math
import pandas as pd
from joblib import load

LABEL_MAP = {0: "Low_Risk", 1: "Moderate_Risk", 2: "High_Risk"}

EXPECTED_FEATURES = [
    "age","sex","bmi","waist_cm",
    "alcohol_days_per_week","drinks_per_day_on_drinking_day","binge_episodes_per_month",
    "years_drinking","country_liquor_ml_per_week","beer_bottles_per_week",
    "smoking_status","cigarettes_per_day","years_smoked",
    "smokeless_tobacco","gutkha_pouches_per_day","vaping",
    "junk_food_days_per_week","fried_food_days_per_week","sugary_drinks_per_week",
    "late_night_eating_days_per_week","water_liters_per_day","fruit_veg_servings_per_day",
    "exercise_days_per_week","sleep_hours","stress_0_10","screen_time_hours",
    "otc_painkiller_days_per_week","herbal_supplements","energy_drink_per_week",
    "hepatotoxic_meds","unsafe_injections_history","tattoo_piercing_last_12_months",
    "unprotected_partners_last_year",
    "family_history_liver_disease","known_diabetes","known_obesity",
    "symptom_fatigue","symptom_right_upper_abdominal_pain","symptom_nausea","symptom_yellow_eyes_or_skin"
]

def yn_to_int(v):
    """Accepts Yes/No, true/false, 1/0."""
    if isinstance(v, bool):
        return int(v)
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return int(v != 0)
    s = str(v).strip().lower()
    return 1 if s in ("yes","y","true","1") else 0

def safe_num(v, default=0.0):
    try:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return default
        return float(v)
    except Exception:
        return default

def compute_bmi(height_cm, weight_kg):
    h_m = safe_num(height_cm, 0) / 100.0
    w = safe_num(weight_kg, 0)
    if h_m <= 0 or w <= 0:
        return 0.0
    return round(w / (h_m * h_m), 2)

def normalize_checkbox(responses: dict, checkbox_key: str):
    """
    Your frontend might send checkbox selections in different formats:
    - as list of selected ids: ["unsafe_injections_history", "hepatotoxic_meds"]
    - or as dict {id:true/false}
    This function converts both into 1/0 fields.
    """
    val = responses.get(checkbox_key)

    if isinstance(val, list):
        selected = set(val)
        for opt_id in selected:
            responses[opt_id] = 1
    elif isinstance(val, dict):
        for k, vv in val.items():
            responses[k] = yn_to_int(vv)

def build_features_from_questionnaire(q: dict) -> dict:
    """
    q = JSON responses from your questionnaire.
    Returns a full feature dict matching the ML model input.
    """

    # Expand checkboxes if they are nested
    normalize_checkbox(q, "high_risk_exposure")
    normalize_checkbox(q, "history_symptoms")

    # BMI from height+weight
    bmi = compute_bmi(q.get("height_cm"), q.get("weight_kg"))

    # Base mapping (some may be missing -> will be defaulted)
    features = {
        "age": int(safe_num(q.get("age"), 0)),
        "sex": str(q.get("sex") or "Male"),

        "bmi": bmi,
        "waist_cm": safe_num(q.get("waist_cm"), 0),

        "alcohol_days_per_week": int(safe_num(q.get("alcohol_days_per_week"), 0)),
        "drinks_per_day_on_drinking_day": safe_num(q.get("drinks_per_day_on_drinking_day"), 0),
        "binge_episodes_per_month": int(safe_num(q.get("binge_episodes_per_month"), 0)),
        "years_drinking": safe_num(q.get("years_drinking"), 0),
        "country_liquor_ml_per_week": int(safe_num(q.get("country_liquor_ml_per_week"), 0)),
        "beer_bottles_per_week": int(safe_num(q.get("beer_bottles_per_week"), 0)),

        "smoking_status": str(q.get("smoking_status") or "Never"),
        "cigarettes_per_day": int(safe_num(q.get("cigarettes_per_day"), 0)),
        "years_smoked": safe_num(q.get("years_smoked"), 0),

        "smokeless_tobacco": yn_to_int(q.get("smokeless_tobacco")),
        "gutkha_pouches_per_day": int(safe_num(q.get("gutkha_pouches_per_day"), 0)),
        "vaping": yn_to_int(q.get("vaping")),

        "junk_food_days_per_week": safe_num(q.get("junk_food_days_per_week"), 0),
        "fried_food_days_per_week": safe_num(q.get("fried_food_days_per_week"), 0),
        "sugary_drinks_per_week": safe_num(q.get("sugary_drinks_per_week"), 0),
        "late_night_eating_days_per_week": safe_num(q.get("late_night_eating_days_per_week"), 0),
        "water_liters_per_day": safe_num(q.get("water_liters_per_day"), 0),
        "fruit_veg_servings_per_day": safe_num(q.get("fruit_veg_servings_per_day"), 0),

        "exercise_days_per_week": safe_num(q.get("exercise_days_per_week"), 0),
        "sleep_hours": safe_num(q.get("sleep_hours"), 0),
        "stress_0_10": safe_num(q.get("stress_0_10"), 0),
        "screen_time_hours": safe_num(q.get("screen_time_hours"), 0),

        "otc_painkiller_days_per_week": int(safe_num(q.get("otc_painkiller_days_per_week"), 0)),
        "herbal_supplements": yn_to_int(q.get("herbal_supplements")),
        "energy_drink_per_week": safe_num(q.get("energy_drink_per_week"), 0),

        "hepatotoxic_meds": yn_to_int(q.get("hepatotoxic_meds")),
        "unsafe_injections_history": yn_to_int(q.get("unsafe_injections_history")),
        "tattoo_piercing_last_12_months": yn_to_int(q.get("tattoo_piercing_last_12_months")),
        "unprotected_partners_last_year": int(safe_num(q.get("unprotected_partners_last_year"), 0)),

        "family_history_liver_disease": yn_to_int(q.get("family_history_liver_disease")),
        "known_diabetes": yn_to_int(q.get("known_diabetes")),
        "known_obesity": yn_to_int(q.get("known_obesity")),

        "symptom_fatigue": yn_to_int(q.get("symptom_fatigue")),
        "symptom_right_upper_abdominal_pain": yn_to_int(q.get("symptom_right_upper_abdominal_pain")),
        "symptom_nausea": yn_to_int(q.get("symptom_nausea")),
        "symptom_yellow_eyes_or_skin": yn_to_int(q.get("symptom_yellow_eyes_or_skin")),
    }

    # Ensure ALL expected features exist
    for col in EXPECTED_FEATURES:
        if col not in features:
            features[col] = 0

    return features

def predict_from_questionnaire_json(model_path: str, responses_json: dict):
    pipe = load(model_path)

    features = build_features_from_questionnaire(responses_json)
    X = pd.DataFrame([features])

    pred_class = int(pipe.predict(X)[0])
    pred_label = LABEL_MAP.get(pred_class, str(pred_class))

    proba = None
    if hasattr(pipe, "predict_proba"):
        p = pipe.predict_proba(X)[0]
        proba = {LABEL_MAP[i]: float(p[i]) for i in range(len(p))}

    return {
        "predicted_class": pred_class,
        "predicted_label": pred_label,
        "probabilities": proba,
        "features_used": features  # useful for debugging
    }

# -----------------------
# Example usage:
# -----------------------
if __name__ == "__main__":
    sample_responses = {
        "age": 28,
        "sex": "Male",
        "height_cm": 172,
        "weight_kg": 78,
        "waist_cm": 92,

        "alcohol_days_per_week": 4,
        "drinks_per_day_on_drinking_day": 3,
        "binge_episodes_per_month": 2,
        "country_liquor_ml_per_week": 400,
        "beer_bottles_per_week": 4,
        "years_drinking": 6,

        "smoking_status": "Current",
        "cigarettes_per_day": 6,
        "years_smoked": 5,

        "smokeless_tobacco": "Yes",
        "gutkha_pouches_per_day": 2,
        "vaping": "No",

        "junk_food_days_per_week": 4,
        "fried_food_days_per_week": 4,
        "sugary_drinks_per_week": 8,
        "late_night_eating_days_per_week": 3,
        "water_liters_per_day": 1.6,
        "fruit_veg_servings_per_day": 2,

        "exercise_days_per_week": 1,
        "sleep_hours": 6,
        "screen_time_hours": 7,
        "stress_0_10": 6,

        "otc_painkiller_days_per_week": 1,
        "energy_drink_per_week": 1,
        "herbal_supplements": "No",

        # Checkbox page can come like this (list of selected ids)
        "high_risk_exposure": ["unsafe_injections_history"],
        "unprotected_partners_last_year": 0,

        "history_symptoms": ["known_diabetes", "symptom_fatigue"]
    }

    out = predict_from_questionnaire_json(
        "liver_health_model_pipeline.joblib",
        sample_responses
    )
    print(out)
