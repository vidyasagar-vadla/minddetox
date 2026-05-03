"""
Load the saved lung-risk model (joblib pipeline), accept JSON answers (15-question form),
convert to model features (including derived fields), and print predicted lung health.

Assumes you saved the model as:
  artifacts/lung_risk_pipeline.joblib
(or change MODEL_PATH below)

The model expects the same feature columns used in training CSV.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from joblib import load

# ----------------------------
# Config
# ----------------------------
MODEL_PATH = "lung_risk_pipeline.joblib"

# ----------------------------
# Helpers
# ----------------------------
def clamp(x: float, lo: float, hi: float) -> float:
    return float(max(lo, min(hi, x)))

def pick_numeric_from_bucket(bucket: str, mapping: Dict[str, float], default: float) -> float:
    if bucket is None:
        return default
    b = str(bucket).strip()
    return float(mapping.get(b, default))

def as_bool01(x: Any) -> int:
    if isinstance(x, bool):
        return int(x)
    s = str(x).strip().lower()
    if s in {"1", "yes", "y", "true", "daily", "often"}:
        return 1
    if s in {"0", "no", "n", "false", "none"}:
        return 0
    return 0

def normalize_choice(x: Any) -> str:
    return str(x).strip()

# ----------------------------
# Mapping: 15-question JSON -> model feature row
# ----------------------------
def answers15_to_features(a: Dict[str, Any]) -> pd.DataFrame:
    """
    Expected JSON keys (recommended):
      age, sex, residence,
      smoking_status, cigs_per_day_bucket, years_smoked_bucket,
      tobacco_product,
      secondhand_smoke_bucket, alcohol_per_week_bucket,
      cooking_fuel, ventilation,
      dust_chemical_exposure,
      activity_level,
      symptoms,  # list like ["cough","wheeze"] or ["none"]
      health_feeling

    Returns a one-row DataFrame with all model feature columns.
    """

    # ---- Basic ----
    age = int(a.get("age", 28))
    sex = normalize_choice(a.get("sex", "Male"))  # "Male" / "Female"
    residence = normalize_choice(a.get("residence", "Urban"))  # "Urban"/"Semi-Urban"/"Rural"

    # ---- Smoking ----
    smoking_status = normalize_choice(a.get("smoking_status", "No")).lower()
    smoker = 1 if smoking_status in {"yes", "daily", "occasionally", "occasional"} else 0

    cigs_bucket_map = {
        "None": 0, "0": 0,
        "1–5": 3, "1-5": 3,
        "6–10": 8, "6-10": 8,
        "11–20": 15, "11-20": 15,
        "20+": 22, "20 +": 22
    }
    years_bucket_map = {
        "0": 0, "None": 0,
        "1–5": 3, "1-5": 3,
        "6–10": 8, "6-10": 8,
        "11–20": 15, "11-20": 15,
        "20+": 25, "20 +": 25
    }

    cigs_per_day_est = pick_numeric_from_bucket(
        a.get("cigs_per_day_bucket", "None"), cigs_bucket_map, default=0
    )
    years_smoked_est = pick_numeric_from_bucket(
        a.get("years_smoked_bucket", "0"), years_bucket_map, default=0
    )

    # Q7 tobacco_product: None / Vaping / Hookah / Smokeless
    tobacco_product = normalize_choice(a.get("tobacco_product", "None")).lower()

    vaper = 1 if "vape" in tobacco_product else 0
    hookah_sessions_per_week = 0
    smokeless_tobacco_freq = "Never"

    # A simple “realistic” inference (you can tune)
    vape_sessions_per_day = 0
    if vaper:
        vape_sessions_per_day = int(clamp(3 + (cigs_per_day_est / 5), 1, 15))

    if "hookah" in tobacco_product or "sheesha" in tobacco_product:
        hookah_sessions_per_week = int(clamp(1 + (cigs_per_day_est / 10), 0, 12))

    if "gutkha" in tobacco_product or "paan" in tobacco_product or "khaini" in tobacco_product or "smokeless" in tobacco_product:
        # Map to a category
        # If also smoker and higher consumption => Daily else Weekly/Occasional
        if smoker and cigs_per_day_est >= 6:
            smokeless_tobacco_freq = "Daily"
        elif smoker:
            smokeless_tobacco_freq = "Weekly"
        else:
            smokeless_tobacco_freq = "Occasional"

    # We also keep bidi_per_day as a separate column (model trained with it).
    # Since our 15Q didn't ask cigarettes vs bidi, we infer:
    # Rural/semi-urban -> some bidi share; Urban -> mostly cigarettes.
    bidi_per_day = 0
    cigarettes_per_day = 0
    if smoker:
        if residence.lower() in {"rural", "semi-urban", "semi urban", "semiurban"}:
            # split ~60/40 bidi/cigs
            bidi_per_day = int(round(cigs_per_day_est * 0.6))
            cigarettes_per_day = int(round(cigs_per_day_est * 0.4))
        else:
            cigarettes_per_day = int(round(cigs_per_day_est))
            bidi_per_day = 0

    years_smoked = int(round(years_smoked_est)) if smoker else 0

    # Pack-years (simple approx using cigarette equivalents: 1 bidi ~ 0.5 cigarette)
    cigs_equiv = cigarettes_per_day + 0.5 * bidi_per_day
    pack_years = float((cigs_equiv / 20.0) * years_smoked)

    # ---- Passive smoke + alcohol ----
    shs_bucket_map = {
        "No": 0, "None": 0, "0": 0,
        "Less than 1 hour": 0.5,
        "<1 hour": 0.5,
        "1–3 hours": 2.0, "1-3 hours": 2.0,
        "More than 3 hours": 4.0,
        ">3 hours": 4.0,
    }
    secondhand_smoke_hours_per_day = pick_numeric_from_bucket(
        a.get("secondhand_smoke_bucket", "No"), shs_bucket_map, default=0
    )

    alc_bucket_map = {
        "None": 0, "0": 0,
        "1–3 drinks": 2, "1-3 drinks": 2,
        "4–7 drinks": 6, "4-7 drinks": 6,
        "8–14 drinks": 11, "8-14 drinks": 11,
        "15+ drinks": 18, "15+": 18, "15+": 18
    }
    alcohol_units_per_week = pick_numeric_from_bucket(
        a.get("alcohol_per_week_bucket", "None"), alc_bucket_map, default=0
    )

    # ---- Environment ----
    cooking_fuel = normalize_choice(a.get("cooking_fuel", "Gas/Electric")).lower()
    biomass_cooking_chulha = 1 if ("wood" in cooking_fuel or "coal" in cooking_fuel or "chulha" in cooking_fuel) else 0

    indoor_ventilation = normalize_choice(a.get("ventilation", "Good"))
    dust_exp = normalize_choice(a.get("dust_chemical_exposure", "No")).lower()
    occupational_dust_chemical_exposure = 1 if dust_exp in {"sometimes", "daily", "yes"} else 0

    # air_pollution_index_0_1: infer from residence (you can replace with actual city AQI mapping)
    if residence.lower() == "urban":
        air_pollution_index_0_1 = 0.70
    elif residence.lower() in {"semi-urban", "semi urban", "semiurban"}:
        air_pollution_index_0_1 = 0.55
    else:
        air_pollution_index_0_1 = 0.45

    # mask usage not asked directly; infer:
    # urban users more likely sometimes; rural rarely
    if residence.lower() == "urban":
        mask_usage_outdoors = "Sometimes"
    elif residence.lower() in {"semi-urban", "semi urban", "semiurban"}:
        mask_usage_outdoors = "Sometimes"
    else:
        mask_usage_outdoors = "Rarely"

    # ---- Lifestyle ----
    physical_activity_level = normalize_choice(a.get("activity_level", "Moderate"))

    # ---- Symptoms ----
    symptoms: List[str] = a.get("symptoms", [])
    if isinstance(symptoms, str):
        # allow comma-separated string
        symptoms = [s.strip() for s in symptoms.split(",") if s.strip()]

    sym_set = {s.strip().lower() for s in symptoms}
    if "none" in sym_set:
        sym_set = set()

    symptom_cough = 1 if "cough" in sym_set else 0
    symptom_wheeze = 1 if "wheeze" in sym_set or "wheezing" in sym_set else 0
    symptom_breathlessness = 1 if "breathlessness" in sym_set or "shortness of breath" in sym_set else 0
    symptom_chest_tightness = 1 if "chest tightness" in sym_set or "tightness" in sym_set else 0

    # ---- “Health feeling” -> sleep/stress/spo2/peakflow estimates ----
    feeling = normalize_choice(a.get("health_feeling", "Okay")).lower()

    if feeling in {"very good", "good"}:
        sleep_hours = 7.5
        stress_level_0_10 = 3.0
    elif feeling in {"okay", "ok", "fine"}:
        sleep_hours = 7.0
        stress_level_0_10 = 5.0
    elif feeling in {"getting worse", "worse"}:
        sleep_hours = 6.5
        stress_level_0_10 = 7.0
    else:  # "poor"
        sleep_hours = 6.0
        stress_level_0_10 = 8.5

    # Estimate SpO2: drop with symptoms + smoking + exposure
    spo2 = 98.0
    spo2 -= 0.25 * cigs_equiv
    spo2 -= 0.8 * (symptom_breathlessness + symptom_wheeze)
    spo2 -= 0.4 * (symptom_cough + symptom_chest_tightness)
    spo2 -= 0.4 * (occupational_dust_chemical_exposure + biomass_cooking_chulha)
    spo2 -= 0.2 * (secondhand_smoke_hours_per_day)
    resting_spo2 = clamp(spo2, 88.0, 99.0)

    # Estimate peak flow: base by age/sex, minus smoking/symptoms
    peak_base = 520 if sex.lower() == "male" else 420
    peak = peak_base - (age * 1.2) - (cigs_equiv * 3.0) - (symptom_breathlessness * 40) - (symptom_wheeze * 30)
    peak_flow_lpm = clamp(peak, 150.0, 650.0)

    # BMI not asked in 15Q; set a reasonable default if not provided
    bmi = float(a.get("bmi", 24.0))
    bmi = clamp(bmi, 15.0, 40.0)

    # ---- Final feature row (must match training schema) ----
    row = {
        "age": age,
        "sex": sex,
        "residence": residence,
        "bmi": bmi,

        "smoker": int(smoker),
        "cigarettes_per_day": int(cigarettes_per_day),
        "bidi_per_day": int(bidi_per_day),
        "years_smoked": int(years_smoked),
        "pack_years": float(pack_years),

        "hookah_sessions_per_week": int(hookah_sessions_per_week),
        "vaper": int(vaper),
        "vape_sessions_per_day": int(vape_sessions_per_day),
        "smokeless_tobacco_freq": smokeless_tobacco_freq,

        "secondhand_smoke_hours_per_day": float(secondhand_smoke_hours_per_day),
        "alcohol_units_per_week": float(alcohol_units_per_week),

        "biomass_cooking_chulha": int(biomass_cooking_chulha),
        "indoor_ventilation": indoor_ventilation,
        "occupational_dust_chemical_exposure": int(occupational_dust_chemical_exposure),

        "air_pollution_index_0_1": float(air_pollution_index_0_1),
        "mask_usage_outdoors": mask_usage_outdoors,

        "physical_activity_level": physical_activity_level,
        "sleep_hours": float(sleep_hours),
        "stress_level_0_10": float(stress_level_0_10),

        "symptom_cough": int(symptom_cough),
        "symptom_wheeze": int(symptom_wheeze),
        "symptom_breathlessness": int(symptom_breathlessness),
        "symptom_chest_tightness": int(symptom_chest_tightness),

        "resting_spo2": float(resting_spo2),
        "peak_flow_lpm": float(peak_flow_lpm),
    }

    return pd.DataFrame([row])


# ----------------------------
# Prediction runner
# ----------------------------
def predict_lung_health_from_answers_json(answers_json: str) -> Dict[str, Any]:
    """
    answers_json can be a JSON string.
    Returns dict with prediction + probabilities (if supported).
    """
    answers = json.loads(answers_json) if isinstance(answers_json, str) else answers_json

    model = load(MODEL_PATH)

    X = answers15_to_features(answers)

    pred = model.predict(X)[0]

    result = {"lung_health_risk": str(pred)}

    # If classifier supports predict_proba
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        # Try to get class labels
        classes = getattr(model, "classes_", None)
        if classes is None and hasattr(model, "named_steps"):
            # pipeline case: try last step
            last = list(model.named_steps.values())[-1]
            classes = getattr(last, "classes_", None)

        if classes is not None:
            result["probabilities"] = {str(c): float(p) for c, p in zip(classes, proba)}
        else:
            result["probabilities"] = [float(p) for p in proba]

    return result


# ----------------------------
# Example usage
# ----------------------------
if __name__ == "__main__":
    sample_answers = {
        "age": 32,
        "sex": "Male",
        "residence": "Urban",

        "smoking_status": "Daily",
        "cigs_per_day_bucket": "6–10",
        "years_smoked_bucket": "6–10",
        "tobacco_product": "None",  # or "Vaping / E-cigarette" / "Hookah / Sheesha" / "Gutkha / Paan / Khaini"

        "secondhand_smoke_bucket": "1–3 hours",
        "alcohol_per_week_bucket": "4–7 drinks",

        "cooking_fuel": "Gas/Electric",   # or "Wood/Coal/Chulha"
        "ventilation": "Average",         # Good/Average/Poor
        "dust_chemical_exposure": "Sometimes",  # No/Sometimes/Daily

        "activity_level": "Moderate",     # Low/Moderate/High
        "symptoms": ["cough", "breathlessness"],  # or ["none"]
        "health_feeling": "Okay",

        # optional
        "bmi": 25.2
    }

    out = predict_lung_health_from_answers_json(json.dumps(sample_answers))
    print("\n=== Lung Health Prediction ===")
    print("Predicted:", out["lung_health_risk"])
    if "probabilities" in out:
        print("Probabilities:", json.dumps(out["probabilities"], indent=2))
