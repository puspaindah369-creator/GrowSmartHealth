from __future__ import annotations

import json
import hashlib
import os
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

import joblib
import numpy as np
import pandas as pd

# XGBoost bersifat opsional; blok ini mencegah backend langsung gagal saat package belum terpasang.
try:
    import xgboost  # noqa: F401
except ImportError:
    xgboost = None

try:
    # MySQL dipakai untuk akun dan riwayat, tetapi import dibuat aman agar pesan error bisa dikontrol.
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    mysql = None
    MySQLError = Exception


# Path dasar backend dan lokasi file model/dataset.
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
BEST_MODELS_DIR = BASE_DIR / "model_terbaik"
BEST_MODELS_INFO_PATH = BEST_MODELS_DIR / "best_models_info.json"
GENDER_BEST_MODELS_INFO_PATH = BEST_MODELS_DIR / "best_models_info_gender.json"
ENCODER_INFO_PATH = BASE_DIR / "label_encoder_dan_mapping.pkl"
DATASET_PATH = BASE_DIR / "Data Stunting.xlsx"
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "5000"))
MYSQL_HOST = os.getenv("GROWSMART_DB_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("GROWSMART_DB_PORT", "3306"))
MYSQL_USER = os.getenv("GROWSMART_DB_USER", "root")
MYSQL_PASSWORD = os.getenv("GROWSMART_DB_PASSWORD", "")
MYSQL_DATABASE = os.getenv("GROWSMART_DB_NAME", "growsmart_db")
MODEL_MODE = os.getenv("GROWSMART_MODEL_MODE", "combined").strip().lower()
if MODEL_MODE not in ("combined", "gender"):
    # Jika env mode salah, gunakan mode combined sebagai default aman.
    MODEL_MODE = "combined"

# ============================================================
# Model loading helpers
# ============================================================
def find_model(filename: str) -> Path:
    # Cari file model di beberapa lokasi umum agar backend fleksibel terhadap struktur folder.
    candidates = [
        MODELS_DIR / filename,                   # backend/models/
        BASE_DIR / filename,                    # backend/
        BASE_DIR.parent / filename,             # growsmart/
        BASE_DIR.parent / "models" / filename,  # growsmart/models/
    ]

    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        f"File model '{filename}' tidak ditemukan.\n"
        f"Coba letakkan file di salah satu lokasi berikut:\n" +
        "\n".join(f"- {str(p)}" for p in candidates)
    )


def load_model(filename: str):
    # Temukan path model lalu muat menggunakan joblib.
    model_path = find_model(filename)

    try:
        return joblib.load(model_path), model_path
    except ModuleNotFoundError as exc:
        missing_module = str(exc).replace("No module named ", "").replace("'", "")
        raise RuntimeError(
            f"Gagal memuat model '{filename}' karena module '{missing_module}' belum terinstall.\n"
            f"Install dulu dengan perintah, misalnya:\n"
            f"pip install {missing_module}\n"
            f"\n"
            f"Kalau model dibuat dengan XGBoost, jalankan juga:\n"
            f"pip install xgboost\n"
            f"pip install scikit-learn==1.6.1"
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"Gagal memuat model '{filename}' dari path:\n{model_path}\n"
            f"Detail error: {exc}"
        ) from exc


def resolve_model_path(path_value: str) -> Path:
    # Normalisasi path dari metadata agar slash Windows/Linux sama-sama bisa dipakai.
    model_path = Path(path_value.replace("\\", "/"))
    candidates = [
        model_path,
        BASE_DIR / model_path,
        BASE_DIR.parent / model_path,
        BEST_MODELS_DIR / model_path.name,
        MODELS_DIR / model_path.name,
    ]

    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        f"File model '{path_value}' tidak ditemukan.\n"
        f"Coba letakkan file di salah satu lokasi berikut:\n" +
        "\n".join(f"- {str(p)}" for p in candidates)
    )


def load_model_from_path(path_value: str):
    # Muat model dari path yang sudah tertulis di metadata best_models_info.
    model_path = resolve_model_path(path_value)

    try:
        return joblib.load(model_path), model_path
    except ModuleNotFoundError as exc:
        missing_module = str(exc).replace("No module named ", "").replace("'", "")
        raise RuntimeError(
            f"Gagal memuat model dari '{model_path}' karena module '{missing_module}' belum terinstall.\n"
            f"Install dulu dengan perintah:\n"
            f"pip install {missing_module}"
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"Gagal memuat model dari path:\n{model_path}\n"
            f"Detail error: {exc}"
        ) from exc


