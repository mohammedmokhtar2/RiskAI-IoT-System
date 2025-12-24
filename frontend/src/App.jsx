import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { AlertTriangle, Activity, History, Monitor, Clock, BrainCircuit, X } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('live'); 
  const [data, setData] = useState({ temperature: 0, humidity: 0, co2: 0, aceton: 0 });
  const [liveHistory, setLiveHistory] = useState([]); 
  const [hourlyData, setHourlyData] = useState([]);
  const [overallStats, setOverallStats] = useState({}); 
  
  // --- ALARM STATES ---
  const [isCritical, setIsCritical] = useState(false);        
  const [showPreWarning, setShowPreWarning] = useState(false); 
  const [geminiAdvice, setGeminiAdvice] = useState("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // --- 1. GEMINI API HANDLER (For PREDICTIONS only) ---
  const askGemini = async (currentData, warningContext) => {
    if (loadingAdvice) return; 
    setLoadingAdvice(true);

    const prompt = `
      Act as an Industrial Safety AI. 
      Context: ${warningContext}
      Readings: Temp ${currentData.temperature}, Acetone ${currentData.aceton}, CO2 ${currentData.co2}.
      Output ONE specific technical recommendation. Max 20 words.
    `;

    try {
      const apiKey = "xxxxxxxxxxx"; 
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); 

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const resData = await response.json();
      if(resData.candidates && resData.candidates.length > 0) {
         setGeminiAdvice(resData.candidates[0].content.parts[0].text);
         setShowPreWarning(true);
      }

    } catch (error) {
      // Fallback for trends
      setGeminiAdvice(`⚠️ PREDICTION: ${warningContext} Risk detected. Check sensors.`);
      setShowPreWarning(true);
    }
    setLoadingAdvice(false);
  };

  // --- 2. TREND ANALYZER (HYBRID MODE) ---
  const analyzeTrend = (historyData, currentReading) => {
    
    // --- A. CRITICAL HAZARD (INSTANT TRIGGER - NO API) ---
    if (currentReading.aceton > 100 || currentReading.temperature > 30) {
        setIsCritical(true);
        
        // FORCE SHOW POPUP IMMEDIATELY
        // We do not call API here because we need it to be instant
        if (!showPreWarning) {
            let context = "";
            if (currentReading.aceton > 100) context = "Critical Chemical Leak.";
            if (currentReading.temperature > 30) context = "Thermal Criticality.";

            setGeminiAdvice(`⚠️ URGENT: ${context} System actuators engaged. EVACUATE AREA IMMEDIATELY.`);
            setShowPreWarning(true);
        }
        return; 
    } else {
        setIsCritical(false);
    }

    // --- B. TREND PREDICTION (REAL API) ---
    if (historyData.length >= 2) {
        const oldIndex = Math.max(0, historyData.length - 3);
        const old = historyData[oldIndex]; 

        const dTemp = currentReading.temperature - old.temperature; 
        const dAcetone = currentReading.aceton - old.aceton;        
        const dCO2 = currentReading.co2 - old.co2;                  

        let warningContext = "";
        let needsAI = false;

        if (dTemp >= 1.0) { warningContext += "Temp Spike. "; needsAI = true; }
        if (dAcetone >= 5.0) { warningContext += "Acetone Surge. "; needsAI = true; }
        if (dCO2 >= 50) { warningContext += "CO2 Rising. "; needsAI = true; }

        if (needsAI && !showPreWarning && !loadingAdvice) {
            askGemini(currentReading, warningContext);
        }
    }
  };

  // --- 3. DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/fetch-sensor');
        const jsonData = await response.json();
        setData(jsonData);

        setLiveHistory(prev => {
          const newHistory = [...prev, { time: new Date().toLocaleTimeString(), ...jsonData }];
          const trimmedHistory = newHistory.slice(-20); 
          analyzeTrend(trimmedHistory, jsonData); 
          return trimmedHistory;
        });
      } catch (error) { console.error("Connection Error:", error); }
    };
    
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [showPreWarning, loadingAdvice]);

  // --- 4. HISTORY LOGIC ---
  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHourly = async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/history/hourly');
          const jsonHourly = await response.json();
          setHourlyData(jsonHourly);

          const activeData = jsonHourly.filter(h => h.avg_co2 > 0);
          const count = activeData.length || 1;
          const totalCo2 = activeData.reduce((acc, curr) => acc + curr.avg_co2, 0);
          const totalAceton = activeData.reduce((acc, curr) => acc + curr.avg_aceton, 0);
          
          setOverallStats({
            avgCo2: Math.round(totalCo2 / count),
            avgAceton: Math.round(totalAceton / count * 100) / 100
          });
        } catch (error) { console.error("History Error:", error); }
      };
      fetchHourly();
    }
  }, [activeTab]);

  return (
    <div className={`dashboard-container ${isCritical ? 'critical-bg' : ''}`}>
      
      {/* 1. CRITICAL WARNING OVERLAY */}
      {isCritical && activeTab === 'live' && (
        <div className="critical-overlay">
          <AlertTriangle size={80} className="zoom-icon" />
          <h1 className="zoom-text">CRITICAL HAZARD</h1>
          <p>Actuators Engaged. Evacuate Area.</p>
        </div>
      )}

      {/* 2. AI POPUP (Guaranteed to show on top) */}
      {showPreWarning && (
        <div className="ai-popup">
            <div className="popup-header">
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <BrainCircuit size={20} color="#4cc9f0"/>
                    <span>AI Predictive Analysis</span>
                </div>
                <button onClick={() => setShowPreWarning(false)}><X size={16}/></button>
            </div>
            <div className="popup-body">
                {loadingAdvice ? "Consulting AI..." : geminiAdvice}
            </div>
        </div>
      )}

      {/* HEADER */}
      <header>
        <div className="header-content">
            <h1>Risk AI Dashboard 🧠</h1>
            <div className="status-badge">
                <Activity size={18} /> System Online
            </div>
        </div>
        
        <div className="tab-container">
            <button className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
                <Monitor size={20} /> Live Monitor
            </button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                <History size={20} /> Daily Analysis
            </button>
        </div>
      </header>

      {/* LIVE VIEW */}
      {activeTab === 'live' && (
        <div className="live-view fade-in">
            <div className="cards-grid">
                <div className="card temp"><h3>Temperature</h3><div className="value">{data.temperature}°C</div></div>
                <div className="card humidity"><h3>Humidity</h3><div className="value">{data.humidity}%</div></div>
                <div className={`card co2 ${data.co2 > 800 ? 'danger-border' : ''}`}>
                    <h3>CO2</h3><div className="value">{data.co2} <span className="unit">ppm</span></div>
                </div>
                <div className="card acetone"><h3>Acetone</h3><div className="value">{data.aceton} <span className="unit">ppm</span></div></div>
            </div>

            {/* CHART 1: GAS */}
            <div className="chart-section" style={{marginBottom: '20px'}}>
                <div className="chart-header">
                    <h3>🧪 Gas Levels (CO2 & Acetone)</h3>
                </div>
                <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <LineChart data={liveHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="co2" stroke="#4cc9f0" strokeWidth={3} dot={false} name="CO2 (ppm)" />
                    <Line type="monotone" dataKey="aceton" stroke="#f72585" strokeWidth={3} dot={false} name="Acetone (ppm)" />
                    </LineChart>
                </ResponsiveContainer>
                </div>
            </div>

             {/* CHART 2: ENV */}
            <div className="chart-section">
                <div className="chart-header">
                    <h3>🌡️ Environment (Temp & Humidity)</h3>
                </div>
                <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <LineChart data={liveHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="temperature" stroke="#fb8500" strokeWidth={3} dot={false} name="Temp (°C)" />
                    <Line type="monotone" dataKey="humidity" stroke="#8ecae6" strokeWidth={3} dot={false} name="Humidity (%)" />
                    </LineChart>
                </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="history-view fade-in">
            <div className="cards-grid" style={{marginBottom: '40px'}}>
                <div className="card"><h3>Data Points</h3><div className="value">24h</div></div>
                <div className="card co2"><h3>Avg. CO2</h3><div className="value">{overallStats.avgCo2 || 0}</div></div>
                <div className="card acetone"><h3>Avg. Acetone</h3><div className="value">{overallStats.avgAceton || 0}</div></div>
            </div>
            <div className="chart-box">
                <h3>Average Gas Levels</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="hour" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" />
                            <Tooltip contentStyle={{ backgroundColor: '#222' }} />
                            <Legend />
                            <Bar dataKey="avg_co2" fill="#4cc9f0" name="Avg CO2" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="avg_aceton" fill="#f72585" name="Avg Acetone" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}

export default App;