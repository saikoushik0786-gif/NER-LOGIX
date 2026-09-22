import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet marker icon fix for React/Vite.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const NE_LOCATIONS = [
  { name: "Guwahati", state: "Assam", position: [26.1445, 91.7362], risk: 22, status: "Safe" },
  { name: "Shillong", state: "Meghalaya", position: [25.5788, 91.8933], risk: 28, status: "Safe" },
  { name: "Itanagar", state: "Arunachal Pradesh", position: [27.0844, 93.6053], risk: 51, status: "Moderate" },
  { name: "Kohima", state: "Nagaland", position: [25.6751, 94.1086], risk: 37, status: "Safe" },
  { name: "Imphal", state: "Manipur", position: [24.817, 93.9368], risk: 44, status: "Moderate" },
  { name: "Aizawl", state: "Mizoram", position: [23.7271, 92.7176], risk: 34, status: "Safe" },
  { name: "Agartala", state: "Tripura", position: [23.8315, 91.2868], risk: 31, status: "Safe" },
  { name: "Gangtok", state: "Sikkim", position: [27.3389, 88.6065], risk: 39, status: "Safe" },
  { name: "Tawang", state: "Arunachal Pradesh", position: [27.586, 91.859], risk: 69, status: "High Risk" },
  { name: "Bomdila", state: "Arunachal Pradesh", position: [27.264, 92.424], risk: 55, status: "Moderate" },
];

const DEMO_EMERGENCY_CENTERS = [
  { id: "EC-01", name: "NER Emergency Coordination Center", location: "Guwahati", position: [26.1445, 91.7362] },
  { id: "EC-02", name: "Mountain Response Center", location: "Bomdila", position: [27.264, 92.424] },
  { id: "EC-03", name: "Regional Response Center", location: "Shillong", position: [25.5788, 91.8933] },
];

const RISK_CORRIDOR = [
  [26.1445, 91.7362],
  [26.5, 92.2],
  [27.0, 92.7],
  [27.586, 91.859],
];

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function riskColor(score) {
  const n = safeNumber(score, 0);
  if (n >= 80) return "#991b1b";
  if (n >= 60) return "#dc2626";
  if (n >= 40) return "#f59e0b";
  return "#16a34a";
}

function riskLabel(score) {
  const n = safeNumber(score, 0);
  if (n >= 80) return "Critical";
  if (n >= 60) return "High";
  if (n >= 40) return "Medium";
  return "Low";
}