def load_best_models_info() -> Dict[str, object]:
    # Metadata ini menentukan model terbaik, fitur, dan label mapping.
    if not BEST_MODELS_INFO_PATH.exists():
        raise FileNotFoundError(
            f"File metadata model terbaik tidak ditemukan: {BEST_MODELS_INFO_PATH}\n"
            "Jalankan ulang notebook sampai cell 'Latih Ulang dan Simpan Model Terbaik'."
        )

    with open(BEST_MODELS_INFO_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


BEST_MODELS_INFO = load_best_models_info()


def normalize_gender_key(value: object) -> Optional[str]:
    # Terima beberapa variasi input gender lalu ubah menjadi kode F/M.
    raw = str(value).strip().lower()
    if raw in ("f", "female", "p", "perempuan", "wanita"):
        return "F"
    if raw in ("m", "male", "l", "laki-laki", "laki laki", "laki", "pria"):
        return "M"
    return None


def load_optional_best_models_info_by_gender() -> Dict[str, Dict[str, object]]:
    # Metadata model per gender bersifat opsional.
    if not GENDER_BEST_MODELS_INFO_PATH.exists():
        return {}

    with open(GENDER_BEST_MODELS_INFO_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    if not isinstance(raw_data, dict):
        return {}

    normalized: Dict[str, Dict[str, object]] = {}
    for key, value in raw_data.items():
        gender_code = normalize_gender_key(key)
        if gender_code is None or not isinstance(value, dict):
            continue
        normalized[gender_code] = value
    return normalized


BEST_MODELS_INFO_BY_GENDER = load_optional_best_models_info_by_gender()


def load_encoder_info() -> Dict[str, object]:
    # Encoder dipakai untuk mengubah gender ke bentuk numerik.
    if not ENCODER_INFO_PATH.exists():
        raise FileNotFoundError(
            f"File label encoder tidak ditemukan: {ENCODER_INFO_PATH}\n"
            "Jalankan ulang notebook sampai cell penyimpanan label encoder."
        )

    return joblib.load(ENCODER_INFO_PATH)


ENCODER_INFO = load_encoder_info()


def parse_dataset_date(value: object) -> Optional[date]:
    # Dataset dapat berisi tanggal dalam beberapa format; fungsi ini menyeragamkannya.
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if pd.isna(value):
        return None

    raw_value = str(value).strip()
    if not raw_value:
        return None
    if " " in raw_value:
        raw_value = raw_value.split(" ", 1)[0]

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw_value, fmt).date()
        except ValueError:
            pass

    parsed = pd.to_datetime(raw_value, errors="coerce")
    if pd.isna(parsed):
        parsed = pd.to_datetime(raw_value, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def load_reference_dataset() -> pd.DataFrame:
    # Dataset referensi dipakai untuk lookup langsung bila input sama persis dengan data Excel.
    if not DATASET_PATH.exists():
        return pd.DataFrame()

    df = pd.read_excel(DATASET_PATH)
    required_columns = [
        "Gender",
        "Date of Birth",
        "Date of Measurement",
        "Age (Month)",
        "Weight",
        "Height",
        "Weight for Age",
        "Z-Score  W/A",
        "Height for Age",
        "Z-Score H/A",
        "Weight for Height",
        "Z-Score W/H",
    ]
    if any(column not in df.columns for column in required_columns):
        return pd.DataFrame()

    ref = df[required_columns].copy()
    ref["Gender"] = ref["Gender"].astype(str).str.strip().str.upper()
    ref["Date of Birth"] = ref["Date of Birth"].apply(parse_dataset_date)
    ref["Date of Measurement"] = ref["Date of Measurement"].apply(parse_dataset_date)
    ref["Age (Month)"] = pd.to_numeric(ref["Age (Month)"], errors="coerce")
    ref["Weight"] = pd.to_numeric(ref["Weight"], errors="coerce")
    ref["Height"] = pd.to_numeric(ref["Height"], errors="coerce")
    ref = ref.dropna(
        subset=[
            "Gender",
            "Date of Birth",
            "Date of Measurement",
            "Age (Month)",
            "Weight",
            "Height",
            "Weight for Age",
            "Height for Age",
            "Weight for Height",
        ]
    )
    return ref


REFERENCE_DATASET = load_reference_dataset()


# ============================================================
# MySQL helpers
# ============================================================
def require_mysql_connector() -> None:
    # Beri pesan jelas jika dependency MySQL belum diinstall.
    if mysql is None:
        raise RuntimeError(
            "mysql-connector-python belum terinstall. Jalankan: py -m pip install mysql-connector-python"
        )


def connect_mysql(database: str | None = MYSQL_DATABASE):
    # Membuat koneksi MySQL dengan konfigurasi dari environment.
    require_mysql_connector()
    kwargs = {
        "host": MYSQL_HOST,
        "port": MYSQL_PORT,
        "user": MYSQL_USER,
        "password": MYSQL_PASSWORD,
    }
    if database:
        kwargs["database"] = database
    return mysql.connector.connect(**kwargs)


def init_mysql() -> None:
    # Membuat database dan tabel yang dibutuhkan aplikasi jika belum ada.
    conn = connect_mysql(database=None)
    cursor = conn.cursor()
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    conn.commit()
    cursor.close()
    conn.close()

    conn = connect_mysql()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS detections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            record_json JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    conn.commit()
    cursor.close()
    conn.close()


def hash_password(password: str) -> str:
    # Password tidak disimpan mentah, melainkan dalam hash SHA-256.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def public_user(row: Dict[str, object]) -> Dict[str, object]:
    # Hilangkan password_hash dari data user yang dikirim ke frontend.
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "username": row["username"],
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
    }


def register_payload(data: Dict[str, object]) -> Dict[str, object]:
    # Validasi dan simpan akun baru ke tabel users.
    name = str(data.get("name", "")).strip()
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not username or not password:
        raise ValueError("Nama, username, dan password wajib diisi.")
    if len(username) < 3:
        raise ValueError("Username minimal 3 karakter.")
    if len(password) < 6:
        raise ValueError("Password minimal 6 karakter.")

    conn = connect_mysql()
    cursor = conn.cursor(dictionary=True)
    try:
      cursor.execute(
          "INSERT INTO users (name, username, password_hash) VALUES (%s, %s, %s)",
          (name, username, hash_password(password)),
      )
      conn.commit()
      user_id = cursor.lastrowid
      return {
          "user": {
              "id": int(user_id),
              "name": name,
              "username": username,
              "createdAt": datetime.now().isoformat(),
          }
      }
    except MySQLError as exc:
      if getattr(exc, "errno", None) == 1062:
          raise ValueError("Username sudah terdaftar.") from exc
      raise
    finally:
      cursor.close()
      conn.close()


def login_payload(data: Dict[str, object]) -> Dict[str, object]:
    # Validasi login berdasarkan username dan hash password.
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", ""))

    if not username or not password:
        raise ValueError("Username dan password wajib diisi.")

    conn = connect_mysql()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, username, password_hash, created_at FROM users WHERE username = %s",
            (username,),
        )
        row = cursor.fetchone()
        if not row or row["password_hash"] != hash_password(password):
            raise ValueError("Username atau password salah.")

        user = public_user(row)
        user["loggedInAt"] = datetime.now().isoformat()
        return {"user": user}
    finally:
        cursor.close()
        conn.close()


