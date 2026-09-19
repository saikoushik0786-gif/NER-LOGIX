import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function DriverRegistrations({ setPage }) {
  const { token } = useAuth();

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/admin/driver-registrations`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load registrations");
      }

      setRegistrations(data);
    } catch (err) {
      setError(err.message || "Unable to load driver registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadRegistrations();
    }
  }, [token]);

  const approveDriver = async (id) => {
    try {
      setActionLoading(id);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/admin/driver-registrations/${id}/approve`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to approve driver");
      }

      await loadRegistrations();
    } catch (err) {
      setError(err.message || "Unable to approve driver");
    } finally {
      setActionLoading(null);
    }
  };

  const rejectDriver = async (id) => {
    const reason = window.prompt(
      "Enter rejection reason:",
      "Registration details could not be verified."
    );

    if (reason === null) {
      return;
    }

    try {
      setActionLoading(id);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/admin/driver-registrations/${id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: reason || "Registration rejected by administrator.",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to reject driver");
      }

      await loadRegistrations();
    } catch (err) {
      setError(err.message || "Unable to reject driver");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = registrations.filter(
    (item) => item.status === "PENDING"
  ).length;

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>👤 Driver Registrations</h2>
            <p>
              Review and approve new logistics driver registration requests.
            </p>
          </div>

          <button
            className="view-button"
            onClick={() => setPage("Dashboard")}
          >
            ← Dashboard
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              padding: "18px",
              borderRadius: "14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Total Requests
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                marginTop: "5px",
              }}
            >
              {registrations.length}
            </div>
          </div>

          <div
            style={{
              padding: "18px",
              borderRadius: "14px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
            }}
          >
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Pending Approval
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                marginTop: "5px",
                color: "#ea580c",
              }}
            >
              {pendingCount}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: "18px",
            padding: "14px",
            borderRadius: "10px",
            background: "#fef3f2",
            border: "1px solid #fecdca",
            color: "#b42318",
          }}
        >
          {error}
        </div>
      )}

      <div className="panel" style={{ marginTop: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Registration Requests</h2>
            <p style={{ marginTop: "6px" }}>
              Verify driver information before approving access.
            </p>
          </div>

          <button
            className="view-button"
            onClick={loadRegistrations}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px 10px",
              textAlign: "center",
              color: "#667085",
            }}
          >
            Loading driver registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div
            style={{
              marginTop: "20px",
              padding: "35px",
              textAlign: "center",
              borderRadius: "12px",
              background: "#f8fafc",
              color: "#667085",
            }}
          >
            No driver registration requests found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
              marginTop: "20px",
            }}
          >
            {registrations.map((driver) => (
              <div
                key={driver.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "18px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>
                      👤 {driver.name}
                    </h3>

                    <div
                      style={{
                        marginTop: "6px",
                        color: "#667085",
                        fontSize: "14px",
                      }}
                    >
                      Registration ID: #{driver.id}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "700",
                      background:
                        driver.status === "PENDING"
                          ? "#fff7ed"
                          : driver.status === "APPROVED"
                          ? "#ecfdf3"
                          : "#fef3f2",
                      color:
                        driver.status === "PENDING"
                          ? "#c2410c"
                          : driver.status === "APPROVED"
                          ? "#027a48"
                          : "#b42318",
                    }}
                  >
                    {driver.status}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginTop: "18px",
                  }}
                >
                  <Info label="Email" value={driver.email} />
                  <Info label="Phone" value={driver.phone} />
                  <Info
                    label="Driving License"
                    value={driver.license_number}
                  />
                  <Info
                    label="Vehicle Number"
                    value={driver.vehicle_number}
                  />
                  <Info
                    label="Vehicle Type"
                    value={driver.vehicle_type}
                  />
                  <Info
                    label="Department"
                    value={driver.department}
                  />
                </div>

                {driver.rejection_reason && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      borderRadius: "9px",
                      background: "#fef3f2",
                      color: "#b42318",
                      fontSize: "13px",
                    }}
                  >
                    <strong>Rejection reason:</strong>{" "}
                    {driver.rejection_reason}
                  </div>
                )}

                {driver.status === "PENDING" && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop: "1px solid #eef2f6",
                    }}
                  >
                    <button
                      onClick={() => rejectDriver(driver.id)}
                      disabled={actionLoading === driver.id}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "1px solid #fca5a5",
                        background: "#fff",
                        color: "#dc2626",
                        fontWeight: "700",
                        cursor:
                          actionLoading === driver.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {actionLoading === driver.id
                        ? "Processing..."
                        : "✕ Reject"}
                    </button>

                    <button
                      onClick={() => approveDriver(driver.id)}
                      disabled={actionLoading === driver.id}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#16a34a",
                        color: "#fff",
                        fontWeight: "700",
                        cursor:
                          actionLoading === driver.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {actionLoading === driver.id
                        ? "Processing..."
                        : "✓ Approve Driver"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: "12px",
          color: "#667085",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: "600",
          color: "#172033",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}