import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("GOVERNMENT_ADMIN");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      login(data.access_token, data.user);

      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  const openDriverRegistration = () => {
    navigate("/register-driver");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fb",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            marginBottom: "8px",
            fontSize: "30px",
            fontWeight: "700",
          }}
        >
          NER-LOGIX
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "28px",
          }}
        >
          Logistics Intelligence Platform
        </p>

        {error && (
          <div
            style={{
              background: "#ffecec",
              color: "#c62828",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* EMAIL */}

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "18px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              boxSizing: "border-box",
              fontSize: "14px",
            }}
          />

          {/* PASSWORD */}

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "18px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              boxSizing: "border-box",
              fontSize: "14px",
            }}
          />

          {/* ROLE */}

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "600",
            }}
          >
            Role
          </label>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "24px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          >
            <option value="GOVERNMENT_ADMIN">
              Government / Admin
            </option>

            <option value="FIELD_OFFICER">
              Field Officer
            </option>

            <option value="DRIVER">
              Logistics Driver
            </option>
          </select>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "8px",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* DRIVER REGISTRATION */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "24px 0 18px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e5e7eb",
            }}
          />

          <span
            style={{
              color: "#98a2b3",
              fontSize: "12px",
            }}
          >
            OR
          </span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e5e7eb",
            }}
          />
        </div>

        <button
          type="button"
          onClick={openDriverRegistration}
          style={{
            width: "100%",
            padding: "13px",
            border: "1px solid #2563eb",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#2563eb",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Register as Driver
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "12px",
            marginBottom: 0,
            color: "#667085",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
        >
          New drivers must receive administrator
          approval before they can sign in.
        </p>
      </div>
    </div>
  );
}

export default Login;