def history_payload(user_id: int) -> Dict[str, object]:
    # Ambil semua riwayat user dari tabel detections.
    conn = connect_mysql()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT record_json FROM detections WHERE user_id = %s ORDER BY id DESC",
            (user_id,),
        )
        rows = cursor.fetchall()
        history = []
        for row in rows:
            raw = row["record_json"]
            history.append(json.loads(raw) if isinstance(raw, str) else raw)
        return {"history": history}
    finally:
        cursor.close()
        conn.close()


def add_history_payload(data: Dict[str, object]) -> Dict[str, object]:
    # Simpan satu record pemeriksaan baru untuk user tertentu.
    try:
        user_id = int(data["user_id"])
    except (KeyError, TypeError, ValueError):
        raise ValueError("user_id wajib dikirim.")

    record = data.get("record")
    if not isinstance(record, dict):
        raise ValueError("record wajib berupa object.")

    record = {
        **record,
        "userId": user_id,
    }

    conn = connect_mysql()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO detections (user_id, record_json) VALUES (%s, %s)",
            (user_id, json.dumps(record, ensure_ascii=False)),
        )
        conn.commit()
        return history_payload(user_id)
    finally:
        cursor.close()
        conn.close()


def clear_history_payload(user_id: int) -> Dict[str, object]:
    # Hapus semua riwayat milik satu user.
    conn = connect_mysql()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM detections WHERE user_id = %s", (user_id,))
        conn.commit()
        return {"history": []}
    finally:
        cursor.close()
        conn.close()


# ============================================================
# Label mapping
# ============================================================
def label_mapping_for(target_name: str) -> Dict[int, str]:
    # Ubah key label mapping dari JSON menjadi integer agar cocok dengan output model.
    target_info = BEST_MODELS_INFO[target_name]
    return {int(key): value for key, value in target_info["label_mapping"].items()}


WA_MODEL_INDEX_TO_LABEL = label_mapping_for("Weight for Age")
WA_DISPLAY_ORDER = ["Normal", "Underfed", "Malnutrition", "Overnutrition"]

HA_MODEL_INDEX_TO_LABEL = label_mapping_for("Height for Age")
HA_DISPLAY_ORDER = ["Not Stunted", "Stunted"]

WH_MODEL_INDEX_TO_LABEL = label_mapping_for("Weight for Height")
WH_DISPLAY_ORDER = ["Normal", "Thin", "Very Thin", "Obese"]

STATUS_BY_LABEL = {
    "Normal": "normal",
    "Not Stunted": "normal",
    "Underfed": "warning",
    "Thin": "warning",
    "Malnutrition": "danger",
    "Stunted": "danger",
    "Very Thin": "danger",
    "Overnutrition": "info",
    "Obese": "info",
}


def status_for_label(label: object) -> str:
    # Ambil class UI berdasarkan label hasil model/dataset.
    return STATUS_BY_LABEL.get(str(label), "normal")


