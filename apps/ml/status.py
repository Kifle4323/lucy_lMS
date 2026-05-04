"""
Lucy ML Service - Model Status & Metrics
Run: cd apps/ml && python status.py
Shows: accuracy, precision, recall, F1, TP, FP, TN, FN, confusion matrix, feature importance
"""
import os, sys, json
from pathlib import Path
from datetime import datetime

# ─── Config ────────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent / 'models'
MODEL_PATH = MODEL_DIR / 'performance_model.joblib'
FEATURES_PATH = MODEL_DIR / 'feature_stats.json'
CSV_PATH = Path(__file__).parent / 'lms_advanced_dataset.csv'
FEATURE_COLUMNS = [
    'attendance', 'quiz_score', 'participation', 'video_watch',
    'ppt_progress', 'has_video', 'has_ppt', 'assignment_score', 'course_type_encoded'
]
COURSE_TYPE_MAP = {'f2f': 0, 'online': 1, 'blended': 2}


def main():
    # Check model exists
    if not MODEL_PATH.exists():
        print("❌ Model not trained yet. Run: POST /ml/train or train from main.py")
        return

    import joblib
    import pandas as pd
    import numpy as np
    from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score

    model = joblib.load(MODEL_PATH)
    mtime = datetime.fromtimestamp(MODEL_PATH.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
    size_kb = MODEL_PATH.stat().st_size / 1024

    # Load CSV and prepare test data (same split as training)
    if not CSV_PATH.exists():
        print("❌ CSV dataset not found")
        return

    df = pd.read_csv(CSV_PATH)
    df['course_type_encoded'] = df['course_type'].map(COURSE_TYPE_MAP).fillna(1).astype(int)
    df['has_video'] = df['has_video'].astype(int)
    df['has_ppt'] = df['has_ppt'].astype(int)
    df['pass'] = df['pass'].astype(int)
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    from sklearn.model_selection import train_test_split
    X = df[FEATURE_COLUMNS].values
    y = df['pass'].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]  # probability of PASS

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    total = tp + fp + fn + tn
    accuracy = (tp + tn) / total
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0  # False Positive Rate
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0  # False Negative Rate

    # ROC AUC
    try:
        auc = roc_auc_score(y_test, y_prob)
    except:
        auc = 0.0

    # ─── Print Report ──────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  LUCY ML SERVICE — MODEL STATUS & METRICS")
    print("=" * 60)

    print(f"\n📝 Model Info")
    print(f"   Algorithm       : {type(model).__name__}")
    print(f"   N Estimators    : {model.n_estimators}")
    print(f"   Max Depth       : {model.max_depth}")
    print(f"   Trained at      : {mtime}")
    print(f"   File size       : {size_kb:.1f} KB")
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples    : {len(X_test)}")

    print(f"\n📊 Dataset Overview")
    print(f"   Total records   : {len(df)}")
    print(f"   Pass (1)        : {int(df['pass'].sum())} ({df['pass'].mean()*100:.1f}%)")
    print(f"   Fail (0)        : {int(len(df) - df['pass'].sum())} ({(1-df['pass'].mean())*100:.1f}%)")
    if 'course_type' in df.columns:
        for ct, count in df['course_type'].value_counts().items():
            print(f"   {ct:10s}      : {count} ({count/len(df)*100:.1f}%)")

    print(f"\n🎯 Core Metrics (Test Set)")
    print(f"   Accuracy        : {accuracy*100:.2f}%")
    print(f"   Precision       : {precision*100:.2f}%  (of predicted PASS, how many actually passed)")
    print(f"   Recall (TPR)    : {recall*100:.2f}%  (of actual PASS, how many correctly predicted)")
    print(f"   Specificity(TNR): {specificity*100:.2f}%  (of actual FAIL, how many correctly predicted)")
    print(f"   F1 Score        : {f1*100:.2f}%")
    print(f"   ROC AUC         : {auc:.4f}")

    print(f"\n📋 Confusion Matrix")
    print(f"   ┌─────────────────────────────────────┐")
    print(f"   │                     Predicted        │")
    print(f"   │                   FAIL    PASS       │")
    print(f"   │  Actual FAIL   │  {tn:5d}   {fp:5d}      │")
    print(f"   │  Actual PASS   │  {fn:5d}   {tp:5d}      │")
    print(f"   └─────────────────────────────────────┘")

    print(f"\n🔢 Detailed Breakdown")
    print(f"   True Positive  (TP) : {tp:5d}  ({tp/total*100:5.2f}%)  — correctly predicted PASS")
    print(f"   True Negative  (TN) : {tn:5d}  ({tn/total*100:5.2f}%)  — correctly predicted FAIL")
    print(f"   False Positive (FP) : {fp:5d}  ({fp/total*100:5.2f}%)  — predicted PASS, actually FAIL (Type I)")
    print(f"   False Negative (FN) : {fn:5d}  ({fn/total*100:5.2f}%)  — predicted FAIL, actually PASS (Type II)")

    print(f"\n📈 Error Rates")
    print(f"   False Positive Rate (FPR) : {fpr*100:.2f}%  — % of FAIL students wrongly flagged as PASS")
    print(f"   False Negative Rate (FNR) : {fnr*100:.2f}%  — % of PASS students wrongly flagged as FAIL")
    print(f"   Type I Error  : {fp} students told they'll pass but won't")
    print(f"   Type II Error : {fn} students told they'll fail but would pass")

    # Cross-validation
    from sklearn.model_selection import cross_val_score
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    print(f"\n🔄 5-Fold Cross Validation")
    print(f"   Fold scores : {[round(s, 4) for s in cv_scores]}")
    print(f"   Mean        : {cv_scores.mean()*100:.2f}%")
    print(f"   Std Dev     : {cv_scores.std()*100:.2f}%")

    # Feature importance
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    sorted_imp = sorted(importance.items(), key=lambda x: -x[1])
    print(f"\n🔬 Feature Importance (ranked)")
    for i, (feat, val) in enumerate(sorted_imp, 1):
        bar = '█' * int(val * 40)
        print(f"   {i}. {feat:22s} {val:.4f} {bar}")

    # Per-class metrics from sklearn
    report = classification_report(y_test, y_pred, target_names=['FAIL', 'PASS'], output_dict=True, zero_division=0)
    print(f"\n📊 Per-Class Metrics")
    for cls in ['FAIL', 'PASS']:
        m = report[cls]
        print(f"   {cls:5s}: precision={m['precision']*100:.1f}%  recall={m['recall']*100:.1f}%  f1={m['f1-score']*100:.1f}%  support={m['support']}")

    # Feature stats
    if FEATURES_PATH.exists():
        with open(FEATURES_PATH) as f:
            stats = json.load(f)
        print(f"\n📏 Feature Statistics (training data)")
        print(f"   {'Feature':22s} {'Mean':>8s} {'Std':>8s} {'Min':>8s} {'Max':>8s}")
        print(f"   {'─'*22} {'─'*8} {'─'*8} {'─'*8} {'─'*8}")
        for col in FEATURE_COLUMNS:
            if col in stats:
                s = stats[col]
                print(f"   {col:22s} {s['mean']:8.2f} {s['std']:8.2f} {s['min']:8.2f} {s['max']:8.2f}")

    print(f"\n{'='*60}")
    print(f"  Status: ✅ Model is trained and ready for predictions")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
