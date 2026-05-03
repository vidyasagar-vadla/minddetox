import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/navfloat.css";

export default function Navbar() {
  const nav = useNavigate();

  return (
    <div className="nav-container">
      <div className="nav-content">
        {/* Logo */}
        <div className="nav-logo" onClick={() => nav("/dashboard")}>
          <div className="logo-sq">MD</div>
          <span>Mind Detox</span>
        </div>

        {/* Menu */}
        <div className="nav-menu">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Dashboard
          </NavLink>

          {/* Add future menu items like this */}
          {/* <NavLink to="/profile" className={({isActive}) => `nav-link ${isActive ? "active" : ""}`}>Profile</NavLink> */}
        </div>

        {/* Right */}
        <div className="nav-right">
          <button className="about-link" onClick={() => nav("/")}>
            Home
          </button>

          <div className="nav-divider" />

          <button
            className="user-avatar"
            title="Logout"
            onClick={() => {
              // simple logout
              localStorage.removeItem("token");
              nav("/login");
            }}
          >
            U
          </button>
        </div>
      </div>
    </div>
  );
}
