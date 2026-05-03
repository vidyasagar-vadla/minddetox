import json
from pathlib import Path

import pandas as pd
from joblib import load

import brainpred
import liverpred
import lungpred

# ✅ Everything inside the SAME folder: models/
BASE = Path(__file__).parent

LIVER_MODEL = str(BASE / "liver_health_model_pipeline.joblib")
LUNG_MODEL = str(BASE / "lung_risk_pipeline.joblib")
STOMACH_MODEL = str(BASE / "stomach_health_model.joblib")


# -----------------------------
# Helpers
# -----------------------------
def fnum(x, default=0.0):
    try:
        if x is None:
            return default
        if isinstance(x, str) and x.strip() == "":
            return default
        return float(x)
    except Exception:
        return default


def inum(x, default=0):
    return int(round(fnum(x, default)))


def compute_bmi(height_cm, weight_kg):
    h = fnum(height_cm, 0) / 100.0
    w = fnum(weight_kg, 0)
    if h <= 0 or w <= 0:
        return 0.0
    return round(w / (h * h), 2)


def bucket_cigs_per_day(cigs: int) -> str:
    if cigs <= 0:
        return "None"
    if cigs <= 5:
        return "1–5"
    if cigs <= 10:
        return "6–10"
    if cigs <= 20:
        return "11–20"
    return "20+"


def bucket_years_smoked(yrs: int) -> str:
    if yrs <= 0:
        return "0"
    if yrs <= 5:
        return "1–5"
    if yrs <= 10:
        return "6–10"
    if yrs <= 20:
        return "11–20"
    return "20+"


def map_tobacco_product(tobacco_type: str) -> str:
    s = (tobacco_type or "").lower()
    if "vape" in s or "e-cig" in s:
        return "Vaping / E-cigarette"
    if "hookah" in s or "sheesha" in s:
        return "Hookah / Sheesha"
    if "smokeless" in s or "gutkha" in s or "khaini" in s or "paan" in s:
        return "Gutkha / Paan / Khaini"
    return "None"


def checkbox_to_symptoms(ans: dict):
    """
    Supports:
      lung_symptoms: ["symptom_none"] OR ["symptom_cough", ...]
      OR old format: symptom_cough:1 etc.
    """
    if isinstance(ans.get("lung_symptoms"), list):
        cleaned = []
        for it in ans["lung_symptoms"]:
            if isinstance(it, str):
                cleaned.append(it.replace("symptom_", ""))
            elif isinstance(it, dict) and it.get("id"):
                cleaned.append(str(it["id"]).replace("symptom_", ""))
        if not cleaned:
            return ["none"]
        # if includes "none", keep only none
        if any(x.lower() == "none" for x in cleaned):
            return ["none"]
        return cleaned

    out = []
    for key in ("symptom_cough", "symptom_wheeze", "symptom_breathlessness", "symptom_chest_tightness"):
        if inum(ans.get(key), 0) == 1:
            out.append(key.replace("symptom_", ""))
    return out or ["none"]