def dataset_indicator(
    *,
    row: pd.Series,
    label_column: str,
    z_column: str,
    display_order: List[str],
) -> Dict[str, object]:
    # Bentuk indikator dari baris dataset referensi agar formatnya sama dengan hasil model.
    label = str(row[label_column]).strip()
    z_value = row.get(z_column, "-")
    try:
        z_text = f"{float(z_value):.2f}"
    except (TypeError, ValueError):
        z_text = str(z_value)

    return {
        "result": label,
        "cls": status_for_label(label),
        "z": z_text,
        "probs": {
            item: 1.0 if item == label else 0.0
            for item in display_order
        },
        "labels": display_order,
        "model_name": "Data Stunting.xlsx",
        "model_scope": "dataset_lookup",
    }


def find_dataset_match(
    *,
    gender_code: str,
    date_of_birth: date,
    date_of_measurement: date,
    age: float,
    weight: float,
    height: float,
) -> Optional[pd.Series]:
    # Cari baris dataset yang benar-benar cocok dengan input pengguna.
    if REFERENCE_DATASET.empty:
        return None

    matches = REFERENCE_DATASET[
        (REFERENCE_DATASET["Gender"] == gender_code)
        & (REFERENCE_DATASET["Date of Birth"] == date_of_birth)
        & (REFERENCE_DATASET["Date of Measurement"] == date_of_measurement)
        & np.isclose(REFERENCE_DATASET["Age (Month)"], age, atol=0.01)
        & np.isclose(REFERENCE_DATASET["Weight"], weight, atol=0.01)
        & np.isclose(REFERENCE_DATASET["Height"], height, atol=0.01)
    ]

    if matches.empty:
        return None
    return matches.iloc[0]


def dataset_lookup_payload(
    *,
    row: pd.Series,
    age: float,
    weight: float,
    height: float,
    gender_code: str,
    gender_enc: int,
    date_of_birth: date,
    date_of_birth_days: int,
    date_of_measurement: date,
    date_of_measurement_days: int,
) -> Dict[str, object]:
    # Jika data ditemukan di dataset, gunakan label dan z-score asli dari Excel.
    wa = dataset_indicator(
        row=row,
        label_column="Weight for Age",
        z_column="Z-Score  W/A",
        display_order=WA_DISPLAY_ORDER,
    )
    ha = dataset_indicator(
        row=row,
        label_column="Height for Age",
        z_column="Z-Score H/A",
        display_order=HA_DISPLAY_ORDER,
    )
    wh = dataset_indicator(
        row=row,
        label_column="Weight for Height",
        z_column="Z-Score W/H",
        display_order=WH_DISPLAY_ORDER,
    )

    return {
        "wa": wa,
        "ha": ha,
        "wh": wh,
        "overall": get_overall_status(wa["cls"], ha["cls"], wh["cls"]),
        "meta": {
            "configured_model_mode": MODEL_MODE,
            "active_model_mode": "dataset_lookup",
            "gender_models_available": sorted(GENDER_MODELS.keys()),
            "date_of_birth_used": True,
            "dataset_lookup": True,
        },
        "input": {
            "age": age,
            "weight": weight,
            "height": height,
            "gender": gender_code,
            "gender_enc": gender_enc,
            "date_of_birth": date_of_birth.isoformat(),
            "date_of_birth_days": date_of_birth_days,
            "date_of_measurement": date_of_measurement.isoformat(),
            "date_of_measurement_days": date_of_measurement_days,
        },
    }


# ============================================================
# WHO reference helpers
# ============================================================
WHO_WEIGHT_MEDIAN = {
    0: 3.3, 1: 4.3, 2: 5.3, 3: 6.0, 4: 6.7, 5: 7.3, 6: 7.9,
    7: 8.4, 8: 8.9, 9: 9.3, 10: 9.6, 11: 9.9, 12: 10.2,
    15: 10.9, 18: 11.5, 21: 12.0, 24: 12.5, 27: 13.0,
    30: 13.5, 33: 13.9, 36: 14.3, 39: 14.7, 42: 15.1,
    45: 15.5, 48: 15.9, 51: 16.3, 54: 16.7, 57: 17.1, 59: 17.4,
}

WHO_HEIGHT_MEDIAN = {
    0: 49.9, 1: 54.7, 2: 58.4, 3: 61.4, 4: 63.9, 5: 65.9, 6: 67.6,
    7: 69.2, 8: 70.6, 9: 72.0, 10: 73.3, 11: 74.5, 12: 75.7,
    15: 79.1, 18: 82.3, 21: 85.1, 24: 87.8, 27: 90.3,
    30: 92.7, 33: 94.9, 36: 96.1, 39: 98.7, 42: 100.6,
    45: 102.5, 48: 104.3, 51: 106.0, 54: 107.7, 57: 109.4, 59: 110.5,
}

WHO_WEIGHT_SD = {
    0: 0.45, 3: 0.75, 6: 0.85, 9: 0.95, 12: 1.0, 18: 1.1,
    24: 1.2, 30: 1.3, 36: 1.4, 42: 1.5, 48: 1.6, 54: 1.7, 59: 1.8,
}

