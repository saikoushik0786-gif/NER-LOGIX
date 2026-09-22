import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
try {
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
} catch (_) {}

// Default NER location
const DEFAULT_POSITION = [27.586, 91.859];

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));

      onLocationSelect(latitude, longitude);
    },
  });

  return null;
}

function MapCenterUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return null;
}

export default function FieldReportMapPicker({
  latitude,
  longitude,
  onLocationSelect,
}) {
  const initialPosition =
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude))
      ? [Number(latitude), Number(longitude)]
      : DEFAULT_POSITION;

  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      setPosition([lat, lng]);
    }
  }, [latitude, longitude]);

  const handleLocationSelect = (lat, lng) => {
    const newPosition = [lat, lng];

    setPosition(newPosition);

    if (onLocationSelect) {
      onLocationSelect(lat, lng);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #dbe3ef",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>
          <strong style={{ color: "#0f172a" }}>
            📍 Select Report Location
          </strong>

          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 3,
            }}
          >
            Click anywhere on the map to set coordinates
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#2563eb",
            background: "#eff6ff",
            padding: "6px 9px",
            borderRadius: 8,
            whiteSpace: "nowrap",
          }}
        >
          CLICK MAP
        </div>
      </div>

      <MapContainer
        center={position}
        zoom={8}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "360px",
          minHeight: "360px",
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          onLocationSelect={handleLocationSelect}
        />

        <MapCenterUpdater position={position} />

        <Marker position={position} />
      </MapContainer>

      <div
        style={{
          padding: "9px 14px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        <span>
          <strong>Latitude:</strong>{" "}
          {Number(position[0]).toFixed(6)}
        </span>

        <span>
          <strong>Longitude:</strong>{" "}
          {Number(position[1]).toFixed(6)}
        </span>
      </div>
    </div>
  );
}