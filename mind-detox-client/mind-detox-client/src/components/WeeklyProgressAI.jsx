import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Target, Calendar, Award, 
  CheckCircle2, Circle, AlertCircle, 
  Brain, Heart, Activity, Wind, Shield
} from 'lucide-react';

const WeeklyProgressAI = () => {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeeklyProgress();
  }, []);

  const fetchWeeklyProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('http://localhost:8080/api/user/weekly-progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.ok) {
        setWeeklyData(data);
      } else {
        setError(data.error || 'Failed to load weekly progress');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Weekly progress fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getDifficultyBadge = (difficulty) => {
    const colors = {
      'easy': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'hard': 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  const getOrganIcon = (organ) => {
    const icons = {
      'Brain': <Brain size={16} />,
      'Heart': <Heart size={16} />,
      'Lungs': <Wind size={16} />,
      'Liver': <Shield size={16} />,
      'Stomach': <Activity size={16} />
    };
    return icons[organ] || <Activity size={16} />;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-container">
          <div className="dot-pulse"></div>
          <p>AI is analyzing your weekly progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!weeklyData) {
    return (
      <div className="card">
        <p>No weekly progress data available.</p>
      </div>
    );
  }

  const { weekly_goals, habit_analysis, overall_progress_score, motivational_quote, recommendations } = weeklyData;

  return (
    <div className="weekly-progress-ai">
      {/* Header with Progress Score */}
      <section className="card weekly-progress-header">
        <div className="progress-header-content">
          <div className="progress-score-circle">
            <div className="score-value">{Math.round(overall_progress_score)}%</div>
            <div className="score-label">Overall Progress</div>
          </div>
          <div className="progress-motivation">
            <h3 className="card-title-text">
              <TrendingUp size={20} color="var(--green)" />
              AI Weekly Progress Analysis
            </h3>
            <p className="motivational-quote">"{motivational_quote}"</p>
          </div>
        </div>
      </section>

      {/* Weekly Goals */}
      <section className="card weekly-goals-section">
        <h3 className="card-title-text">
          <Target size={18} color="var(--lavender)" />
          AI-Generated Weekly Goals
        </h3>
        <div className="goals-grid">
          {weekly_goals?.map((goal, index) => (
            <div key={index} className="goal-item" style={{ borderLeft: `4px solid ${getPriorityColor(goal.priority)}` }}>
              <div className="goal-header">
                <div className="goal-title">{goal.title}</div>
                <div className="goal-meta">
                  <span className={`difficulty-badge ${getDifficultyBadge(goal.estimated_difficulty)}`}>
                    {goal.estimated_difficulty}
                  </span>
                  <span className="priority-indicator" style={{ color: getPriorityColor(goal.priority) }}>
                    {goal.priority} priority
                  </span>
                </div>
              </div>
              <div className="goal-description">{goal.description}</div>
              <div className="goal-metrics">
                <div className="metric-item">
                  <span className="metric-label">Current:</span>
                  <span className="metric-value">{goal.current_value?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Target:</span>
                  <span className="metric-value target">{goal.target_value?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Health Impact:</span>
                  <span className="metric-value">{Math.round(goal.health_impact || 0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Habit Analysis */}
      <section className="card habit-analysis-section">
        <h3 className="card-title-text">
          <Brain size={18} color="var(--lavender)" />
          Habit Pattern Analysis
        </h3>
        <div className="habits-grid">
          {Object.entries(habit_analysis || {}).map(([habit, analysis]) => (
            <div key={habit} className="habit-analysis-item">
              <div className="habit-header">
                <h4 className="habit-name">{habit.replace('_', ' ').toUpperCase()}</h4>
                <div className="habit-severity">
                  <span className={`severity-badge severity-${analysis.risk_level}`}>
                    {analysis.risk_level}
                  </span>
                  <span className="trend-indicator trend-${analysis.trend}">
                    {analysis.trend === 'increasing' ? '↑' : analysis.trend === 'decreasing' ? '↓' : '→'} {analysis.trend}
                  </span>
                </div>
              </div>
              <div className="habit-details">
                <div className="habit-triggers">
                  <span className="detail-label">Primary Triggers:</span>
                  <div className="trigger-tags">
                    {analysis.primary_triggers?.map((trigger, i) => (
                      <span key={i} className="trigger-tag">{trigger}</span>
                    ))}
                  </div>
                </div>
                <div className="habit-recommendation">
                  <span className="detail-label">AI Recommendation:</span>
                  <p className="recommendation-text">{analysis.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Recommendations */}
      {recommendations?.length > 0 && (
        <section className="card recommendations-section">
          <h3 className="card-title-text">
            <Award size={18} color="var(--green)" />
            AI Recommendations
          </h3>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <CheckCircle2 size={16} color="var(--green)" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Success Prediction */}
      {weeklyData.predicted_weekly_success && (
        <section className="card success-prediction-section">
          <h3 className="card-title-text">
            <Calendar size={18} color="var(--lavender)" />
            Success Prediction
          </h3>
          <div className="success-meter">
            <div className="success-bar">
              <div 
                className="success-fill" 
                style={{ width: `${weeklyData.predicted_weekly_success}%` }}
              ></div>
            </div>
            <div className="success-text">
              <span className="success-percentage">{Math.round(weeklyData.predicted_weekly_success)}%</span>
              <span className="success-label">probability of achieving weekly goals</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default WeeklyProgressAI;
