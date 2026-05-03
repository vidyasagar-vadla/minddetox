import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import "../styles/Login.css";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:8080";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data?.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);

      // cache predictions computed at login (if questionnaire exists)
      if (data.healthStats) {
        localStorage.setItem("healthStats", JSON.stringify(data.healthStats));
      } else {
        localStorage.removeItem("healthStats");
      }

      if (data.hasFilledForm) {
        nav("/dashboard");
      } else {
        nav("/get-started");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Is backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      <div className="container mini">
        <div className="card login-card shadow-lavender">
          <div className="auth-header">
            <div className="logo-box-green">MD</div>
            <h1 className="title">Welcome Back</h1>
            <p className="subtitle">Sign in to continue your detox journey.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="control-wrapper">
              <span className="input-icon">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="control"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="control-wrapper">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="control"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="btn btnPrimary full-width" type="submit" disabled={loading}>
              {loading ? (
                "Signing In..."
              ) : (
                <>
                  Sign In <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p className="subtitle" style={{ margin: 0 }}>
              New here?{" "}
              <span className="link-green" onClick={() => nav("/register")}>
                Register
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
