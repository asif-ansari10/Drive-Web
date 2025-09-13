import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import DrivePage from "./pages/DrivePage";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <DrivePage />
            </RequireAuth>
            
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </div>
  );
}