# -----------------------------
# ✅ NORMALIZE DB "dot keys" to flat keys
# -----------------------------
def normalize_answers(a: dict) -> dict:
    """
    Your DB stores dot keys like:
      routine.sleep_hours
      body_metrics.height_cm
      smoking_details.cigarettes_per_day
      alcohol_core.alcohol_days_per_week
    This converts them to the flat keys used by models/pred scripts.
    """
    out = dict(a)

    # --- Routine / Body ---
    out["sleep_hours"] = out.get("sleep_hours") or out.get("routine.sleep_hours")
    out["screen_time_hours"] = out.get("screen_time_hours") or out.get("routine.screen_time_hours")
    out["exercise_days_per_week"] = out.get("exercise_days_per_week") or out.get("routine.exercise_days_per_week")

    out["height_cm"] = out.get("height_cm") or out.get("body_metrics.height_cm")
    out["weight_kg"] = out.get("weight_kg") or out.get("body_metrics.weight_kg")
    out["waist_cm"] = out.get("waist_cm") or out.get("body_metrics.waist_cm")

    # --- Smoking details ---
    out["smoking_status"] = out.get("smoking_status") or out.get("smoking_details.smoking_status")
    out["cigarettes_per_day"] = out.get("cigarettes_per_day") or out.get("smoking_details.cigarettes_per_day")
    out["years_smoked"] = out.get("years_smoked") or out.get("smoking_details.years_smoked")

    # --- Smokeless details ---
    out["smokeless_tobacco"] = out.get("smokeless_tobacco") or out.get("smokeless_details.smokeless_tobacco")
    out["gutkha_pouches_per_day"] = out.get("gutkha_pouches_per_day") or out.get("smokeless_details.gutkha_pouches_per_day")

    # --- Lung environment ---
    out["indoor_ventilation"] = out.get("indoor_ventilation") or out.get("lung_environment.indoor_ventilation")
    out["pollution_index_0_1"] = out.get("pollution_index_0_1") or out.get("lung_environment.pollution_index_0_1")
    out["biomass_cooking_chulha"] = out.get("biomass_cooking_chulha") or out.get("lung_environment.biomass_cooking_chulha")
    out["occupational_dust_chemical_exposure"] = out.get("occupational_dust_chemical_exposure") or out.get("lung_environment.occupational_dust_chemical_exposure")

    # --- Weekly food ---
    out["junk_fast_food_meals_per_week"] = out.get("junk_fast_food_meals_per_week") or out.get("weekly_food.junk_fast_food_meals_per_week")
    out["street_food_times_per_week"] = out.get("street_food_times_per_week") or out.get("weekly_food.street_food_times_per_week")
    out["fried_snacks_times_per_week"] = out.get("fried_snacks_times_per_week") or out.get("weekly_food.fried_snacks_times_per_week")
    out["sugary_drinks_per_week"] = out.get("sugary_drinks_per_week") or out.get("weekly_food.sugary_drinks_per_week")

    # --- Spice/Late night ---
    out["spicy_level_0_3"] = out.get("spicy_level_0_3") or out.get("spice_late_night.spicy_level_0_3")
    out["late_night_meals_per_week"] = out.get("late_night_meals_per_week") or out.get("spice_late_night.late_night_meals_per_week")

    # --- Daily drinks ---
    out["tea_coffee_cups_per_day"] = out.get("tea_coffee_cups_per_day") or out.get("daily_drinks.tea_coffee_cups_per_day")
    out["water_liters_per_day"] = out.get("water_liters_per_day") or out.get("daily_drinks.water_liters_per_day")

    # --- Last 30 days stomach block ---
    out["fiber_servings_per_day"] = out.get("fiber_servings_per_day") or out.get("last_30_days_block.fiber_servings_per_day")
    out["fruits_veg_servings_per_day"] = out.get("fruits_veg_servings_per_day") or out.get("last_30_days_block.fruits_veg_servings_per_day")
    out["dairy_times_per_week"] = out.get("dairy_times_per_week") or out.get("last_30_days_block.dairy_times_per_week")
    out["irregular_meals"] = out.get("irregular_meals") or out.get("last_30_days_block.irregular_meals")

    out["antacid_use_per_week"] = out.get("antacid_use_per_week") or out.get("last_30_days_block.antacid_use_per_week")
    out["acidity_days_per_month"] = out.get("acidity_days_per_month") or out.get("last_30_days_block.acidity_days_per_month")
    out["bloating_days_per_month"] = out.get("bloating_days_per_month") or out.get("last_30_days_block.bloating_days_per_month")
    out["stomach_pain_days_per_month"] = out.get("stomach_pain_days_per_month") or out.get("last_30_days_block.stomach_pain_days_per_month")

    # --- Alcohol core ---
    out["alcohol_days_per_week"] = out.get("alcohol_days_per_week") or out.get("alcohol_core.alcohol_days_per_week")
    out["drinks_per_day_on_drinking_day"] = out.get("drinks_per_day_on_drinking_day") or out.get("alcohol_core.drinks_per_day_on_drinking_day")
    out["binge_episodes_per_month"] = out.get("binge_episodes_per_month") or out.get("alcohol_core.binge_episodes_per_month")
    out["years_drinking"] = out.get("years_drinking") or out.get("alcohol_core.years_drinking")

    # --- Alcohol weekly type ---
    out["beer_bottles_per_week"] = out.get("beer_bottles_per_week") or out.get("alcohol_type_weekly.beer_bottles_per_week")
    out["country_liquor_ml_per_week"] = out.get("country_liquor_ml_per_week") or out.get("alcohol_type_weekly.country_liquor_ml_per_week")

    # --- Liver food block ---
    out["junk_food_days_per_week"] = out.get("junk_food_days_per_week") or out.get("food_liver.junk_food_days_per_week")
    out["fried_food_days_per_week"] = out.get("fried_food_days_per_week") or out.get("food_liver.fried_food_days_per_week")
    out["late_night_eating_days_per_week"] = out.get("late_night_eating_days_per_week") or out.get("food_liver.late_night_eating_days_per_week")

    # This one is liver-specific; keep also normal fruit/veg
    out["fruit_veg_servings_per_day_liver"] = out.get("fruit_veg_servings_per_day_liver") or out.get("food_liver.fruit_veg_servings_per_day_liver")

    # --- Meds & supplements ---
    out["otc_painkiller_days_per_week"] = out.get("otc_painkiller_days_per_week") or out.get("meds_supplements.otc_painkiller_days_per_week")
    out["energy_drink_per_week"] = out.get("energy_drink_per_week") or out.get("meds_supplements.energy_drink_per_week")
    out["herbal_supplements"] = out.get("herbal_supplements") or out.get("meds_supplements.herbal_supplements")

    return out