WHO_HEIGHT_SD = {
    0: 1.9, 3: 2.3, 6: 2.5, 9: 2.6, 12: 2.7, 18: 2.9,
    24: 3.1, 30: 3.2, 36: 3.3, 42: 3.4, 48: 3.5, 54: 3.6, 59: 3.7,
}


def interpolate(table: Dict[int, float], age: float) -> float:
    # Interpolasi linear untuk umur yang tidak ada persis di tabel WHO sederhana.
    keys = sorted(table.keys())

    if age <= keys[0]:
        return table[keys[0]]
    if age >= keys[-1]:
        return table[keys[-1]]

    for i in range(len(keys) - 1):
        left = keys[i]
        right = keys[i + 1]
        if left <= age <= right:
            t = (age - left) / (right - left)
            return table[left] + t * (table[right] - table[left])

    return table[keys[0]]


def compute_wa_z(age: float, weight: float) -> str:
    # Hitung z-score Weight-for-Age.
    median = interpolate(WHO_WEIGHT_MEDIAN, age)
    sd = interpolate(WHO_WEIGHT_SD, age)
    z = (weight - median) / sd
    return f"{z:.2f}"


def compute_ha_z(age: float, height: float) -> str:
    # Hitung z-score Height-for-Age.
    median = interpolate(WHO_HEIGHT_MEDIAN, age)
    sd = interpolate(WHO_HEIGHT_SD, age)
    z = (height - median) / sd
    return f"{z:.2f}"


def compute_wh_z(weight: float, height: float) -> str:
    # Hitung z-score Weight-for-Height memakai BMI sebagai pendekatan sederhana.
    height_m = height / 100.0
    bmi = weight / (height_m * height_m)
    z = (bmi - 16.0) / 2.0
    return f"{z:.2f}"


def classify_wa_by_who(z: float) -> Tuple[str, str]:
    # Klasifikasi BB/U berdasarkan batas z-score WHO.
    if z > 2:
        return "Overnutrition", "info"
    if z >= -2:
        return "Normal", "normal"
    if z >= -3:
        return "Underfed", "warning"
    return "Malnutrition", "danger"


def classify_ha_by_who(z: float) -> Tuple[str, str]:
    # Klasifikasi TB/U untuk status stunting.
    if z < -2:
        return "Stunted", "danger"
    return "Not Stunted", "normal"


def classify_wh_by_who(z: float) -> Tuple[str, str]:
    # Klasifikasi BB/TB berdasarkan batas z-score WHO.
    if z > 2:
        return "Obese", "info"
    if z >= -2:
        return "Normal", "normal"
    if z >= -3:
        return "Thin", "warning"
    return "Very Thin", "danger"


def apply_who_mapping(
    indicator: Dict[str, object],
    display_order: List[str],
    classifier,
) -> Dict[str, object]:
    # Timpa label model dengan mapping WHO agar interpretasi konsisten.
    try:
        z = float(indicator["z"])
    except (KeyError, TypeError, ValueError):
        return indicator

    result, cls = classifier(z)
    indicator["result"] = result
    indicator["cls"] = cls
    indicator["labels"] = display_order
    indicator["probs"] = {
        label: 1.0 if label == result else 0.0
        for label in display_order
    }
    return indicator


# ============================================================
# Load models
# ============================================================
TARGET_NAME_BY_KEY = {
    "wa": "Weight for Age",
    "ha": "Height for Age",
    "wh": "Weight for Height",
}


def load_target_model(target_info: Dict[str, object]) -> Dict[str, object]:
    # Muat satu model target beserta metadata fitur dan label mapping.
    model, model_path = load_model_from_path(str(target_info["model_path"]))
    return {
        "model": model,
        "path": model_path,
        "model_name": str(target_info["model_name"]),
        "features": list(target_info["features"]),
        "label_mapping": {int(key): value for key, value in target_info["label_mapping"].items()},
    }


def load_combined_models() -> Dict[str, Dict[str, object]]:
    # Muat model gabungan untuk semua gender.
    return {
        key: load_target_model(BEST_MODELS_INFO[target_name])
        for key, target_name in TARGET_NAME_BY_KEY.items()
    }


def load_gender_models() -> Dict[str, Dict[str, Dict[str, object]]]:
    # Muat model khusus gender jika metadata tersedia.
    loaded: Dict[str, Dict[str, Dict[str, object]]] = {}
    for gender_code, info in BEST_MODELS_INFO_BY_GENDER.items():
        try:
            loaded[gender_code] = {
                key: load_target_model(info[target_name])
                for key, target_name in TARGET_NAME_BY_KEY.items()
            }
        except Exception:
            # Lewati konfigurasi gender yang belum lengkap/invalid.
            continue
    return loaded


COMBINED_MODELS = load_combined_models()
GENDER_MODELS = load_gender_models()
ACTIVE_MODEL_MODE = "gender" if MODEL_MODE == "gender" and GENDER_MODELS else "combined"

