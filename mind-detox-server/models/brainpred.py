import math
from pathlib import Path
import pandas as pd
from joblib import load

# ✅ Always resolve relative to THIS file (important when Node runs from other cwd)
MODEL_DIR = Path(__file__).parent
CLF_PATH = MODEL_DIR / "brain_health_classifier.joblib"
REG_PATH = MODEL_DIR / "brain_health_regressor.joblib"


def _clamp(x, lo, hi):
    return max(lo, min(hi, x))


def _safe_float(x, default=0.0):
    try:
        if x is None:
            return default
        if isinstance(x, str) and x.strip() == "":
            return default
        return float(x)
    except Exception:
        return default


def _safe_int(x, default=0):
    try:
        return int(round(_safe_float(x, default)))
    except Exception:
        return default


def build_features_from_15q(payload: dict) -> pd.DataFrame:
    """
    Convert 15-question JSON into the FULL feature set expected by the model.
    Returns a 1-row DataFrame with ALL required columns.
    """

    # ---- Required answers (15Q) ----
    age = _safe_int(payload.get("age"), 0)
    gender = str(payload.get("gender", "Male"))
    residence = str(payload.get("residence", "Urban"))
    occupation = str(payload.get("occupation", "Other"))
    phone_type = str(payload.get("phone_type", "Android"))

    sm_hours = _safe_float(payload.get("social_media_hours_per_day"), 0)
    g_hours = _safe_float(payload.get("gaming_hours_per_day"), 0)
    late_night_days = _safe_int(payload.get("late_night_screen_days_per_week"), 0)

    platform = str(payload.get("most_used_social_platform", "Other"))
    game_type = str(payload.get("primary_game_type", "No gaming"))

    sleep_hours = _safe_float(payload.get("sleep_hours"), 7)
    stress = _safe_float(payload.get("stress_0_10"), 0)
    anxiety = _safe_float(payload.get("anxiety_0_10"), 0)
    activity_days = _safe_int(payload.get("physical_activity_days_per_week"), 0)

    routine = str(payload.get("breaks_and_calm_time", "B")).strip().lower()  # "A"/"B"/"C" or text

    # ---- Map Q15 into breaks + meditation + (small) sleep quality influence ----
    if routine in ["a", "good", "often", "yes"]:
        breaks_every_hour = 1
        meditation_minutes = 15
        sleep_quality = 4
    elif routine in ["b", "average", "sometimes", "mid"]:
        breaks_every_hour = 1
        meditation_minutes = 7
        sleep_quality = 3
    else:  # "c" low
        breaks_every_hour = 0
        meditation_minutes = 2
        sleep_quality = 2

    # ---- Derived / default fields to match training schema ----
    other_screen = _clamp(1.6 + 0.15 * sm_hours, 0, 8)
    screen_total = _clamp(sm_hours + g_hours + other_screen, 0, 16)

    notifications = int(_clamp(70 + 12 * sm_hours + 4 * late_night_days, 0, 500))

    doomscroll = int(_clamp(round(1 + (sm_hours / 12) * 3.5 + (stress / 10) * 1.2), 1, 5))
    fomo = int(_clamp(round(1 + (sm_hours / 12) * 3.0 + (anxiety / 10) * 1.5), 1, 5))
    social_compare = int(_clamp(round(1 + (sm_hours / 12) * 3.0 + (stress / 10) * 1.0), 1, 5))

    gaming_craving = int(_clamp(round(1 + (g_hours / 12) * 3.4 + (stress / 10) * 1.2), 1, 5))
    rage_quit = int(_clamp(round(1 + (g_hours / 12) * 3.0 + (anxiety / 10) * 1.3), 1, 5))

    spend = int(_clamp(round(max(0, 80 + 320 * g_hours)), 0, 25000))

    eye_strain = int(_clamp(round(1 + 0.22 * screen_total + 0.12 * late_night_days), 1, 5))
    headache_days = int(_clamp(round(1 + 0.35 * late_night_days + 0.25 * stress + 0.18 * screen_total), 0, 25))

    offline_social = float(_clamp(round(7.0 - 0.8 * (sm_hours + g_hours), 1), 0, 25))

    family_conflicts = int(_clamp(round(max(0, (doomscroll + gaming_craving) / 2 - 2)), 0, 20))

    productivity_drop = float(
        _clamp(round(2.8 + 0.35 * (sm_hours + g_hours) + 0.25 * late_night_days - 0.2 * sleep_hours, 1), 0, 10)
    )

    focus_minutes = int(_clamp(round(50 - 3.2 * (sm_hours + g_hours) + 2.0 * activity_days + 1.5 * (sleep_hours - 6)), 5, 120))

    caffeine = 1.5
    water = 2.2

    mood_swings = "Sometimes"
    if stress >= 7.5 or anxiety >= 7.5:
        mood_swings = "Often"
    if stress >= 9.0 or anxiety >= 9.0:
        mood_swings = "Very often"
    if stress <= 3.0 and anxiety <= 3.0:
        mood_swings = "Rarely"

    row = {
        "age": age,
        "gender": gender,
        "residence": residence,
        "occupation": occupation,
        "phone_type": phone_type,

        "social_media_hours_per_day": float(_clamp(sm_hours, 0, 12)),
        "gaming_hours_per_day": float(_clamp(g_hours, 0, 12)),
        "screen_time_total_hours_per_day": float(_clamp(screen_total, 0, 16)),
        "late_night_screen_days_per_week": int(_clamp(late_night_days, 0, 7)),

        "notifications_per_day": notifications,

        "doomscroll_likert_1_5": doomscroll,
        "fomo_likert_1_5": fomo,
        "social_comparison_likert_1_5": social_compare,

        "gaming_craving_likert_1_5": gaming_craving,
        "rage_quit_likert_1_5": rage_quit,

        "in_game_spend_inr_per_month": spend,

        "sleep_hours": float(_clamp(sleep_hours, 3.5, 9.5)),
        "sleep_quality_1_5": int(_clamp(sleep_quality, 1, 5)),

        "physical_activity_days_per_week": int(_clamp(activity_days, 0, 7)),
        "caffeine_cups_per_day": float(_clamp(caffeine, 0, 8)),
        "water_liters_per_day": float(_clamp(water, 0.6, 5.0)),

        "stress_0_10": float(_clamp(stress, 0, 10)),
        "anxiety_0_10": float(_clamp(anxiety, 0, 10)),
        "mood_swings_freq": mood_swings,

        "headache_days_per_month": headache_days,
        "eye_strain_1_5": eye_strain,

        "offline_social_hours_per_week": offline_social,
        "family_conflicts_per_month": family_conflicts,

        "productivity_drop_0_10": productivity_drop,
        "focus_minutes_before_distraction": focus_minutes,

        "most_used_social_platform": platform,
        "primary_game_type": game_type,

        "breaks_every_hour": breaks_every_hour,
        "meditation_minutes_per_day": int(_clamp(meditation_minutes, 0, 60)),
    }

    return pd.DataFrame([row])


