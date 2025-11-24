import sqlite3
import requests
import time
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allows React to talk to this server

# --- CONFIGURATION ---
ESP_URL = "http://192.168.10.1/data"  # Engineer A's IP
DB_NAME = "risk_ai.db"
MOCK_MODE = False  # Set to True if testing without hardware

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Stores raw readings with a timestamp
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL,
            humidity REAL,
            co2 REAL,
            aceton REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# --- ROUTES ---

@app.route('/api/fetch-sensor', methods=['GET'])
def get_sensor_data():
    """Fetches live data, saves it, and returns it for the Live Monitor"""
    data = {}
    try:
        # 1. Get Data
        if MOCK_MODE:
            import random
            data = {
                "temperature": round(random.uniform(20, 30), 1), 
                "humidity": round(random.uniform(40, 60), 1),
                "co2": random.randint(400, 900), 
                "aceton": round(random.uniform(0, 5), 2)
            }
        else:
            response = requests.get(ESP_URL, timeout=2)
            data = response.json()
        
        # 2. Save to Database
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO records (temperature, humidity, co2, aceton)
            VALUES (?, ?, ?, ?)
        ''', (data.get('temperature', 0), data.get('humidity', 0), 
              data.get('co2', 0), data.get('aceton', 0)))
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Sensor Disconnected"}), 500

    return jsonify(data)

@app.route('/api/history/hourly', methods=['GET'])
def get_hourly_averages():
    """
    THE ANALYTICS ENGINE:
    Groups data by 'Hour of Day' (00-23).
    Averages ALL data for that hour across ALL days.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # SQL: Extract hour from timestamp (00-23) and Group By it
    cursor.execute('''
        SELECT 
            strftime('%H', timestamp) as hour,
            AVG(temperature) as avg_temp,
            AVG(humidity) as avg_humidity,
            AVG(co2) as avg_co2,
            AVG(aceton) as avg_aceton
        FROM records 
        GROUP BY hour 
        ORDER BY hour ASC
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    # Process: Create a clean list of 00 to 23, filling gaps with 0
    data_map = {row['hour']: dict(row) for row in rows}
    final_data = []
    
    for i in range(24):
        hour_str = f"{i:02}" # "00", "01", ... "23"
        display_label = f"{i}:00" # "1:00", "13:00"
        
        if hour_str in data_map:
            row = data_map[hour_str]
            final_data.append({
                "hour": display_label, 
                "avg_temp": round(row['avg_temp'], 1),
                "avg_humidity": round(row['avg_humidity'], 1),
                "avg_co2": round(row['avg_co2'], 1),
                "avg_aceton": round(row['avg_aceton'], 2)
            })
        else:
            # No data for this hour yet
            final_data.append({
                "hour": display_label, "avg_temp": 0, "avg_humidity": 0, "avg_co2": 0, "avg_aceton": 0
            })
            
    return jsonify(final_data)

if __name__ == '__main__':
    init_db()
    print("RiskAI Backend Running...")
    app.run(debug=True, port=5000)