MODEL_HA = COMBINED_MODELS["ha"]["model"]
MODEL_HA_PATH = COMBINED_MODELS["ha"]["path"]
MODEL_WA = COMBINED_MODELS["wa"]["model"]
MODEL_WA_PATH = COMBINED_MODELS["wa"]["path"]
MODEL_WH = COMBINED_MODELS["wh"]["model"]
MODEL_WH_PATH = COMBINED_MODELS["wh"]["path"]

FEATURE_COLUMNS_BY_TARGET = {
    key: value["features"] for key, value in COMBINED_MODELS.items()
}

GENDER_ENCODER = ENCODER_INFO["gender_encoder"]


# ============================================================
# Prediction helpers
# ============================================================
def normalize_gender(value: object) -> str:
    # Validasi input gender dan ubah ke kode F/M.
    gender = normalize_gender_key(value)
    if gender in ("F", "M"):
        return gender
    raise ValueError("gender harus bernilai Laki-laki/Perempuan atau M/F.")


def parse_date_of_birth(value: object) -> date:
    # Parsing tanggal dari request frontend.
    raw_value = str(value).strip()
    if not raw_value:
        raise ValueError("date_of_birth wajib diisi.")

    if "T" in raw_value:
        raw_value = raw_value.split("T", 1)[0]

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw_value, fmt).date()
        except ValueError:
            pass

    raise ValueError("date_of_birth harus berformat YYYY-MM-DD atau DD/MM/YYYY.")


def date_to_epoch_days(value: date) -> int:
    # Ubah tanggal menjadi jumlah hari sejak epoch agar bisa menjadi fitur model.
    return (value - date(1970, 1, 1)).days


def build_feature_frame(
    *,
    age: float,
    weight: float,
    height: float,
    gender_enc: int,
    date_of_birth_days: int,
    date_of_measurement_days: int,
    feature_columns: List[str],
) -> pd.DataFrame:
    # Susun DataFrame fitur dengan urutan kolom yang sama seperti saat model dilatih.
    feature_values = {
        "gender_enc": gender_enc,
        "date_of_birth": date_of_birth_days,
        "date_of_measurement": date_of_measurement_days,
        "age_month": age,
        "weight": weight,
        "height": height,
    }

    return pd.DataFrame(
        [
            {column: feature_values[column] for column in feature_columns}
        ],
        columns=feature_columns,
    )


def to_probability_map(
    proba_row: np.ndarray,
    class_ids: np.ndarray,
    class_map: Dict[int, str],
    display_order: List[str],
) -> Dict[str, float]:
    # Ubah output predict_proba model menjadi mapping label -> probabilitas.
    raw_map: Dict[str, float] = {}
    for cls_id, prob in zip(class_ids.tolist(), proba_row.tolist()):
        label = class_map.get(int(cls_id), str(cls_id))
        raw_map[label] = float(prob)

    return {label: raw_map.get(label, 0.0) for label in display_order}


def predict_indicator(
    model,
    features: pd.DataFrame,
    class_map: Dict[int, str],
    display_order: List[str],
    z_value: str,
) -> Dict[str, object]:
    # Jalankan prediksi untuk satu indikator dan bentuk respons standar frontend.
    predicted_class_id = int(model.predict(features)[0])
    predicted_label = class_map.get(predicted_class_id, str(predicted_class_id))

    if hasattr(model, "predict_proba"):
        proba_row = model.predict_proba(features)[0]
        probability_map = to_probability_map(
            proba_row=proba_row,
            class_ids=model.classes_,
            class_map=class_map,
            display_order=display_order,
        )
    else:
        probability_map = {label: 0.0 for label in display_order}
        probability_map[predicted_label] = 1.0

    return {
        "result": predicted_label,
        "cls": STATUS_BY_LABEL.get(predicted_label, "normal"),
        "z": z_value,
        "probs": probability_map,
        "labels": display_order,
    }


def get_overall_status(wa_cls: str, ha_cls: str, wh_cls: str) -> str:
    # Ringkasan overall mengikuti status terburuk dari tiga indikator.
    if "danger" in (wa_cls, ha_cls, wh_cls):
        return "buruk"
    if wa_cls in ("warning", "info") or wh_cls in ("warning", "info"):
        return "perhatian"
    return "normal"


def pick_models_for_gender(gender_code: str) -> Tuple[Dict[str, Dict[str, object]], str]:
    # Pilih model khusus gender jika mode aktif dan model tersedia.
    if ACTIVE_MODEL_MODE == "gender" and gender_code in GENDER_MODELS:
        return GENDER_MODELS[gender_code], "gender"
    return COMBINED_MODELS, "combined"