def _probability_score(clf, X_one: pd.DataFrame) -> float:
    """
    Convert classifier probabilities into a smooth 0-100 score.
    You can tune anchors; these are user-friendly defaults.
    """
    # Anchors for class labels -> score centers
    anchors = {
        "Good": 85.0,
        "Moderate": 55.0,
        "Poor": 20.0,
    }

    # If model doesn't support proba, fallback
    if not hasattr(clf, "predict_proba"):
        return 50.0

    probs = clf.predict_proba(X_one)[0]
    classes = list(getattr(clf, "classes_", []))

    # Weighted sum of anchor scores
    total = 0.0
    used = 0.0
    for c, p in zip(classes, probs):
        c = str(c)
        if c in anchors:
            total += float(p) * anchors[c]
            used += float(p)

    if used <= 0:
        return 50.0

    return float(_clamp(total / used, 0, 100))


def predict_brain_health(payload_15q: dict) -> dict:
    clf = load(CLF_PATH)
    reg = load(REG_PATH)

    X_one = build_features_from_15q(payload_15q)

    pred_class = clf.predict(X_one)[0]

    # --- regressor score ---
    raw_reg = float(reg.predict(X_one)[0])
    reg_score = float(_clamp(raw_reg, 0, 100))

    # --- classifier probability smooth score ---
    proba_score = _probability_score(clf, X_one)

    # ✅ Smooth final score:
    # If regressor collapses to 0 (common), we still get a usable score from proba
    if reg_score <= 1.0:
        final_score = proba_score
    else:
        final_score = 0.75 * reg_score + 0.25 * proba_score

    final_score = float(_clamp(final_score, 0, 100))

    return {
        "predicted_brain_health_class": str(pred_class),
        "predicted_brain_health_score_0_100": round(final_score, 1),
        "expanded_features_used": X_one.iloc[0].to_dict(),
    }


# ----------------------------
# Example JSON input (15Q)
# ----------------------------
if __name__ == "__main__":
    sample = {
        "age": 22,
        "gender": "Male",
        "residence": "Urban",
        "occupation": "College",
        "phone_type": "Android",
        "social_media_hours_per_day": 4.5,
        "gaming_hours_per_day": 2.0,
        "late_night_screen_days_per_week": 5,
        "most_used_social_platform": "Instagram",
        "primary_game_type": "BGMI/PUBG",
        "sleep_hours": 6.0,
        "stress_0_10": 6.5,
        "anxiety_0_10": 5.5,
        "physical_activity_days_per_week": 2,
        "breaks_and_calm_time": "B"
    }

    result = predict_brain_health(sample)
    print(result["predicted_brain_health_class"], result["predicted_brain_health_score_0_100"])
