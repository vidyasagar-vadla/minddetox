import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import "../styles/Register.css";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:8080";

export default function Register() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data?.error || "Registration failed");
        return;
      }

      // Store token and user data
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        alert("Registered successfully ✅");
        nav("/get-started"); // Go to questionnaire directly
      } else {
        alert("Registered successfully ✅");
        nav("/login");
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
        {/* ✅ Added: shadow-lavender + register-card now has green top border */}
        <div className="card register-card shadow-lavender">
          <div className="auth-header">
            {/* ✅ Use same green logo style as login */}
            <div className="logo-box-green">MD</div>
            <h1 className="title">Create Account</h1>
            <p className="subtitle">Start your journey to a clear mind.</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="control-wrapper">
              <span className="input-icon">
                <User size={18} />
              </span>
              <input
                type="text"
                className="control"
                placeholder="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
                "Creating..."
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p className="subtitle" style={{ margin: 0 }}>
              Already have an account?{" "}
              <span className="link-green" onClick={() => nav("/login")}>
                Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