function formatTime(minutes) {
  const m = Math.max(0, Math.round(safeNumber(minutes, 0)));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m} min`;
}

function vehicleIcon(vehicle) {
  const risk = safeNumber(vehicle?.riskScore, 0);
  const border = riskColor(risk);
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:38px;height:38px;border-radius:12px;
        background:#fff;border:3px solid ${border};
        box-shadow:0 4px 12px rgba(15,23,42,.22);
        display:flex;align-items:center;justify-content:center;
        font-size:20px;
      ">🚚</div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

function emergencyIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:#2563eb;color:#fff;border:3px solid #fff;
        box-shadow:0 4px 12px rgba(37,99,235,.35);
        display:flex;align-items:center;justify-content:center;
        font-size:17px;font-weight:800;
      ">+</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function MapViewportController({ routePositions, origin, destination, searchedPosition }) {
  const map = useMap();

  useEffect(() => {
    const valid = routePositions?.filter(
      (p) => Array.isArray(p) && p.length >= 2 &&
        Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))
    ) || [];

    if (valid.length >= 2) {
      map.fitBounds(valid, { padding: [35, 35], maxZoom: 11 });
      return;
    }

    if (origin && destination) {
      map.fitBounds([origin, destination], { padding: [45, 45], maxZoom: 11 });
      return;
    }

    if (searchedPosition) {
      map.flyTo(searchedPosition, Math.max(map.getZoom(), 10), { duration: 0.8 });
    }
  }, [map, routePositions, origin, destination, searchedPosition]);

  return null;
}

function MapPickHandler({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (!enabled || !onPick) return;
      onPick([
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ]);
    },
  });
  return null;
}

function SearchControl({ onResult }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function searchPlace(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setMessage("");

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`Search returned HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data) || !data.length) {
        setMessage("Location not found");
        return;
      }

      const item = data[0];
      onResult({
        position: [Number(item.lat), Number(item.lon)],
        name: item.display_name,
      });
    } catch (error) {
      setMessage("Search unavailable. Try the map or a district name.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={searchPlace}
      style={{
        position: "absolute",
        zIndex: 1000,
        top: 12,
        left: 12,
        width: "min(360px, calc(100% - 24px))",
        background: "#fff",
        border: "1px solid #dbe3ef",
        borderRadius: 12,
        padding: 8,
        boxShadow: "0 6px 20px rgba(15,23,42,.14)",
      }}
    >
      <div style={{ display: "flex", gap: 7 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search location..."
          aria-label="Search location"
          style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #dbe3ef",
            borderRadius: 8,
            padding: "9px 10px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 8,
            padding: "0 12px",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>
      {message && (
        <div style={{ fontSize: 11, color: "#b91c1c", padding: "6px 3px 1px" }}>
          {message}
        </div>
      )}
      <div style={{ fontSize: 9, color: "#64748b", padding: "4px 3px 0" }}>
        Search powered by OpenStreetMap Nominatim
      </div>
    </form>
  );
}

export default function MapView({
  vehicles = [],
  reports = [],
  alerts = [],
  alternatives = [],
  riskScore = 69,
  showSaferRoute = false,
  selectedRoute = null,
  compact = false,
  routeGeometry = [],
  origin = null,
  destination = null,
  pickMode = null,
  onMapPick = null,
  emergencyMode = false,
  onEmergencyModeToggle = null,
}) {
  const [baseLayer, setBaseLayer] = useState("osm");
  const [showRisks, setShowRisks] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showCenters, setShowCenters] = useState(false);
  const [searchedPosition, setSearchedPosition] = useState(null);
  const [searchName, setSearchName] = useState("");

  const routePositions = useMemo(
    () =>
      (Array.isArray(routeGeometry) ? routeGeometry : [])
        .filter(
          (p) =>
            Array.isArray(p) &&
            p.length >= 2 &&
            Number.isFinite(Number(p[0])) &&
            Number.isFinite(Number(p[1]))
        )
        .map((p) => [Number(p[0]), Number(p[1])]),
    [routeGeometry]
  );

  const activeAlerts = useMemo(
    () =>
      (alerts || []).filter((a) => {
        const status = String(a?.status || "Open").toLowerCase();
        const lat = Number(a?.latitude ?? a?.lat);
        const lng = Number(a?.longitude ?? a?.lng ?? a?.lon);
        return (
          status === "open" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        );
      }),
    [alerts]
  );

  const activeReports = useMemo(
    () =>
      (reports || []).filter((r) => {
        const status = String(r?.status || "Open").toLowerCase();
        const lat = Number(r?.latitude ?? r?.lat);
        const lng = Number(r?.longitude ?? r?.lng ?? r?.lon);
        return (
          status !== "resolved" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        );
      }),
    [reports]
  );

  const affectedAlternative = useMemo(
    () =>
      [...(alternatives || [])]
        .filter(
          (r) =>
            Array.isArray(r?.geometry) &&
            r.geometry.length >= 2 &&
            r.route_id !== selectedRoute?.route_id
        )
        .sort(
          (a, b) =>
            safeNumber(b?.risk_score) - safeNumber(a?.risk_score)
        )[0],
    [alternatives, selectedRoute]
  );

  const alternativePositions = useMemo(
    () =>
      (affectedAlternative?.geometry || [])
        .filter(
          (p) =>
            Array.isArray(p) &&
            p.length >= 2 &&
            Number.isFinite(Number(p[0])) &&
            Number.isFinite(Number(p[1]))
        )
        .map((p) => [Number(p[0]), Number(p[1])]),
    [affectedAlternative]
  );

  function handleSearch(result) {
    setSearchedPosition(result.position);
    setSearchName(result.name);
  }

  const mapHeight = compact ? 470 : 540;

  const mobileMapStyles = `
    .ner-map-shell {
      width: 100%;
    }

    @media (max-width: 760px) {
      .ner-map-shell {
        overflow: visible !important;
        border: 0 !important;
        border-radius: 16px !important;
      }

      .ner-map-container {
        height: 390px !important;
        min-height: 390px !important;
        width: 100% !important;
        border-radius: 16px !important;
        overflow: hidden !important;
        box-shadow: 0 10px 28px rgba(15,23,42,.12);
      }

      .ner-map-container .leaflet-control-container {
        z-index: 450 !important;
      }

      .ner-map-container .leaflet-control-zoom {
        margin-top: 8px !important;
        margin-right: 8px !important;
      }

      .ner-map-container .leaflet-control-zoom a {
        width: 36px !important;
        height: 36px !important;
        line-height: 36px !important;
        font-size: 19px !important;
        border: 1px solid #dbe3ef !important;
        box-shadow: 0 4px 12px rgba(15,23,42,.16) !important;
      }

      .ner-map-container .leaflet-control-attribution {
        font-size: 7px !important;
        padding: 2px 4px !important;
        opacity: .82;
      }

      .ner-map-controls {
        position: static !important;
        width: 100% !important;
        max-width: none !important;
        margin: 10px 0 0 !important;
        padding: 12px !important;
        border: 1px solid #dbeafe !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 24px rgba(15,23,42,.10) !important;
        background: #ffffff !important;
      }

      .ner-map-controls > div:first-child {
        font-size: 13px !important;
        margin-bottom: 9px !important;
      }

      .ner-map-controls button {
        min-height: 40px !important;
        font-size: 11px !important;
      }

      .ner-map-controls input[type="checkbox"] {
        width: 18px !important;
        height: 18px !important;
        min-height: 18px !important;
      }

      .ner-map-legend {
        position: static !important;
        width: 100% !important;
        margin: 10px 0 0 !important;
        padding: 10px 12px !important;
        border: 1px solid #dbeafe !important;
        border-radius: 14px !important;
        background: #ffffff !important;
        box-shadow: 0 6px 18px rgba(15,23,42,.08) !important;
        font-size: 10px !important;
        line-height: 1.6 !important;
      }

      .ner-map-shell form {
        top: 10px !important;
        left: 10px !important;
        width: min(250px, calc(100% - 62px)) !important;
        padding: 6px !important;
        border-radius: 12px !important;
        box-shadow: 0 5px 16px rgba(15,23,42,.14) !important;
      }

      .ner-map-shell form input {
        min-height: 38px !important;
        font-size: 14px !important;
      }

      .ner-map-shell form button {
        min-height: 38px !important;
        padding: 0 10px !important;
      }

      .ner-map-shell form > div:last-child {
        display: none !important;
      }
    }

    @media (max-width: 380px) {
      .ner-map-container {
        height: 350px !important;
        min-height: 350px !important;
      }

      .ner-map-shell form {
        width: calc(100% - 58px) !important;
      }

      .ner-map-controls {
        padding: 10px !important;
      }
    }
  `;

  return (
    <>
      <style>{mobileMapStyles}</style>
      <div className="ner-map-shell"
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius: 14,
        border: "1px solid #dbe3ef",
      }}
    >
      <MapContainer
        center={[25.8, 92.2]}
        zoom={6}
        minZoom={5}
        maxZoom={18}
        scrollWheelZoom
        className="real-map ner-map-container"
        style={{
          height: mapHeight,
          width: "100%",
          cursor: pickMode ? "crosshair" : "grab",
        }}
      >
        {baseLayer === "osm" && (
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {baseLayer === "hot" && (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors, Tiles style by HOT'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          />
        )}

        {baseLayer === "satellite" && (
          <TileLayer
            attribution='&copy; Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        <MapViewportController
          routePositions={routePositions}
          origin={origin}
          destination={destination}
          searchedPosition={searchedPosition}
        />

        <MapPickHandler enabled={!!pickMode} onPick={onMapPick} />

        {showVehicles &&
          vehicles.map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={vehicle.position}
              icon={vehicleIcon(vehicle)}
            >
              <Popup>
                <div style={{ minWidth: 230 }}>
                  <strong>🚚 {vehicle.id}</strong>
                  <div style={{ marginTop: 6 }}>
                    <b>Cargo:</b> {vehicle.cargoIcon || "📦"} {vehicle.cargo}
                  </div>
                  <div><b>Driver:</b> {vehicle.driver || "Field Unit"}</div>
                  <div><b>Route:</b> {vehicle.route}</div>
                  <div><b>Status:</b> {vehicle.status}</div>
                  <div><b>Speed:</b> {vehicle.speed} km/h</div>
                  <div><b>Fuel:</b> {vehicle.fuel}%</div>
                  <div>
                    <b>Risk:</b>{" "}
                    <span style={{ color: riskColor(vehicle.riskScore), fontWeight: 700 }}>
                      {vehicle.riskScore}/100 · {riskLabel(vehicle.riskScore)}
                    </span>
                  </div>
                  <div><b>ETA:</b> {formatTime(vehicle.etaMinutes)}</div>
                  <div style={{ marginTop: 7, color: "#2563eb", fontWeight: 700 }}>
                    📡 GPS telemetry active
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {showRisks &&
          NE_LOCATIONS.map((location) => (
            <CircleMarker
              key={`risk-${location.name}`}
              center={location.position}
              radius={Math.max(7, Math.min(16, location.risk / 5))}
              pathOptions={{
                color: riskColor(location.risk),
                fillColor: riskColor(location.risk),
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <strong>📍 {location.name}</strong>
                <br />
                State: {location.state}
                <br />
                Status: {location.status}
                <br />
                Risk:{" "}
                <b style={{ color: riskColor(location.risk) }}>
                  {location.risk}/100 · {riskLabel(location.risk)}
                </b>
              </Popup>
            </CircleMarker>
          ))}

        {showAlerts &&
          activeAlerts.map((alert) => {
            const lat = Number(alert.latitude ?? alert.lat);
            const lng = Number(alert.longitude ?? alert.lng ?? alert.lon);
            const color = riskColor(
              alert.severity === "Critical"
                ? 90
                : alert.severity === "High"
                  ? 70
                  : alert.severity === "Medium"
                    ? 50
                    : 20
            );

            return (
              <CircleMarker
                key={`alert-${alert.id}`}
                center={[lat, lng]}
                radius={11}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <strong>{alert.icon || "🚨"} {alert.type}</strong>
                    <div><b>Severity:</b> {alert.severity}</div>
                    <div><b>Location:</b> {alert.location}</div>
                    <div><b>Status:</b> {alert.status}</div>
                    <div style={{ marginTop: 6 }}>
                      {alert.description || "Operational alert in the monitored corridor."}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {activeReports.map((report) => {
          const lat = Number(report.latitude ?? report.lat);
          const lng = Number(report.longitude ?? report.lng ?? report.lon);
          const color = riskColor(
            report.severity === "Critical"
              ? 90
              : report.severity === "High"
                ? 70
                : report.severity === "Medium"
                  ? 50
                  : 20
          );

          return (
            <CircleMarker
              key={`report-${report.id}`}
              center={[lat, lng]}
              radius={9}
              pathOptions={{
                color,
                fillColor: "#fff",
                fillOpacity: 1,
                weight: 4,
              }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <strong>{report.icon || "📍"} {report.type}</strong>
                  <div><b>Severity:</b> {report.severity}</div>
                  <div><b>Location:</b> {report.location}</div>
                  <div><b>Reporter:</b> {report.reporter}</div>
                  <div><b>Coordinates:</b> {lat.toFixed(5)}, {lng.toFixed(5)}</div>
                  <div style={{ marginTop: 6 }}>{report.description}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {showCenters &&
          DEMO_EMERGENCY_CENTERS.map((center) => (
            <Marker
              key={center.id}
              position={center.position}
              icon={emergencyIcon()}
            >
              <Popup>
                <strong>🆘 {center.name}</strong>
                <br />
                {center.location}
                <br />
                <small>NER-LOGIX demo coordination point</small>
              </Popup>
            </Marker>
          ))}

        <Polyline
          positions={RISK_CORRIDOR}
          pathOptions={{
            color: "#ef4444",
            weight: 5,
            opacity: showRisks ? 0.72 : 0.25,
            dashArray: "9 7",
          }}
        >
          <Popup>
            <strong>⚠️ High Risk Corridor</strong>
            <br />
            NH-13 / Tawang Corridor
            <br />
            Risk baseline: {safeNumber(riskScore, 69)}/100
          </Popup>
        </Polyline>

        {alternativePositions.length >= 2 && (
          <Polyline
            positions={alternativePositions}
            pathOptions={{
              color: "#dc2626",
              weight: 7,
              opacity: 0.82,
              dashArray: "14 9",
              lineCap: "round",
            }}
          >
            <Popup>
              <strong>🚨 Affected / Alternative Route</strong>
              <br />
              {affectedAlternative.name}
              <br />
              Risk: {safeNumber(affectedAlternative.risk_score)}/100
            </Popup>
          </Polyline>
        )}

        {emergencyMode && routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#0f766e",
              weight: 10,
              opacity: 0.98,
              dashArray: "18 8",
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Popup>
              <strong>🚨 Emergency-Accessible Route</strong>
              <br />
              {selectedRoute?.name || "Emergency route"}
              <br />
              Risk: {safeNumber(selectedRoute?.risk_score, "—")}/100
              <br />
              <small>Prioritized for essential-supply movement and avoidance of Critical/High incident zones when possible.</small>
            </Popup>
          </Polyline>
        )}

        {showSaferRoute && !emergencyMode && routePositions.length >= 2 && (
          <>
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#16a34a",
                weight: 8,
                opacity: 0.95,
                dashArray: "12 10",
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Popup>
                <strong>🧠 AI Safer Route</strong>
                <br />
                {selectedRoute?.name || "Optimized route"}
                <br />
                Risk: {safeNumber(selectedRoute?.risk_score, "—")}/100
              </Popup>
            </Polyline>

            {origin && (
              <CircleMarker
                center={origin}
                radius={10}
                pathOptions={{
                  color: "#16a34a",
                  fillColor: "#16a34a",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Popup><strong>🟢 Origin</strong></Popup>
              </CircleMarker>
            )}

            {destination && (
              <CircleMarker
                center={destination}
                radius={10}
                pathOptions={{
                  color: "#7c3aed",
                  fillColor: "#7c3aed",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Popup><strong>🟣 Destination</strong></Popup>
              </CircleMarker>
            )}
          </>
        )}

        {pickMode && origin && (
          <CircleMarker
            center={origin}
            radius={9}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.95,
              weight: 3,
            }}
          >
            <Popup><strong>🟦 Origin</strong></Popup>
          </CircleMarker>
        )}

        {pickMode && destination && (
          <CircleMarker
            center={destination}
            radius={9}
            pathOptions={{
              color: "#7c3aed",
              fillColor: "#7c3aed",
              fillOpacity: 0.95,
              weight: 3,
            }}
          >
            <Popup><strong>🟣 Destination</strong></Popup>
          </CircleMarker>
        )}

        {searchedPosition && (
          <CircleMarker
            center={searchedPosition}
            radius={9}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#60a5fa",
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup>
              <strong>🔍 Search result</strong>
              <br />
              {searchName}
            </Popup>
          </CircleMarker>
        )}

        <SearchControl onResult={handleSearch} />
      </MapContainer>

      <div
        className="ner-map-controls"
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 12,
          right: 12,
          width: "min(250px, calc(100% - 24px))",
          marginTop: 0,
          background: "#fff",
          border: "1px solid #dbe3ef",
          borderRadius: 12,
          padding: 10,
          boxShadow: "0 6px 20px rgba(15,23,42,.14)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
          🗺️ Map Controls
        </div>

        <button
          type="button"
          onClick={onEmergencyModeToggle}
          disabled={!onEmergencyModeToggle}
          style={{
            width: "100%",
            border: emergencyMode ? "2px solid #0f766e" : "1px solid #fecaca",
            background: emergencyMode ? "#ecfdf5" : "#fff7ed",
            color: emergencyMode ? "#065f46" : "#b91c1c",
            borderRadius: 9,
            padding: "9px 8px",
            fontSize: 11,
            fontWeight: 800,
            cursor: onEmergencyModeToggle ? "pointer" : "default",
            marginBottom: 8,
          }}
        >
          {emergencyMode ? "🚨 Emergency Mode: ON" : "🚨 Emergency Mode"}
        </button>

        {emergencyMode && (
          <div style={{ fontSize: 10, lineHeight: 1.45, padding: "7px 8px", borderRadius: 8, background: "#ecfdf5", color: "#065f46", marginBottom: 8 }}>
            <b>Emergency routing active</b><br />
            Accessible routes first · high-risk roads avoided · essential supplies prioritized
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            ["osm", "OpenStreetMap"],
            ["hot", "OSM Humanitarian"],
            ["satellite", "Satellite"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBaseLayer(key)}
              style={{
                border: baseLayer === key ? "2px solid #2563eb" : "1px solid #dbe3ef",
                background: baseLayer === key ? "#eff6ff" : "#fff",
                borderRadius: 8,
                padding: "7px 6px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
          {[
            ["showRisks", "🟠 Risk Zones", showRisks, setShowRisks],
            ["showAlerts", "🚨 Alerts", showAlerts, setShowAlerts],
            ["showVehicles", "🚚 Vehicles", showVehicles, setShowVehicles],
            ["showCenters", "🆘 Emergency Centers", showCenters, setShowCenters],
          ].map(([, label, value, setter]) => (
            <label
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div
        className="ner-map-legend"
        style={{
          position: "absolute",
          zIndex: 999,
          bottom: 10,
          left: 10,
          background: "rgba(255,255,255,.94)",
          border: "1px solid #dbe3ef",
          borderRadius: 10,
          padding: "7px 10px",
          fontSize: 10,
          boxShadow: "0 3px 12px rgba(15,23,42,.1)",
        }}
      >
        <b>Legend:</b>{" "}
        <span style={{ color: "#16a34a" }}>● Safe</span>{" "}
        <span style={{ color: "#f59e0b" }}>● Medium</span>{" "}
        <span style={{ color: "#dc2626" }}>● High/Critical</span>{" "}
        <span>· 🚚 Fleet · 🚨 Alerts · 🧠 Green route = AI selected{emergencyMode ? " · 🚨 Teal route = Emergency-accessible" : ""}</span>
      </div>
    </div>
    </>
  );
}