def health_payload() -> Dict[str, object]:
    # Payload diagnostic untuk endpoint /health.
    gender_paths = {
        gender: {key: str(meta["path"]) for key, meta in target_models.items()}
        for gender, target_models in GENDER_MODELS.items()
    }
    return {
        "status": "ok",
        "message": "GrowSmart backend aktif.",
        "models": {
            "weight_for_age": COMBINED_MODELS["wa"]["model_name"],
            "height_for_age": COMBINED_MODELS["ha"]["model_name"],
            "weight_for_height": COMBINED_MODELS["wh"]["model_name"],
        },
        "paths": {
            "weight_for_age": str(MODEL_WA_PATH),
            "height_for_age": str(MODEL_HA_PATH),
            "weight_for_height": str(MODEL_WH_PATH),
        },
        "model_mode": {
            "configured": MODEL_MODE,
            "active": ACTIVE_MODEL_MODE,
            "gender_models_loaded": sorted(GENDER_MODELS.keys()),
            "gender_paths": gender_paths,
        },
        "features": FEATURE_COLUMNS_BY_TARGET,
        "gender_mapping": {
            str(label): int(value)
            for label, value in zip(
                GENDER_ENCODER.classes_.tolist(),
                GENDER_ENCODER.transform(GENDER_ENCODER.classes_).tolist(),
            )
        },
        "database": {
            "type": "mysql",
            "host": MYSQL_HOST,
            "port": MYSQL_PORT,
            "name": MYSQL_DATABASE,
        },
    }


def predict_payload(data: Dict[str, object]) -> Dict[str, object]:
    # Validasi request prediksi, susun fitur, jalankan model, dan bentuk respons.
    date_field_value = data.get("date_of_birth", data.get("tanggalLahir"))
    measurement_field_value = data.get("date_of_measurement", data.get("tanggalPengukuran"))
    required_fields = ["age", "weight", "height", "gender"]
    missing_fields = [field for field in required_fields if field not in data]
    if date_field_value is None:
        missing_fields.append("date_of_birth")
    if missing_fields:
        raise ValueError(f"Field wajib belum lengkap: {', '.join(missing_fields)}")

    try:
        age = float(data["age"])
        weight = float(data["weight"])
        height = float(data["height"])
    except (TypeError, ValueError):
        raise ValueError("age, weight, dan height harus berupa angka.")

    gender_code = normalize_gender(data["gender"])
    gender_enc = int(GENDER_ENCODER.transform([gender_code])[0])
    date_of_birth = parse_date_of_birth(date_field_value)
    date_of_measurement = parse_date_of_birth(measurement_field_value) if measurement_field_value is not None else date.today()
    date_of_birth_days = date_to_epoch_days(date_of_birth)
    date_of_measurement_days = date_to_epoch_days(date_of_measurement)

    if not (0 <= age <= 59):
        raise ValueError("Usia harus berada pada rentang 0-59 bulan.")
    if date_of_measurement < date_of_birth:
        raise ValueError("date_of_measurement tidak boleh lebih awal dari date_of_birth.")
    if not (1 <= weight <= 50):
        raise ValueError("Berat badan harus berada pada rentang 1-50 kg.")
    if not (30 <= height <= 130):
        raise ValueError("Tinggi badan harus berada pada rentang 30-130 cm.")

    dataset_match = find_dataset_match(
        gender_code=gender_code,
        date_of_birth=date_of_birth,
        date_of_measurement=date_of_measurement,
        age=age,
        weight=weight,
        height=height,
    )
    if dataset_match is not None:
        return dataset_lookup_payload(
            row=dataset_match,
            age=age,
            weight=weight,
            height=height,
            gender_code=gender_code,
            gender_enc=gender_enc,
            date_of_birth=date_of_birth,
            date_of_birth_days=date_of_birth_days,
            date_of_measurement=date_of_measurement,
            date_of_measurement_days=date_of_measurement_days,
        )

    selected_models, active_scope = pick_models_for_gender(gender_code)

    wa_features = build_feature_frame(
        age=age,
        weight=weight,
        height=height,
        gender_enc=gender_enc,
        date_of_birth_days=date_of_birth_days,
        date_of_measurement_days=date_of_measurement_days,
        feature_columns=selected_models["wa"]["features"],
    )
    wa = predict_indicator(
        model=selected_models["wa"]["model"],
        features=wa_features,
        class_map=selected_models["wa"]["label_mapping"],
        display_order=WA_DISPLAY_ORDER,
        z_value=compute_wa_z(age=age, weight=weight),
    )
    wa["model_name"] = selected_models["wa"]["model_name"]
    wa["model_scope"] = active_scope

    ha_features = build_feature_frame(
        age=age,
        weight=weight,
        height=height,
        gender_enc=gender_enc,
        date_of_birth_days=date_of_birth_days,
        date_of_measurement_days=date_of_measurement_days,
        feature_columns=selected_models["ha"]["features"],
    )
    ha = predict_indicator(
        model=selected_models["ha"]["model"],
        features=ha_features,
        class_map=selected_models["ha"]["label_mapping"],
        display_order=HA_DISPLAY_ORDER,
        z_value=compute_ha_z(age=age, height=height),
    )
    ha["model_name"] = selected_models["ha"]["model_name"]
    ha["model_scope"] = active_scope

    wh_features = build_feature_frame(
        age=age,
        weight=weight,
        height=height,
        gender_enc=gender_enc,
        date_of_birth_days=date_of_birth_days,
        date_of_measurement_days=date_of_measurement_days,
        feature_columns=selected_models["wh"]["features"],
    )
    wh = predict_indicator(
        model=selected_models["wh"]["model"],
        features=wh_features,
        class_map=selected_models["wh"]["label_mapping"],
        display_order=WH_DISPLAY_ORDER,
        z_value=compute_wh_z(weight=weight, height=height),
    )
    wh["model_name"] = selected_models["wh"]["model_name"]
    wh["model_scope"] = active_scope

    overall = get_overall_status(wa["cls"], ha["cls"], wh["cls"])
    date_of_birth_used = any(
        "date_of_birth" in selected_models[key]["features"] for key in ("wa", "ha", "wh")
    )

    return {
        "wa": wa,
        "ha": ha,
        "wh": wh,
        "overall": overall,
        "meta": {
            "configured_model_mode": MODEL_MODE,
            "active_model_mode": active_scope,
            "gender_models_available": sorted(GENDER_MODELS.keys()),
            "date_of_birth_used": date_of_birth_used,
        },
        "input": {
            "age": age,
            "weight": weight,
            "height": height,
            "gender": gender_code,
            "gender_enc": gender_enc,
            "date_of_birth": date_of_birth.isoformat(),
            "date_of_birth_days": date_of_birth_days,
            "date_of_measurement": date_of_measurement.isoformat(),
            "date_of_measurement_days": date_of_measurement_days,
        },
    }


