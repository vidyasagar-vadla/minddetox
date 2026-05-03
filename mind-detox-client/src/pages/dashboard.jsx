import React, { useState, useEffect } from 'react';
import {
  Heart, Activity, Wind, Database, Shield,
  TrendingUp, Quote as QuoteIcon,
  CheckCircle2, Circle, Flame, Target,
  Brain
} from 'lucide-react';
import '../styles/Dashboard.css';
import '../styles/AIComponents.css';
import organImg from './organ-health.jpg';

const RecoveryDashboard = () => {
  const [organHealths, setOrganHealths] = useState({
    Brain: 0, Heart: 0, Lungs: 0, Stomach: 0, Liver: 0
  });
  const [loading, setLoading] = useState(true);
  const [aiData, setAiData] = useState({
    weeklyProgress: null,
    habitControl: null
  });

  const [activeAddictions, setActiveAddictions] = useState([
    { name: 'Social Media', level: 'Stable', pct: 65, color: 'var(--lavender)' },
    { name: 'Fast Food', level: 'At Risk', pct: 40, color: '#f59e0b' },
    { name: 'Gaming', level: 'Strong', pct: 85, color: 'var(--green)' }
  ]);

  const [streak, setStreak] = useState(18);
  const [weeklyRecord, setWeeklyRecord] = useState([
    { day: 'M', checked: true }, { day: 'T', checked: true },
    { day: 'W', checked: true }, { day: 'T', checked: true },
    { day: 'F', checked: false }, { day: 'S', checked: false }, { day: 'S', checked: false },
  ]);

  useEffect(() => {
    // 1) show cached stats instantly (from login)
    try {
      const cached = localStorage.getItem("healthStats");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setOrganHealths(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // 2) then refresh from backend (source of truth)
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const response = await fetch("http://localhost:8080/api/user/health-stats", {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data && !data.error) {
          setOrganHealths(data);
          localStorage.setItem("healthStats", JSON.stringify(data));
        } else {
          console.error("Dashboard API error:", data);
        }
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    // 3) fetch AI data for habit control only
    const fetchAIData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch habit control AI data only
        const habitResponse = await fetch('http://localhost:8080/api/user/habit-control', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const habitData = await habitResponse.json();

        if (habitData.ok && habitData.addictions) {
          setAiData(prev => ({ ...prev, habitControl: habitData }));
          
          // Update active addictions based on new simple AI data
          const updatedAddictions = Object.entries(habitData.addictions).map(([name, analysis]) => ({
            name: name.replace('_', ' ').split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            level: analysis.level || 'Unknown',
            color: analysis.level === 'HIGH' ? '#ef4444' : 
                   analysis.level === 'MODERATE' ? '#f59e0b' : 
                   analysis.level === 'LOW' ? '#f59e0b' : '#10b981'
          }));
          setActiveAddictions(updatedAddictions);
        }
      } catch (err) {
        console.error("AI Data Fetch Error:", err);
      }
    };

    // 4) Load weekly progress from localStorage
    const loadWeeklyProgress = () => {
      const saved = localStorage.getItem('weeklyProgress');
      if (saved) {
        const data = JSON.parse(saved);
        setWeeklyRecord(data.record || []);
        setStreak(data.streak || 0);
      }
    };

    fetchStats();
    fetchAIData();
    loadWeeklyProgress();
  }, []);

  // Manual check-in function
  const handleDayCheckIn = (dayIndex) => {
    const updatedRecord = [...weeklyRecord];
    updatedRecord[dayIndex].checked = !updatedRecord[dayIndex].checked;
    setWeeklyRecord(updatedRecord);
    
    // Save to localStorage
    localStorage.setItem('weeklyProgress', JSON.stringify({
      record: updatedRecord,
      streak: calculateStreak(updatedRecord)
    }));
    
    // Update streak
    setStreak(calculateStreak(updatedRecord));
  };

  const calculateStreak = (record) => {
    let streak = 0;
    for (let i = record.length - 1; i >= 0; i--) {
      if (record[i].checked) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const addictionLevel = (100 - (Object.values(organHealths).reduce((a, b) => a + b, 0) / 5)).toFixed(0);
  const savingsPerDay = 15;

  const icons = {
    Brain: <Activity size={18} color="var(--lavender)" />,
    Heart: <Heart size={18} color="#ef4444" />,
    Lungs: <Wind size={18} color="#0ea5e9" />,
    Stomach: <Database size={18} color="#f59e0b" />,
    Liver: <Shield size={18} color="var(--green)" />
  };

  if (loading) {
    return (
      <div className="shell-full">
        <div className="loading-container">
          <div className="dot-pulse"></div>
          <p>AI is analyzing your biological markers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell-full">
      <div className="container-full">

        <header className="dash-header">
          <div className="badge-status">
            <span className="dot-pulse"></span>
            DETOX ENGINE ACTIVE
          </div>
          <div className="streak-pill">
            <Flame size={16} color="#ef4444" />
            <span><b>{streak}</b> DAY STREAK</span>
          </div>
        </header>

        <div className="dash-main-grid">

          <section className="card">
            <div className="hero-organ-frame">
              <img src={organImg} alt="Human Organ System" className="hero-img-contain" />
            </div>

            <div className="card-body">
              <h3 className="card-title-text"><Activity size={20} color="var(--green)" /> Vitality Report</h3>
              <div className="organ-list-rows">
                {Object.entries(organHealths).map(([name, val]) => (
                  <div key={name} className="organ-row-item">
                    <div className="row-info">
                      <span className="row-name">{icons[name]} {name}</span>
                      <span className="row-val">{val}%</span>
                    </div>
                    <div className="progress-container">
                      <div className="progress-fill" style={{
                        width: `${val}%`,
                        background: val > 65 ? 'var(--green)' : 'var(--lavender)'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="intensity-box-centered">
                <small className="label-tiny">ADDICTION INTENSITY</small>
                <div className="intensity-number" style={{ color: addictionLevel > 50 ? 'var(--lavender)' : 'var(--green)' }}>
                  {addictionLevel}%
                </div>
                <p className="intensity-footer">Average deficit across all biological markers</p>
              </div>
            </div>
          </section>

          <div className="sidebar-stack">

            <section className="quote-card-styled">
              <QuoteIcon className="quote-watermark" size={40} />
              <small className="label-tiny-white">AI DAILY QUOTE</small>
              <p className="quote-txt">
                {aiData.habitControl?.success_prediction?.factors?.[0] || 
                 "Recovery is not about being perfect. It's about being better than you were yesterday."}
              </p>
            </section>

            <section className="card savings-card-aligned">
              <TrendingUp size={32} color="var(--green)" />
              <div className="savings-group">
                <h4 className="title-small">Financial Savings</h4>
                <div className="savings-cash">${streak * savingsPerDay}</div>
                <p className="savings-desc">Capital recovered to date</p>
              </div>
            </section>

            <section className="card weekly-tracker-card">
              <h4 className="card-title-text">
                <CheckCircle2 size={18} color="var(--lavender)" /> 
                Weekly Progress 
              </h4>
              <div className="week-grid-row">
                {weeklyRecord.map((item, i) => (
                  <div key={i} className="day-circle-box">
                    <span className="day-name-tiny">{item.day}</span>
                    <button 
                      onClick={() => handleDayCheckIn(i)}
                      className="day-check-button"
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {item.checked ?
                        <CheckCircle2 size={24} color="var(--green)" fill="var(--green-soft)" /> :
                        <Circle size={24} color="#e2e8f0" />
                      }
                    </button>
                  </div>
                ))}
              </div>
              <div className="manual-check-info">
                <small>Click on days to manually check in</small>
              </div>
            </section>

            <section className="card habit-control-card">
              <h4 className="card-title-text">
                <Target size={18} color="var(--lavender)" /> 
                Habit Control 
                {aiData.habitControl && (
                  <span className="ai-indicator">AI</span>
                )}
              </h4>
              {aiData.habitControl && aiData.habitControl.addictions ? (
                <div className="habit-badge-grid">
                  {Object.entries(aiData.habitControl.addictions).map(([name, analysis]) => (
                    <div key={name} className="habit-badge-item-simple">
                      <div className="habit-info-simple">
                        <span className="habit-name-simple">
                          {name.replace('_', ' ').split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                        <span className="habit-level-badge" style={{
                          background: analysis.level === 'HIGH' ? '#ef4444' : 
                                     analysis.level === 'MODERATE' ? '#f59e0b' : 
                                     analysis.level === 'LOW' ? '#f59e0b' : '#10b981',
                          color: 'white'
                        }}>
                          {analysis.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-addictions-message">
                  <p>No significant addictions detected based on your health scores.</p>
                </div>
              )}
            </section>

          </div>
        </div>

        <section className="card measures-grid-container">
          <h3 className="card-title-text"><Shield size={20} color="var(--lavender)" /> AI Recommended Measures</h3>
          <div className="measures-grid-3">
            {aiData.habitControl?.recommended_next_steps?.slice(0, 3).map((step, index) => (
              <div key={index} className="measure-item-box">
                <h5 className="measure-h">Step {index + 1}</h5>
                <p>{step}</p>
              </div>
            )) || (
              <>
                <div className="measure-item-box">
                  <h5 className="measure-h">Liver Health</h5>
                  <p>Current health {organHealths.Liver}%. AI suggests a 24-hour antioxidant flush with leafy greens.</p>
                </div>
                <div className="measure-item-box">
                  <h5 className="measure-h">Brain Recovery</h5>
                  <p>Current health {organHealths.Brain}%. High activity detected. Practice 10 mins of silence to reduce neural inflammation.</p>
                </div>
                <div className="measure-item-box">
                  <h5 className="measure-h">Behavioral AI</h5>
                  <p>Intensity is {addictionLevel}%. Avoid social triggers tonight between 6 PM - 9 PM.</p>
                </div>
              </>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default RecoveryDashboard;
