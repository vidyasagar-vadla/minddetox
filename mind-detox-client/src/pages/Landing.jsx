import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Landing.css";

export default function Landing() {
  const nav = useNavigate();

  return (
    <div className="shell">
      <div className="container">
        <div className="card">
          <div className="grid2">
            {/* CONTENT AREA (Left) */}
            <div className="landing-content">
              <div className="logo-wrapper">
                <div className="logo-box">MD</div>
                <span className="brand-name">Mind Detox</span>
              </div>

              <h1 className="title">
                Break Free from <span className="gradient-text">Addictions</span>
              </h1>

              <p className="subtitle">
                Track habits, analyze triggers, and take control with a clean,
                guided detox journey.
              </p>

              <div className="cta-row">
                <button
                  className="btn btnPrimary"
                  onClick={() => nav("/get-started")}
                >
                  Get Started
                </button>

                <button className="btn" onClick={() => nav("/login")}>
                  Sign In
                </button>
              </div>
            </div>

            {/* IMAGE AREA (Right) */}
            <div className="landing-image-container">
              <img
                alt="Mind Detox Journey"
                src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=900&auto=format&fit=crop"
                className="landing-image"
              />
              <div className="image-overlay">
                <p className="overlay-text">“Small steps, big change.” 🌿</p>
              </div>
            </div>
          </div>

          <div className="footer-note">
            <span>Mind Detox © {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
