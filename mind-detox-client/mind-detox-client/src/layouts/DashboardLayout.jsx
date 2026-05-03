import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar.jsx";
import FloatingBot from "../components/floatingbot.jsx";

export default function DashboardLayout() {
  return (
    <>
      <Navbar />

      {/* Your navbar is sticky (not fixed) in CSS, so paddingTop not required.
          If you change navbar to position:fixed later, add paddingTop here. */}
      <Outlet />

      <FloatingBot />
    </>
  );
}
