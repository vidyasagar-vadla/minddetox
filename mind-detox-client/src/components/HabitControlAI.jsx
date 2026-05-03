import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Shield, Target, Clock, Users, 
  CheckCircle2, TrendingUp, Brain, Heart, Activity,
  Wind, Database, Calendar, Award, Zap
} from 'lucide-react';

const HabitControlAI = () => {
  const [habitData, setHabitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');

  useEffect(() => {
    fetchHabitControl();
  }, []);

  const fetchHabitControl = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('http://localhost:8080/api/user/habit-control', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.ok) {
        setHabitData(data);
      } else {
        setError(data.error || 'Failed to load habit control data');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Habit control fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'minimal': '#10b981',
      'mild': '#84cc16',
      'moderate': '#f59e0b',
      'moderate_severe': '#f97316',
      'severe': '#ef4444',
      'critical': '#dc2626'
    };
    return colors[severity] || '#6b7280';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'low': '#10b981',
      'moderate': '#f59e0b',
      'high': '#f97316',
      'critical': '#dc2626'
    };
    return colors[urgency] || '#6b7280';
  };

  const getOrganIcon = (organ) => {
    const icons = {
      'Brain': <Brain size={14} />,
      'Heart': <Heart size={14} />,
      'Lungs': <Wind size={14} />,
      'Liver': <Shield size={14} />,
      'Stomach': <Activity size={14} />,
      'Eyes': <Target size={14} />
    };
    return icons[organ] || <Activity size={14} />;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-container">
          <div className="dot-pulse"></div>
          <p>AI is analyzing your habit patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!habitData) {
    return (
      <div className="card">
        <p>No habit control data available.</p>
      </div>
    );
  }

  const { 
    addiction_analysis, 
    intervention_plan, 
    overall_control_score, 
    urgency_assessment,
    success_prediction,
    recommended_next_steps 
  } = habitData;

  return (
    <div className="habit-control-ai">
      {/* Header with Control Score */}
      <section className="card habit-control-header">
        <div className="control-header-content">
          <div className="control-score-circle">
            <div className="score-value">{Math.round(overall_control_score)}%</div>
            <div className="score-label">Habit Control</div>
          </div>
          <div className="urgency-assessment">
            <h3 className="card-title-text">
              <Shield size={20} color={getUrgencyColor(urgency_assessment.urgency_level)} />
              AI Habit Control Analysis
            </h3>
            <div className="urgency-info">
              <span 
                className="urgency-badge" 
                style={{ backgroundColor: getUrgencyColor(urgency_assessment.urgency_level) }}
              >
                {urgency_assessment.urgency_level.toUpperCase()} URGENCY
              </span>
              <p className="urgency-action">{urgency_assessment.recommended_action}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="habit-tabs">
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          <Brain size={16} />
          Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === 'intervention' ? 'active' : ''}`}
          onClick={() => setActiveTab('intervention')}
        >
          <Target size={16} />
          Intervention Plan
        </button>
        <button 
          className={`tab-button ${activeTab === 'next-steps' ? 'active' : ''}`}
          onClick={() => setActiveTab('next-steps')}
        >
          <Zap size={16} />
          Next Steps
        </button>
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="tab-content">
          <section className="card addiction-analysis-section">
            <h3 className="card-title-text">
              <AlertTriangle size={18} color="var(--lavender)" />
              Addiction Pattern Analysis
            </h3>
            <div className="addiction-grid">
              {Object.entries(addiction_analysis).map(([addiction, analysis]) => (
                <div key={addiction} className="addiction-item">
                  <div className="addiction-header">
                    <h4 className="addiction-name">{addiction.replace('_', ' ').toUpperCase()}</h4>
                    <div className="severity-meter">
                      <div className="severity-bar">
                        <div 
                          className="severity-fill" 
                          style={{ 
                            width: `${analysis.severity_score}%`,
                            backgroundColor: getSeverityColor(analysis.severity_level)
                          }}
                        ></div>
                      </div>
                      <span className="severity-text" style={{ color: getSeverityColor(analysis.severity_level) }}>
                        {analysis.severity_level} ({Math.round(analysis.severity_score)}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="addiction-details">
                    <div className="detail-row">
                      <span className="detail-label">Addiction Probability:</span>
                      <span className="detail-value">{Math.round(analysis.addiction_probability)}%</span>
                    </div>
                    
                    {Object.keys(analysis.health_impact || {}).length > 0 && (
                      <div className="health-impact">
                        <span className="detail-label">Health Impact:</span>
                        <div className="impact-organs">
                          {Object.entries(analysis.health_impact).map(([organ, impact]) => (
                            <div key={organ} className="organ-impact">
                              {getOrganIcon(organ)}
                              <span className="organ-name">{organ}</span>
                              <span className="impact-score">{Math.round(impact)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="symptoms-list">
                      <span className="detail-label">Present Symptoms:</span>
                      <div className="symptom-tags">
                        {analysis.present_symptoms?.map((symptom, i) => (
                          <span key={i} className="symptom-tag">{symptom.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="triggers-list">
                      <span className="detail-label">Primary Triggers:</span>
                      <div className="trigger-tags">
                        {analysis.primary_triggers?.map((trigger, i) => (
                          <span key={i} className="trigger-tag">{trigger}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Success Prediction */}
          <section className="card success-prediction-section">
            <h3 className="card-title-text">
              <TrendingUp size={18} color="var(--green)" />
              Intervention Success Prediction
            </h3>
            <div className="success-metrics">
              <div className="success-probability">
                <div className="probability-circle">
                  <div className="probability-value">{Math.round(success_prediction.overall_probability)}%</div>
                  <div className="probability-label">Success Rate</div>
                </div>
              </div>
              <div className="success-details">
                <div className="success-timeline">
                  <div className="timeline-item">
                    <Clock size={16} />
                    <span>Significant improvement: {success_prediction.time_to_significant_improvement}</span>
                  </div>
                  <div className="timeline-item">
                    <Calendar size={16} />
                    <span>Sustainable change: {success_prediction.time_to_sustainable_change}</span>
                  </div>
                </div>
                {success_prediction.factors?.length > 0 && (
                  <div className="success-factors">
                    <h5>Success Factors:</h5>
                    <ul>
                      {success_prediction.factors.map((factor, i) => (
                        <li key={i}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Intervention Plan Tab */}
      {activeTab === 'intervention' && (
        <div className="tab-content">
          <section className="card intervention-plan-section">
            <h3 className="card-title-text">
              <Target size={18} color="var(--lavender)" />
              Personalized Intervention Plan
            </h3>
            
            <div className="plan-overview">
              <div className="primary-focus">
                <h4>Primary Focus: {intervention_plan.primary_focus?.replace('_', ' ').toUpperCase()}</h4>
              </div>
            </div>

            <div className="intervention-timeline">
              <h4>Intervention Timeline</h4>
              {intervention_plan.intervention_timeline?.map((phase, index) => (
                <div key={index} className="timeline-phase">
                  <div className="phase-header">
                    <div className="phase-number">{index + 1}</div>
                    <div className="phase-info">
                      <h5>{phase.phase}</h5>
                      <span className="phase-duration">{phase.duration}</span>
                    </div>
                  </div>
                  <div className="phase-content">
                    <div className="phase-goals">
                      <strong>Goals:</strong>
                      <ul>
                        {phase.goals?.map((goal, i) => (
                          <li key={i}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="phase-interventions">
                      <strong>Interventions:</strong>
                      <div className="intervention-tags">
                        {phase.interventions?.map((intervention, i) => (
                          <span key={i} className="intervention-tag">{intervention.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="daily-routines">
              <h4>Daily Routines</h4>
              <div className="routines-grid">
                {Object.entries(intervention_plan.daily_routines || {}).map(([time, routines]) => (
                  <div key={time} className="routine-block">
                    <h5 className="routine-time">{time.replace('_', ' ').toUpperCase()}</h5>
                    <ul className="routine-list">
                      {routines?.map((routine, i) => (
                        <li key={i}>{routine}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="support-system">
              <h4>Support System</h4>
              <div className="support-grid">
                {Object.entries(intervention_plan.support_system || {}).map(([type, resources]) => (
                  <div key={type} className="support-category">
                    <h5 className="support-type">{type.replace('_', ' ').toUpperCase()}</h5>
                    <ul className="support-list">
                      {resources?.map((resource, i) => (
                        <li key={i}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Next Steps Tab */}
      {activeTab === 'next-steps' && (
        <div className="tab-content">
          <section className="card next-steps-section">
            <h3 className="card-title-text">
              <Zap size={18} color="var(--green)" />
              Immediate Next Steps
            </h3>
            <div className="next-steps-list">
              {recommended_next_steps?.map((step, index) => (
                <div key={index} className="next-step-item">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">{step}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card contingency-plan-section">
            <h3 className="card-title-text">
              <Shield size={18} color="var(--lavender)" />
              Contingency Plan
            </h3>
            <div className="contingency-content">
              <div className="contingency-section">
                <h4>Warning Signs</h4>
                <ul>
                  {intervention_plan.contingency_plan?.warning_signs?.map((sign, i) => (
                    <li key={i}>{sign}</li>
                  ))}
                </ul>
              </div>
              
              <div className="contingency-section">
                <h4>Immediate Actions</h4>
                <ul>
                  {intervention_plan.contingency_plan?.immediate_actions?.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
              
              <div className="contingency-section">
                <h4>Emergency Contacts</h4>
                <ul>
                  {intervention_plan.contingency_plan?.emergency_contacts?.map((contact, i) => (
                    <li key={i}>{contact}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default HabitControlAI;
