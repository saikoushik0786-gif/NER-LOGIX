import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* =========================================
              PUBLIC ROUTES
          ========================================= */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register-driver"
            element={<Register />}
          />


          {/* =========================================
              PROTECTED NER-LOGIX APPLICATION
          ========================================= */}

          <Route element={<ProtectedRoute />}>
            <Route
              path="/*"
              element={<App />}
            />
          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);