class GrowSmartHandler(BaseHTTPRequestHandler):
    # Handler HTTP sederhana tanpa Flask untuk endpoint GrowSmart.
    server_version = "GrowSmartHTTP/1.0"

    def _send_json(self, payload: Dict[str, object], status_code: int = 200) -> None:
        # Helper untuk mengirim response JSON beserta header CORS.
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        # Preflight CORS untuk request dari frontend.
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        # Routing endpoint GET.
        path = urlparse(self.path).path

        if path == "/":
            self._send_json(
                {
                    "message": "GrowSmart backend aktif.",
                    "endpoints": {
                        "health": "/health",
                        "predict": "/predict",
                        "register": "/register",
                        "login": "/login",
                        "history": "/history",
                        "clear_history": "/history/clear",
                    },
                }
            )
            return

        if path == "/health":
            self._send_json(health_payload())
            return

        if path == "/history":
            query = parse_qs(urlparse(self.path).query)
            try:
                user_id = int(query.get("user_id", [""])[0])
                self._send_json(history_payload(user_id))
            except ValueError:
                self._send_json({"error": "Query user_id wajib berupa angka."}, status_code=400)
            except Exception as exc:
                self._send_json({"error": f"Terjadi kesalahan server: {exc}"}, status_code=500)
            return

        self._send_json({"error": "Endpoint tidak ditemukan."}, status_code=404)

    def do_POST(self) -> None:
        # Routing endpoint POST.
        path = urlparse(self.path).path
        if path not in ("/predict", "/register", "/login", "/history", "/history/clear"):
            self._send_json({"error": "Endpoint tidak ditemukan."}, status_code=404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            body = json.loads(raw_body.decode("utf-8") or "{}")

            if path == "/predict":
                payload = predict_payload(body)
            elif path == "/register":
                payload = register_payload(body)
            elif path == "/login":
                payload = login_payload(body)
            elif path == "/history":
                payload = add_history_payload(body)
            else:
                try:
                    user_id = int(body["user_id"])
                except (KeyError, TypeError, ValueError):
                    raise ValueError("user_id wajib dikirim.")
                payload = clear_history_payload(user_id)

            self._send_json(payload, status_code=200)
        except json.JSONDecodeError:
            self._send_json({"error": "Body request harus JSON yang valid."}, status_code=400)
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status_code=400)
        except Exception as exc:
            self._send_json({"error": f"Terjadi kesalahan server: {exc}"}, status_code=500)

    def log_message(self, format: str, *args) -> None:
        # Matikan log default HTTP server agar console tidak terlalu ramai.
        return


if __name__ == "__main__":
    # Jalankan backend langsung dari terminal.
    try:
        print("Model berhasil dimuat dari:")
        print(f"- HA: {MODEL_HA_PATH}")
        print(f"- WA: {MODEL_WA_PATH}")
        print(f"- WH: {MODEL_WH_PATH}")
        print(f"Mode model aktif: {ACTIVE_MODEL_MODE} (configured: {MODEL_MODE})")
        if GENDER_MODELS:
            print(f"Model gender tersedia untuk: {', '.join(sorted(GENDER_MODELS.keys()))}")
        init_mysql()
        print(f"MySQL siap: {MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}")

        server = HTTPServer((HOST, PORT), GrowSmartHandler)
        print(f"GrowSmart backend berjalan di http://{HOST}:{PORT}")
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    except Exception as exc:
        print(f"Gagal menjalankan server: {exc}")
