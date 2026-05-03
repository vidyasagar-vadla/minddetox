-- Additional tables for AI-powered features
-- Add these to your existing PostgreSQL database

-- User preferences for personalized recommendations
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Historical questionnaire data for trend analysis
CREATE TABLE IF NOT EXISTS user_questionnaire_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answers_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly progress tracking
CREATE TABLE IF NOT EXISTS weekly_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    ai_insights JSONB NOT NULL,
    goals_completed INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    progress_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Habit control tracking
CREATE TABLE IF NOT EXISTS habit_control_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    addiction_type VARCHAR(50) NOT NULL,
    severity_score DECIMAL(5,2) DEFAULT 0.00,
    intervention_plan JSONB NOT NULL,
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily check-ins for granular tracking
CREATE TABLE IF NOT EXISTS daily_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
    cravings_intensity INTEGER CHECK (cravings_intensity >= 0 AND cravings_intensity <= 10),
    triggers_encountered TEXT[],
    coping_strategies_used TEXT[],
    goals_achieved TEXT[],
    challenges_faced TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, checkin_date)
);

-- Milestone achievements
CREATE TABLE IF NOT EXISTS milestone_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL, -- 'weekly_goal', 'habit_reduction', 'health_improvement'
    milestone_description TEXT NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    celebration_message TEXT,
    ai_generated BOOLEAN DEFAULT true
);

-- Intervention effectiveness tracking
CREATE TABLE IF NOT EXISTS intervention_effectiveness (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    intervention_type VARCHAR(100) NOT NULL,
    addiction_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    effectiveness_score DECIMAL(5,2),
    user_feedback TEXT,
    ai_recommendation_strength DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI model predictions history
CREATE TABLE IF NOT EXISTS ai_prediction_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL, -- 'weekly_progress', 'habit_control', 'health_risk'
    input_data JSONB NOT NULL,
    prediction_result JSONB NOT NULL,
    confidence_score DECIMAL(5,2),
    model_version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_history_user_id ON user_questionnaire_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questionnaire_history_created_at ON user_questionnaire_history(created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_progress_user_id ON weekly_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_progress_week_start ON weekly_progress(week_start_date);
CREATE INDEX IF NOT EXISTS idx_habit_control_tracking_user_id ON habit_control_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_milestone_achievements_user_id ON milestone_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_effectiveness_user_id ON intervention_effectiveness(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_history_user_id ON ai_prediction_history(user_id);

-- Function to automatically create history entries when questionnaire is updated
CREATE OR REPLACE FUNCTION create_questionnaire_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_questionnaire_history (user_id, answers_json)
    VALUES (NEW.user_id, NEW.answers_json);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically archive questionnaire changes
DROP TRIGGER IF EXISTS trigger_create_questionnaire_history ON user_questionnaire;
CREATE TRIGGER trigger_create_questionnaire_history
    AFTER UPDATE ON user_questionnaire
    FOR EACH ROW
    EXECUTE FUNCTION create_questionnaire_history();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_weekly_progress_updated_at ON weekly_progress;
CREATE TRIGGER trigger_weekly_progress_updated_at
    BEFORE UPDATE ON weekly_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_habit_control_tracking_updated_at ON habit_control_tracking;
CREATE TRIGGER trigger_habit_control_tracking_updated_at
    BEFORE UPDATE ON habit_control_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
