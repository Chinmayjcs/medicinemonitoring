from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import numpy as np
from pymongo import MongoClient

MODEL_PATH = os.environ.get("MODEL_PATH", "model.joblib")
MONGODB_URI = os.environ.get("MONGODB_URI")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "medicine_monitoring")
TRAIN_COLLECTION = os.environ.get("TRAIN_COLLECTION", "ml-training-dataset")

app = FastAPI(title="Medicine Monitoring ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictIn(BaseModel):
    temperature: float
    humidity: float
    lux: float

class PredictOut(BaseModel):
    status: str
    confidence: float


def get_training_data():
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI env var is not set")
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    col = db[TRAIN_COLLECTION]

    cursor = col.find({}, {"temperature": 1, "humidity": 1, "lux": 1, "STATUS": 1})
    X, y = [], []
    for doc in cursor:
        try:
            temp = float(doc.get("temperature"))
            hum = float(doc.get("humidity"))
            lux = float(doc.get("lux"))
            status = str(doc.get("STATUS", "SAFE")).strip().upper()
            label = 1 if status == "UNSAFE" else 0
            X.append([temp, hum, lux])
            y.append(label)
        except Exception:
            # skip bad rows
            continue
    if not X:
        raise RuntimeError("No training data found in collection ml-training-dataset")
    return np.array(X, dtype=float), np.array(y, dtype=int)


@app.post("/train")
def train_model():
    try:
        X, y = get_training_data()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        clf = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
        clf.fit(X_train, y_train)
        preds = clf.predict(X_test)
        acc = float(accuracy_score(y_test, preds))
        joblib.dump(clf, MODEL_PATH)
        return {"success": True, "message": "Model trained", "accuracy": acc, "samples": int(len(y))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def load_model() -> RandomForestClassifier:
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError("Model not trained yet. Call /train first.")
    model = joblib.load(MODEL_PATH)
    return model


@app.post("/predict", response_model=PredictOut)
def predict(inp: PredictIn):
    try:
        model = load_model()
        X = np.array([[inp.temperature, inp.humidity, inp.lux]], dtype=float)
        proba = model.predict_proba(X)[0]
        # class order matches model.classes_ (0=SAFE, 1=UNSAFE)
        unsafe_prob = float(proba[1])
        safe_prob = float(proba[0])
        status = "UNSAFE" if unsafe_prob >= 0.5 else "SAFE"
        confidence = unsafe_prob if status == "UNSAFE" else safe_prob
        return {"status": status, "confidence": round(confidence, 4)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def root():
    return {"service": "ml-service", "status": "running"}
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")