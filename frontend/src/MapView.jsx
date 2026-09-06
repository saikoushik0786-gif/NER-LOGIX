import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons in React/Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const locations = [
  {
    name: "Guwahati",
    position: [26.1445, 91.7362],
    status: "Safe",
  },
  {
    name: "Shillong",
    position: [25.5788, 91.8933],
    status: "Safe",
  },
  {
    name: "Itanagar",
    position: [27.0844, 93.6053],
    status: "Safe",
  },
  {
    name: "Tawang",
    position: [27.586, 91.859],
    status: "High Risk",
  },
];

const vehicles = [
  {
    id: "NER-MED-104",
    position: [26.65, 92.35],
    cargo: "Medicine",
    route: "Guwahati → Tawang",
  },
  {
    id: "NER-FD-208",
    position: [25.75, 91.75],
    cargo: "Food Supplies",
    route: "Shillong → Cherrapunji",
  },
];

const riskyRoad = [
  [26.1445, 91.7362],
  [26.5, 92.2],
  [27.0, 92.7],
  [27.586, 91.859],
];

function MapView() {
  return (
    <MapContainer
      center={[26.7, 92.0]}
      zoom={6}
      scrollWheelZoom={true}
      className="real-map"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Locations */}
      {locations.map((location) => (
        <Marker key={location.name} position={location.position}>
          <Popup>
            <strong>{location.name}</strong>
            <br />
            Status: {location.status}
          </Popup>
        </Marker>
      ))}

      {/* Vehicles */}
      {vehicles.map((vehicle) => (
        <Marker key={vehicle.id} position={vehicle.position}>
          <Popup>
            <strong>🚚 {vehicle.id}</strong>
            <br />
            Cargo: {vehicle.cargo}
            <br />
            Route: {vehicle.route}
          </Popup>
        </Marker>
      ))}

      {/* Risk corridor */}
      <Polyline
        positions={riskyRoad}
        pathOptions={{
          color: "#ef6666",
          weight: 6,
          opacity: 0.85,
        }}
      >
        <Popup>
          <strong>⚠️ High Risk Corridor</strong>
          <br />
          NH-13 / Tawang Corridor
        </Popup>
      </Polyline>
    </MapContainer>
  );
}

export default MapView;