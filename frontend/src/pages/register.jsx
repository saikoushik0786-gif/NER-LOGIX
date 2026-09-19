import { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    license_number: "",
    vehicle_number: "",
    vehicle_type: "",
    department: "Essential Logistics",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register-driver`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Registration failed"
        );
      }

      setMessage(
        "Registration submitted successfully. Your account is pending administrator approval."
      );

      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        license_number: "",
        vehicle_number: "",
        vehicle_type: "",
        department: "Essential Logistics",
      });
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the NER-LOGIX backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              color: "#172033",
            }}
          >
            Driver Registration
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#667085",
              fontSize: "14px",
            }}
          >
            Register as a NER-LOGIX logistics driver.
            Your registration must be approved by an
            administrator before you can log in.
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "10px",
              background: "#ecfdf3",
              color: "#027a48",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "10px",
              background: "#fef3f2",
              color: "#b42318",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "18px",
            }}
          >
            <div>
              <label>Full Name</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label>Phone Number</label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label>Password</label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label>Driving License Number</label>

              <input
                type="text"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                placeholder="Enter license number"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label>Vehicle Number</label>

              <input
                type="text"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                placeholder="Example: AP01AB1234"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label>Vehicle Type</label>

              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">
                  Select vehicle type
                </option>

                <option value="Truck">
                  Truck
                </option>

                <option value="Mini Truck">
                  Mini Truck
                </option>

                <option value="Van">
                  Van
                </option>

                <option value="Ambulance">
                  Ambulance
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label>Department</label>

              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "28px",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: loading
                ? "#98a2b3"
                : "#2563eb",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Submitting..."
              : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: "7px",
  padding: "12px 14px",
  border: "1px solid #d0d5dd",
  borderRadius: "8px",
  outline: "none",
  fontSize: "14px",
  background: "#ffffff",
};