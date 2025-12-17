import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { AlertTriangle, TrendingUp, Activity, History, Monitor, Clock } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('live'); 
  const [data, setData] = useState({ temperature: 0, humidity: 0, co2: 0, aceton: 0 });
  const [liveHistory, setLiveHistory] = useState([]); // Stores last 20 seconds for Live Chart
  const [hourlyData, setHourlyData] = useState([]);   // Stores 24h averages
  const [overallStats, setOverallStats] = useState({}); 
  const [prediction, setPrediction] = useState("Stable"); 
  const [isCritical, setIsCritical] = useState(false);

  // --- 1. LIVE PREDICTION ENGINE ---
  const analyzeTrend = (historyData) => {
    if (historyData.length < 5) return;
    const recent = historyData.slice(-5);
    const end = recent[recent.length - 1].co2;
    const slope = end - recent[0].co2;

    if (end > 1000 || recent[recent.length - 1].aceton > 100 || recent[recent.length - 1].temperature > 30 ) { // zwdt el temp
        setPrediction("CRITICAL HAZARD PRESENT");
        setIsCritical(true);
    } else if (slope > 50) { // 3dl el slop for temp bs atakd mn el calculations
        setPrediction("⚠️ WARNING: Levels Rising Rapidly! Leak Predicted.");
        setIsCritical(true);
    } else {
        setPrediction("Environment Stable.");
        setIsCritical(false);
    }
  };

  // --- 2. LIVE DATA FETCHING ---
  // We keep fetching even in background so history doesn't break
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/fetch-sensor');
        const jsonData = await response.json();
        setData(jsonData);

        setLiveHistory(prev => {
          const newHistory = [...prev, { time: new Date().toLocaleTimeString(), ...jsonData }];
          // Keep only last 20 points for the live chart
          const trimmedHistory = newHistory.slice(-20); 
          analyzeTrend(trimmedHistory); 
          return trimmedHistory;
        });
      } catch (error) { console.error("Connection Error:", error); }
    };
    
    // Fetch every 2 seconds
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- 3. HISTORICAL DATA FETCHING ---
  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHourly = async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/history/hourly');
          const jsonHourly = await response.json();
          setHourlyData(jsonHourly);

          // Calculate Overall Stats for Summary Cards
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
      
      {/* ZOOMING WARNING OVERLAY */}
      {isCritical && activeTab === 'live' && (
        <div className="critical-overlay">
          <AlertTriangle size={80} className="zoom-icon" />
          <h1 className="zoom-text">WARNING</h1>
          <p>{prediction}</p>
        </div>
      )}

      {/* HEADER & TAB NAVIGATION */}
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

      {/* ================= VIEW 1: LIVE MONITOR ================= */}
      {activeTab === 'live' && (
        <div className="live-view fade-in">
            {/* LIVE CARDS */}
            <div className="cards-grid">
                <div className="card temp"><h3>Temperature</h3><div className="value">{data.temperature}°C</div></div>
                <div className="card humidity"><h3>Humidity</h3><div className="value">{data.humidity}%</div></div>
                <div className={`card co2 ${data.co2 > 800 ? 'danger-border' : ''}`}>
                    <h3>Carbon Dioxide</h3><div className="value">{data.co2} <span className="unit">ppm</span></div>
                    {data.co2 > 800 && <small className="blink">High Levels!</small>}
                </div>
                <div className="card acetone"><h3>Acetone</h3><div className="value">{data.aceton} <span className="unit">ppm</span></div></div>
            </div>

            {/* LIVE LINE CHART */}
            <div className="chart-section">
                <div className="chart-header">
                    <h3><TrendingUp size={20}/> Real-Time Feed (Last 40s)</h3>
                    <p>AI Prediction: <strong>{prediction}</strong></p>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={liveHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                    <Line type="monotone" dataKey="co2" stroke="#4cc9f0" strokeWidth={3} dot={false} name="CO2" />
                    <Line type="monotone" dataKey="aceton" stroke="#f72585" strokeWidth={3} dot={false} name="Acetone" />
                    </LineChart>
                </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* ================= VIEW 2: HISTORICAL ANALYSIS ================= */}
      {activeTab === 'history' && (
        <div className="history-view fade-in">
            <h2 className="section-title" style={{textAlign: 'center'}}>📊 Average Trends by Hour</h2>
            <p className="subtitle" style={{textAlign: 'center'}}>Aggregates all data points to find dangerous times of day.</p>

            {/* SUMMARY CARDS (CENTERED) */}
            <div className="cards-grid" style={{marginBottom: '40px'}}>
                <div className="card">
                    <h3><Clock size={16}/> Data Points</h3>
                    <div className="value">24h</div>
                    <div className="status">Hourly Aggregation</div>
                </div>
                <div className="card co2">
                    <h3>Avg. CO2 (All Time)</h3>
                    <div className="value">{overallStats.avgCo2 || 0} <span className="unit">ppm</span></div>
                </div>
                <div className="card acetone">
                    <h3>Avg. Acetone (All Time)</h3>
                    <div className="value">{overallStats.avgAceton || 0} <span className="unit">ppm</span></div>
                </div>
            </div>
            
            {/* 24-HOUR BAR CHART */}
            <div className="chart-box">
                <h3>Average Gas Levels (00:00 - 23:00)</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="hour" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" />
                            <Tooltip contentStyle={{ backgroundColor: '#222' }} cursor={{fill: '#333'}} />
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