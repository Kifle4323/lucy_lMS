"""
Lucy LMS - Student Performance ML Service
FastAPI microservice that:
1. Trains on the lms_advanced_dataset.csv (2000 records)
2. Can also aggregate features from PostgreSQL for live predictions
3. Trains a Random Forest classifier to predict pass/fail
4. Exposes prediction & analytics endpoints

Run: cd apps/ml && uvicorn main:app --host 0.0.0.0 --port 8000
"""
import os, json, random
from pathlib import Path
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
import psycopg2
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib

# ─── Config ───────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    env_path = os.path.join(os.path.dirname(__file__), '..', 'api', '.env')
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith('DATABASE_URL='):
                    DATABASE_URL = line.split('=', 1)[1].strip('"').strip("'")
                    break
    except FileNotFoundError:
        pass

MODEL_DIR = Path(__file__).parent / 'models'
MODEL_DIR.mkdir(exist_ok=True)
MODEL_PATH = MODEL_DIR / 'performance_model.joblib'
FEATURES_PATH = MODEL_DIR / 'feature_stats.json'
CSV_PATH = Path(__file__).parent / 'lms_advanced_dataset.csv'

app = FastAPI(title="Lucy ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Feature Engineering ──────────────────────────────────────────────────────
FEATURE_COLUMNS = [
    'attendance', 'quiz_score', 'participation', 'video_watch',
    'ppt_progress', 'has_video', 'has_ppt', 'assignment_score', 'course_type_encoded'
]
TARGET_COLUMN = 'pass'

# Course type encoding map (consistent across training and prediction)
COURSE_TYPE_MAP = {'f2f': 0, 'online': 1, 'blended': 2}

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare features for ML."""
    df = df.copy()
    # Encode course_type using consistent mapping
    df['course_type_encoded'] = df['course_type'].map(COURSE_TYPE_MAP).fillna(1).astype(int)
    df['has_video'] = df['has_video'].astype(int)
    df['has_ppt'] = df['has_ppt'].astype(int)
    df['pass'] = df['pass'].astype(int)
    # Fill NaN
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    return df

def save_feature_stats(df: pd.DataFrame):
    """Save feature statistics for normalization during prediction."""
    stats = {}
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            stats[col] = {
                'mean': float(df[col].mean()),
                'std': float(df[col].std()),
                'min': float(df[col].min()),
                'max': float(df[col].max()),
            }
    with open(FEATURES_PATH, 'w') as f:
        json.dump(stats, f, indent=2)

# ─── Model Training ──────────────────────────────────────────────────────────
def train_model(df: pd.DataFrame):
    """Train and save the performance prediction model."""
    df = engineer_features(df)
    save_feature_stats(df)

    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Train Random Forest
    rf = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, class_weight='balanced')
    rf.fit(X_train, y_train)

    # Evaluate
    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cv_scores = cross_val_score(rf, X, y, cv=5, scoring='accuracy')
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred).tolist()

    # Feature importance
    importance = dict(zip(FEATURE_COLUMNS, rf.feature_importances_.tolist()))

    # Save model
    joblib.dump(rf, MODEL_PATH)

    return {
        'accuracy': round(acc, 4),
        'cv_mean': round(float(cv_scores.mean()), 4),
        'cv_std': round(float(cv_scores.std()), 4),
        'classification_report': report,
        'confusion_matrix': cm,
        'feature_importance': {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])},
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'trained_at': datetime.now().isoformat(),
        'data_source': 'csv',
    }

# ─── Database (for live predictions) ─────────────────────────────────────────
def get_conn():
    if not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL)

def fetch_student_features(student_id: str):
    """Fetch a student's current features from the database for prediction."""
    conn = get_conn()
    if not conn:
        return None
    try:
        query = """
            SELECT
                cs."deliveryMode" AS course_type,
                COALESCE(a.score, 0) AS attendance,
                COALESCE(sg."quizScore", 0) AS quiz_score,
                COALESCE(part.val, 0) AS participation,
                COALESCE(vid.ratio, 0) AS video_watch,
                COALESCE(ppt.ratio, 0) AS ppt_progress,
                CASE WHEN vid.count > 0 THEN 1 ELSE 0 END AS has_video,
                CASE WHEN ppt.count > 0 THEN 1 ELSE 0 END AS has_ppt,
                COALESCE(sg."assignmentScore", 0) AS assignment_score,
                cs."courseId",
                c.title AS course_title,
                c.code AS course_code
            FROM "StudentEnrollment" se
            JOIN "CourseSection" cs ON cs.id = se."courseSectionId"
            JOIN "Course" c ON c.id = cs."courseId"
            LEFT JOIN "StudentGrade" sg ON sg."enrollmentId" = se.id
            LEFT JOIN "Attendance" a ON a."studentId" = %s AND a."courseId" = cs."courseId"
            LEFT JOIN (
                SELECT AVG(LEAST("durationSec"::float / 3600.0, 1.0)) AS val
                FROM "MaterialView" WHERE "studentId" = %s
            ) part ON TRUE
            LEFT JOIN (
                SELECT AVG(
                    CASE WHEN m.type = 'VIDEO' OR m."htmlContent" IS NOT NULL
                         THEN LEAST(mv."durationSec"::float / 3600.0, 1.0) ELSE 0 END) AS ratio,
                    COUNT(*) AS count
                FROM "MaterialView" mv JOIN "Material" m ON m.id = mv."materialId"
                WHERE mv."studentId" = %s AND (m.type = 'VIDEO' OR m."htmlContent" IS NOT NULL)
            ) vid ON TRUE
            LEFT JOIN (
                SELECT AVG(
                    CASE WHEN "totalSlides" > 0
                         THEN "completedSlides"::float / "totalSlides" ELSE 0 END) AS ratio
                FROM "MaterialReadingProgress" WHERE "studentId" = %s
            ) ppt ON TRUE
            WHERE se."studentId" = %s AND se.status = 'ENROLLED'
        """
        cur = conn.cursor()
        cur.execute(query, (student_id, student_id, student_id, student_id, student_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception:
        if conn: conn.close()
        return None

# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    csv_exists = CSV_PATH.exists()
    model_exists = MODEL_PATH.exists()
    return {
        "status": "ok",
        "service": "lucy-ml",
        "csv_data": csv_exists,
        "model_trained": model_exists,
    }

@app.post("/ml/train")
def train():
    """Train the model using the CSV dataset."""
    try:
        if not CSV_PATH.exists():
            raise HTTPException(400, f"CSV dataset not found at {CSV_PATH}")

        df = pd.read_csv(CSV_PATH)
        if len(df) < 10:
            raise HTTPException(400, f"Not enough data to train. Found {len(df)} records, need at least 10.")

        # Validate required columns
        required = {'student_id', 'course_type', 'attendance', 'quiz_score', 'participation',
                    'video_watch', 'ppt_progress', 'has_video', 'has_ppt', 'assignment_score',
                    'final_score', 'pass'}
        missing = required - set(df.columns)
        if missing:
            raise HTTPException(400, f"Missing columns in CSV: {missing}")

        result = train_model(df)
        result['data_points'] = len(df)
        result['csv_file'] = CSV_PATH.name

        # Add dataset statistics
        result['dataset_stats'] = {
            'total_records': len(df),
            'pass_count': int(df['pass'].sum()),
            'fail_count': int(len(df) - df['pass'].sum()),
            'pass_rate': round(float(df['pass'].mean() * 100), 1),
            'course_types': df['course_type'].value_counts().to_dict(),
            'avg_attendance': round(float(df['attendance'].mean()), 1),
            'avg_quiz_score': round(float(df['quiz_score'].mean()), 1),
            'avg_assignment_score': round(float(df['assignment_score'].mean()), 1),
            'avg_final_score': round(float(df['final_score'].mean()), 1),
        }
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Training failed: {str(e)}")

@app.post("/ml/predict")
def predict(features: dict):
    """Predict pass/fail for a single student's features."""
    if not MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained yet. Call /ml/train first.")

    model = joblib.load(MODEL_PATH)

    # Build feature vector
    course_type = features.get('course_type', 'online')
    course_type_encoded = COURSE_TYPE_MAP.get(course_type, 1)

    x = [[
        float(features.get('attendance', 0)),
        float(features.get('quiz_score', 0)),
        float(features.get('participation', 0)),
        float(features.get('video_watch', 0)),
        float(features.get('ppt_progress', 0)),
        int(features.get('has_video', 0)),
        int(features.get('has_ppt', 0)),
        float(features.get('assignment_score', 0)),
        course_type_encoded,
    ]]

    prediction = int(model.predict(x)[0])
    proba = model.predict_proba(x)[0].tolist()

    return {
        'prediction': 'PASS' if prediction == 1 else 'FAIL',
        'confidence': round(float(max(proba)), 4),
        'pass_probability': round(float(proba[1] if len(proba) > 1 else proba[0]), 4),
        'fail_probability': round(float(proba[0] if len(proba) > 1 else 1 - proba[0]), 4),
    }

@app.post("/ml/predict-student/{student_id}")
def predict_student(student_id: str):
    """Predict pass/fail for a specific student using DB data."""
    if not MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained yet. Call /ml/train first.")

    model = joblib.load(MODEL_PATH)

    # Try to get features from database
    rows = fetch_student_features(student_id)
    if not rows:
        raise HTTPException(404, f"No enrollment data found for student {student_id}")

    predictions = []
    for row in rows:
        course_type, attendance, quiz_score, participation, video_watch, ppt_progress, \
            has_video, has_ppt, assignment_score, course_id, course_title, course_code = row

        # Map deliveryMode to course_type encoding
        ct_str = (course_type or 'ONLINE').lower()
        course_type_encoded = COURSE_TYPE_MAP.get(ct_str, 1)

        x = [[
            float(attendance or 0), float(quiz_score or 0), float(participation or 0),
            float(video_watch or 0), float(ppt_progress or 0), int(has_video or 0),
            int(has_ppt or 0), float(assignment_score or 0), course_type_encoded,
        ]]

        pred = int(model.predict(x)[0])
        proba = model.predict_proba(x)[0].tolist()

        predictions.append({
            'course_id': course_id,
            'course_title': course_title,
            'course_code': course_code,
            'prediction': 'PASS' if pred == 1 else 'FAIL',
            'pass_probability': round(float(proba[1] if len(proba) > 1 else proba[0]), 4),
            'features': {
                'attendance': attendance, 'quiz_score': quiz_score, 'participation': participation,
                'video_watch': video_watch, 'ppt_progress': ppt_progress,
                'has_video': has_video, 'has_ppt': has_ppt, 'assignment_score': assignment_score,
            }
        })

    return {'student_id': student_id, 'predictions': predictions}

@app.get("/ml/analytics")
def analytics():
    """Get overall performance analytics from the CSV dataset and model insights."""
    try:
        if not CSV_PATH.exists():
            raise HTTPException(404, "CSV dataset not found")

        df = pd.read_csv(CSV_PATH)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to load CSV: {str(e)}")

    if len(df) == 0:
        raise HTTPException(404, "No data available")

    total = len(df)
    pass_rate = round(float(df['pass'].mean()) * 100, 1)

    # Feature correlations with pass
    df_eng = engineer_features(df)
    correlations = {}
    if 'pass' in df_eng.columns:
        for col in FEATURE_COLUMNS:
            if col in df_eng.columns:
                correlations[col] = round(float(df_eng[col].corr(df_eng['pass'])), 4)

    # Score distributions
    score_cols = ['attendance', 'quiz_score', 'assignment_score', 'final_score']
    score_bins = {}
    for col in score_cols:
        if col in df.columns:
            vals = df[col].dropna()
            score_bins[col] = {
                'mean': round(float(vals.mean()), 1),
                'median': round(float(vals.median()), 1),
                'std': round(float(vals.std()), 1),
                'min': round(float(vals.min()), 1),
                'max': round(float(vals.max()), 1),
            }

    # Course type comparison
    type_groups = {}
    for ct in df['course_type'].unique():
        sub = df[df['course_type'] == ct]
        type_groups[ct] = {
            'count': len(sub),
            'pass_rate': round(float(sub['pass'].mean() * 100), 1),
            'avg_final_score': round(float(sub['final_score'].mean()), 1),
            'avg_attendance': round(float(sub['attendance'].mean()), 1),
            'avg_quiz_score': round(float(sub['quiz_score'].mean()), 1),
        }

    # At-risk students (low scores)
    at_risk = []
    at_risk_df = df[(df['final_score'] < 50) | ((df['attendance'] < 60) & (df['quiz_score'] < 40))]
    for _, row in at_risk_df.head(30).iterrows():
        at_risk.append({
            'student_id': int(row['student_id']),
            'final_score': round(float(row['final_score']), 1),
            'attendance': round(float(row['attendance']), 1),
            'course_type': row['course_type'],
            'risk_level': 'HIGH' if row['final_score'] < 35 else 'MEDIUM',
        })

    # Model info
    model_info = None
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
        model_info = {
            'trained': True,
            'feature_importance': dict(zip(FEATURE_COLUMNS,
                [round(v, 4) for v in model.feature_importances_])),
        }
        if FEATURES_PATH.exists():
            with open(FEATURES_PATH) as f:
                model_info['feature_stats'] = json.load(f)
    else:
        model_info = {'trained': False}

    return {
        'total_students': total,
        'pass_rate': pass_rate,
        'correlations': correlations,
        'score_distributions': score_bins,
        'course_type_comparison': type_groups,
        'at_risk_students': at_risk,
        'model': model_info,
    }

@app.get("/ml/feature-importance")
def feature_importance():
    """Get feature importance from trained model."""
    if not MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained yet. Call /ml/train first.")

    model = joblib.load(MODEL_PATH)
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    return {'feature_importance': {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])}}