# --------------------------
# Build payloads per model
# --------------------------
def build_brain_payload(a: dict) -> dict:
    # Brainpred uses many more features internally; we pass the keys we know + it expands further.
    return {
        "age": inum(a.get("age"), 0),
        "gender": str(a.get("gender") or "Male"),
        "residence": str(a.get("residence") or "Urban"),
        "occupation": str(a.get("occupation") or "Other"),
        "phone_type": str(a.get("phone_type") or "Android"),

        "social_media_hours_per_day": fnum(a.get("social_media_hours_per_day"), 0),
        "gaming_hours_per_day": fnum(a.get("gaming_hours_per_day"), 0),
        "late_night_screen_days_per_week": inum(a.get("late_night_screen_days") or a.get("late_night_screen_days_per_week"), 0),

        "most_used_social_platform": str(a.get("most_used_platform") or a.get("most_used_social_platform") or "Other"),
        "primary_game_type": str(a.get("main_game_type") or a.get("primary_game_type") or "No gaming"),

        "sleep_hours": fnum(a.get("sleep_hours"), 7),
        "stress_0_10": fnum(a.get("stress_0_10"), 0),
        "anxiety_0_10": fnum(a.get("anxiety_0_10"), 0),
        "physical_activity_days_per_week": inum(a.get("exercise_days_per_week") or a.get("physical_activity_days_per_week"), 0),

        "breaks_and_calm_time": str(a.get("breaks_calm_time") or a.get("breaks_and_calm_time") or "B"),
    }


def build_liver_payload(a: dict) -> dict:
    q = dict(a)
    if "sex" not in q:
        q["sex"] = q.get("gender", "Male")
    return q


def build_lung_payload(a: dict) -> dict:
    sex = str(a.get("gender") or "Male")
    residence = str(a.get("residence") or "Urban")

    smoking_status = str(a.get("smoking_status") or "Never")
    cigs = inum(a.get("cigarettes_per_day") or 0)
    yrs = inum(a.get("years_smoked") or 0)

    smoker_daily = (smoking_status.lower() in ("current", "daily")) and cigs > 0
    smoking_status_15q = "Daily" if smoker_daily else ("No" if smoking_status.lower() == "never" else "Occasionally")

    symptoms_list = checkbox_to_symptoms(a)
    stress = fnum(a.get("stress_0_10"), 5)

    feeling = "Okay"
    if stress >= 8 or any(s in ("breathlessness", "wheeze") for s in symptoms_list):
        feeling = "Getting worse"
    if stress <= 3 and symptoms_list == ["none"]:
        feeling = "Good"

    bmi = compute_bmi(a.get("height_cm"), a.get("weight_kg"))

    return {
        "age": inum(a.get("age"), 0),
        "sex": sex,
        "residence": residence,
        "smoking_status": smoking_status_15q,
        "cigs_per_day_bucket": bucket_cigs_per_day(cigs),
        "years_smoked_bucket": bucket_years_smoked(yrs),
        "tobacco_product": map_tobacco_product(a.get("tobacco_type")),
        "secondhand_smoke_bucket": str(a.get("passive_smoke") or "No"),
        "alcohol_per_week_bucket": "None",
        "cooking_fuel": "Wood/Coal/Chulha" if str(a.get("biomass_cooking_chulha", "")).lower() in ("wood/coal/chulha", "yes", "1") else "Gas/Electric",
        "ventilation": str(a.get("indoor_ventilation") or "Good"),
        "dust_chemical_exposure": str(a.get("occupational_dust_chemical_exposure") or "No"),
        "activity_level": str(a.get("activity_level") or "Moderate"),
        "symptoms": symptoms_list,
        "health_feeling": feeling,
        "bmi": bmi or 24.0,
    }


