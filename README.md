Risk AI: Intelligent Industrial Safety Monitor 🧠⚠️Risk AI is a real-time IoT and AI-powered dashboard designed to predict industrial hazards before they happen. It monitors environmental conditions (Temperature, Humidity, CO2, Acetone) and uses a predictive algorithm to detect gas leaks and critical trends in real-time.(Replace this link later with a screenshot of your actual dashboard)🚀 FeaturesReal-time Monitoring: Live updates every 2 seconds from ESP32 sensors.AI Risk Prediction: Algorithms analyze the rate of change (slope) to predict leaks before hazardous levels are reached.Critical Alerts: "Zooming" Red Alert overlay when danger is detected.Historical Analytics: Aggregates data by "Hour of Day" to show long-term safety trends (e.g., "Is 2 PM always dangerous?").Dark Mode Dashboard: Professional React-based UI with Recharts visualization.🛠️ Hardware RequirementsMicrocontroller: ESP32 (NodeMCU / Wemos)Sensors: * DHT11 (Temperature & Humidity)MQ-135 (Air Quality / Gas)Wiring:DHT11 Data → Pin D4MQ-135 Analog → Pin D34💻 Installation & UsageYou can run this project in two ways: Docker (Recommended) or Manual Setup.Option 1: Docker (Fastest for Windows & Linux)This method requires no installation of Python or Node.js. It runs the entire system in an isolated container.Install Docker:Windows: Install Docker Desktop.Linux: sudo apt install docker.io docker-compose-v2Clone the Repository:git clone git@github.com:mohammedmokhtar2/RiskAI-IoT-System.git
cd RiskAI-IoT-System
Run the App:docker compose up --build
Access:Frontend: Open http://localhost:5173Backend: Running on http://localhost:5000Option 2: Manual Setup (For Development)If you want to edit the code, run it manually.PrerequisitesPython 3.9+Node.js 20+1. Setup Backend (Python)# Open a terminal in the root folder
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
python app.py
2. Setup Frontend (React)# Open a NEW terminal
cd frontend
npm install
npm run dev
📡 Connecting the HardwarePower on the ESP32.It will create a WiFi Hotspot named RiskAI_Hotspot.Connect your laptop WiFi to this hotspot.Password: 12345678Once connected, the Python Backend will automatically start fetching live sensor data.(Note: If testing without hardware, open app.py and set MOCK_MODE = True to simulate sensor data.)📂 Project StructureRiskAI/
├── app.py                 # Flask Backend (API & Database Logic)
├── risk_ai.db             # SQLite Database (Auto-created)
├── requirements.txt       # Python Dependencies
├── docker-compose.yml     # Docker Orchestration
├── frontend/              # React Frontend
│   ├── src/
│   │   ├── App.jsx        # Main Dashboard Logic & Charts
│   │   └── App.css        # Dark Mode Styling
│   └── Dockerfile         # Frontend Container Config
└── README.md              # Documentation
👥 TeamHardware Engineer: [Your Name / Teammate Name]Software Engineer: Mohammed MokhtarBuilt with React, Flask, Recharts, and ESP32.