def build_stomach_payload(a: dict) -> dict:
    bmi = compute_bmi(a.get("height_cm"), a.get("weight_kg"))
    alcohol_units = fnum(a.get("drinks_per_day_on_drinking_day"), 0) * fnum(a.get("alcohol_days_per_week"), 0)
    smoking_per_day = inum(a.get("cigarettes_per_day"), 0)

    return {
        "age": inum(a.get("age"), 0),
        "gender": str(a.get("gender") or "Male"),
        "bmi": bmi,
        "activity_level": str(a.get("activity_level") or "Sedentary"),
        "screen_time_hours": fnum(a.get("screen_time_hours"), 0),
        "stress_0_10": fnum(a.get("stress_0_10"), 0),
        "sleep_hours": fnum(a.get("sleep_hours"), 7),
        "irregular_meal_flag": 1 if str(a.get("irregular_meals", "No")).strip().lower() == "yes" else 0,
        "fast_food_meals_per_week": inum(a.get("junk_fast_food_meals_per_week"), 0),
        "street_food_times_per_week": inum(a.get("street_food_times_per_week"), 0),
        "fried_snacks_times_per_week": inum(a.get("fried_snacks_times_per_week"), 0),
        "sugary_drinks_per_week": inum(a.get("sugary_drinks_per_week"), 0),
        "spicy_food_level_0_3": inum(a.get("spicy_level_0_3"), 1),
        "late_night_meals_per_week": inum(a.get("late_night_meals_per_week"), 0),
        "tea_coffee_cups_per_day": inum(a.get("tea_coffee_cups_per_day"), 0),
        "water_liters_per_day": fnum(a.get("water_liters_per_day"), 2.0),
        "fiber_servings_per_day": fnum(a.get("fiber_servings_per_day"), 1.0),
        "fruits_veg_servings_per_day": fnum(a.get("fruits_veg_servings_per_day"), 2.0),
        "dairy_freq_per_week": inum(a.get("dairy_times_per_week") or a.get("dairy_freq_per_week"), 0),
        "alcohol_units_per_week": fnum(alcohol_units, 0),
        "smoking_per_day": smoking_per_day,
        "antacid_use_per_week": inum(a.get("antacid_use_per_week"), 0),
        "acidity_days_per_month": inum(a.get("acidity_days_per_month"), 0),
        "bloating_days_per_month": inum(a.get("bloating_days_per_month"), 0),
        "stomach_pain_days_per_month": inum(a.get("stomach_pain_days_per_month"), 0),
    }


def predict_all(answers: dict) -> dict:
    out = {}

    out["brain"] = brainpred.predict_brain_health(build_brain_payload(answers))
    out["liver"] = liverpred.predict_from_questionnaire_json(LIVER_MODEL, build_liver_payload(answers))

    lungpred.MODEL_PATH = LUNG_MODEL
    out["lung"] = lungpred.predict_lung_health_from_answers_json(json.dumps(build_lung_payload(answers)))

    model = load(STOMACH_MODEL)
    payload = build_stomach_payload(answers)
    X = pd.DataFrame([payload])
    pred_class = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    out["stomach"] = {
        "predicted_class": str(pred_class),
        "probabilities": {str(c): float(round(p, 4)) for c, p in zip(model.classes_, proba)},
    }

    return out


if __name__ == "__main__":
    raw = input()  # one-line JSON from node
    incoming = json.loads(raw) if raw else {}
    answers = normalize_answers(incoming)

    result = {"ok": True, "predictions": predict_all(answers)}
    print(json.dumps(result, ensure_ascii=False))
