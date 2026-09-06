import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const STORAGE = {
  reports: "ner-logix-field-reports-v2",
  alerts: "ner-logix-alerts-v2",
  emergencies: "ner-logix-emergencies-v2",
  lastSync: "ner-logix-last-sync-v2",
};

// Leaflet marker fix
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
} catch (_) {}

const locations = [
  { name: "Guwahati", position: [26.1445, 91.7362], status: "Safe", risk: 22 },
  { name: "Shillong", position: [25.5788, 91.8933], status: "Safe", risk: 28 },
  { name: "Itanagar", position: [27.0844, 93.6053], status: "Moderate", risk: 51 },
  { name: "Tawang", position: [27.586, 91.859], status: "High Risk", risk: 69 },
  { name: "Bomdila", position: [27.264, 92.424], status: "Moderate", risk: 55 },
];

const initialVehicles = [
  { id: "NER-MED-104", position: [26.65, 92.35], cargo: "Medicine", cargoIcon: "💊", route: "Guwahati → Tawang", status: "Moving", speed: 42, fuel: 74, etaMinutes: 780, totalDistanceKm: 470, distanceTravelledKm: 280, riskScore: 42, driver: "Field Unit 104" },
  { id: "NER-FD-208", position: [25.75, 91.75], cargo: "Food Supplies", cargoIcon: "📦", route: "Shillong → Cherrapunji", status: "Moving", speed: 36, fuel: 82, etaMinutes: 95, totalDistanceKm: 55, distanceTravelledKm: 30, riskScore: 24, driver: "Field Unit 208" },
  { id: "NER-AG-312", position: [27.0, 93.2], cargo: "Agricultural Supplies", cargoIcon: "🌾", route: "Itanagar → Bomdila", status: "Moving", speed: 31, fuel: 61, etaMinutes: 260, totalDistanceKm: 190, distanceTravelledKm: 95, riskScore: 51, driver: "Field Unit 312" },
];

const routeCandidates = [
  { route_id: "R1", name: "NH-13 Direct Route", distance_km: 450, estimated_minutes: 900, delay_minutes: 120, risk_score: 78, road_condition: "Poor" },
  { route_id: "R2", name: "Guwahati - Tezpur - Bomdila - Tawang", distance_km: 470, estimated_minutes: 870, delay_minutes: 35, risk_score: 42, road_condition: "Good" },
  { route_id: "R3", name: "Alternate Mountain Route", distance_km: 495, estimated_minutes: 960, delay_minutes: 70, risk_score: 55, road_condition: "Moderate" },
];

const riskyRoad = [[26.1445,91.7362],[26.5,92.2],[27.0,92.7],[27.586,91.859]];

const initialAlerts = [
  { id: 1, type: "Landslide Risk Detected", icon: "⚠️", severity: "Critical", location: "NH-13 · Tawang", description: "Landslide probability is high. Alternate routing is recommended.", time: "5 min ago", status: "Open" },
  { id: 2, type: "Heavy Rainfall", icon: "🌧️", severity: "High", location: "West Kameng District", description: "Heavy rainfall may affect road accessibility and delivery times.", time: "18 min ago", status: "Open" },
  { id: 3, type: "Delivery Delayed", icon: "🚚", severity: "Medium", location: "Medicine · NER-MED-104", description: "Medicine delivery is experiencing an expected route delay.", time: "32 min ago", status: "Open" },
  { id: 4, type: "GPS Tracking Active", icon: "📡", severity: "Low", location: "Fleet telemetry", description: "Vehicle GPS telemetry is synchronized across the monitored fleet.", time: "Now", status: "Open" },
];

const initialReports = [
  { id: 101, type: "Landslide", icon: "⛰️", severity: "Critical", location: "Tawang, Arunachal Pradesh", reporter: "Field Unit 104", latitude: "27.5860", longitude: "91.8590", description: "Loose rock and soil observed near the NH-13 corridor. Alternate routing recommended.", time: "Today, 20:10", status: "Open", syncStatus: "Synced" },
  { id: 102, type: "Road Damage", icon: "🛣️", severity: "High", location: "West Kameng District", reporter: "Field Unit 208", latitude: "27.2640", longitude: "92.4240", description: "Road surface damaged after heavy rainfall. Heavy vehicles should proceed with caution.", time: "Today, 19:42", status: "Open", syncStatus: "Synced" },
];

const initialEmergencies = [
  { id: 9001, type: "Landslide", icon: "⛰️", severity: "Critical", location: "Tawang, Arunachal Pradesh", message: "Loose rock reported near NH-13. Avoid the affected corridor and use the safer route.", time: "5 min ago", status: "Escalated" },
  { id: 9002, type: "Heavy Rainfall", icon: "🌧️", severity: "High", location: "West Kameng District", message: "Heavy rainfall may reduce road accessibility. Monitor the corridor and prepare alternate routing.", time: "18 min ago", status: "Acknowledged" },
];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) { return fallback; }
}
function writeStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function formatTravelTime(minutes) { const m=Math.max(0,Math.round(minutes)); const h=Math.floor(m/60); return h ? `${h}h ${m%60}m` : `${m} min`; }
function riskLabel(score) { if(score>=80)return "Critical"; if(score>=60)return "High"; if(score>=40)return "Medium"; return "Low"; }
function riskClass(score) { return score>=60 ? "danger" : score>=40 ? "warning" : "positive"; }
function progress(v) { return v.totalDistanceKm ? Math.min(100,Math.round(v.distanceTravelledKm/v.totalDistanceKm*100)) : 0; }
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function routeScore(r) {
  const risk = safeNumber(r?.risk_score, 0);
  const distance = Math.max(0, safeNumber(r?.distance_km, 0));
  const delay = Math.max(0, safeNumber(r?.delay_minutes, 0));
  return Number((risk * 0.70 + Math.min(distance, 500) * 0.05 + Math.min(delay, 180) * 0.25).toFixed(2));
}
function iconFor(type) { return ({Landslide:"⛰️",Flood:"🌊","Road Blockage":"🚧","Heavy Rainfall":"🌧️","Vehicle Incident":"🚚","Medical Emergency":"🏥","Road Damage":"🛣️",Other:"📍"}[type]||"🚨"); }
function sevClass(s) { return s==="Critical"||s==="High" ? "danger" : s==="Medium" ? "warning" : "positive"; }
function usePersistent(key, fallback) { const [value,setValue]=useState(()=>readStorage(key,fallback)); useEffect(()=>writeStorage(key,value),[key,value]); return [value,setValue]; }

function Header({ title, subtitle, language, setLanguage, alertCount, setPage, isOnline, backendOnline, pendingSyncCount }) {
  return <header className="header" style={{alignItems:"center"}}>
    <div><div className="region-title">NORTH EASTERN REGION · NER-LOGIX</div><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="header-actions" style={{gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
      <span style={{padding:"7px 11px",borderRadius:999,background:isOnline?"#ecfdf5":"#fff7ed",border:`1px solid ${isOnline?"#bbf7d0":"#fed7aa"}`,fontSize:12,fontWeight:700}}>{isOnline?"● ONLINE":"● OFFLINE"}{pendingSyncCount>0?` · ${pendingSyncCount} pending`:""}</span>
      <button className="language-button" onClick={()=>setLanguage(language==="EN"?"HI":language==="HI"?"AS":"EN")}>🌐 {language}</button>
      <button className="notification-button" onClick={()=>setPage("Alerts")}>🔔 {alertCount}</button>
      <div className="profile">KO</div>
    </div>
  </header>;
}

function Shell({children, page, setPage, alertCount, language, setLanguage, isOnline, backendOnline, pendingSyncCount, title, subtitle}) {
  const menu=[ ["📊","Dashboard"],["🗺️","Live Map"],["🚚","Vehicles"],["⚠️","Risk Analysis"],["🧭","Route Optimizer"],["🚨","Alerts"],["📍","Field Reports"],["📈","Analytics"],["🆘","Emergency Center"] ];
  return <div className="app">
    <aside className="sidebar" style={{display:"flex",flexDirection:"column"}}>
      <div className="brand"><div className="brand-logo">NL</div><div><h2>NER-LOGIX</h2><span>Smart Logistics</span></div></div>
      <nav>{menu.map(([icon,name])=><button key={name} className={`menu-item ${page===name?"active":""}`} onClick={()=>setPage(name)}><span>{icon}</span>{name}{name==="Alerts"&&alertCount>0?<b style={{marginLeft:"auto",fontSize:11}}>{alertCount}</b>:null}</button>)}</nav>
      <div style={{marginTop:"auto"}}>
        <div className="system-status"><div className="status-dot" style={{background:backendOnline?"#22c55e":"#f59e0b"}}></div><div><strong>{backendOnline?"AI Engine Online":"AI Engine Offline"}</strong><small>{isOnline?"Network connected":"Local offline mode"}</small></div></div>
        <div style={{marginTop:10,padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,.06)",fontSize:11,lineHeight:1.5}}><b>Demo Control</b><br/>Local simulation · GIS · AI risk · GPS</div>
      </div>
    </aside>
    <main className="main"><Header {...{title,subtitle,language,setLanguage,alertCount,setPage,isOnline,backendOnline,pendingSyncCount}} />{children}</main>
  </div>;
}

function MapAutoFit({positions,enabled=true}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !positions || positions.length < 2) return;
    map.fitBounds(positions, { padding: [35, 35], maxZoom: 10 });
  }, [map, enabled, positions]);
  return null;
}

function MapPickHandler({enabled, onPick}) {
  useMapEvents({
    click(e) {
      if (!enabled || !onPick) return;
      onPick([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]);
    },
  });
  return null;
}

function MapView({vehicles,riskScore,showSaferRoute,selectedRoute,compact=false,routeGeometry=[],origin=null,destination=null,pickMode=null,onMapPick=null}) {
  const routePositions = Array.isArray(routeGeometry)
    ? routeGeometry.filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])))
    : [];
  const hasRoute = routePositions.length >= 2;
  const routeStart = hasRoute ? routePositions[0] : origin;
  const routeEnd = hasRoute ? routePositions[routePositions.length - 1] : destination;
  const waypointIndexes = hasRoute
    ? [0, Math.floor(routePositions.length * 0.25), Math.floor(routePositions.length * 0.5), Math.floor(routePositions.length * 0.75), routePositions.length - 1]
        .filter((v, i, a) => v >= 0 && v < routePositions.length && a.indexOf(v) === i)
    : [];

  return <MapContainer center={origin || [26.7,92]} zoom={compact?6:6} scrollWheelZoom className="real-map" style={{height:compact?430:500,borderRadius:14,cursor:pickMode?"crosshair":"grab"}}>
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapPickHandler enabled={!!pickMode} onPick={onMapPick} />

    {locations.map(l=><Marker key={l.name} position={l.position}><Popup><b>{l.name}</b><br/>Status: {l.status}<br/>Risk: {l.risk}/100</Popup></Marker>)}
    {vehicles.map(v=><Marker key={v.id} position={v.position}><Popup><b>🚚 {v.id}</b><br/>Cargo: {v.cargo}<br/>Route: {v.route}<br/>Speed: {v.speed} km/h<br/>Fuel: {v.fuel}%<br/>Risk: {v.riskScore}/100<br/>ETA: {formatTravelTime(v.etaMinutes)}<br/>GPS: Active</Popup></Marker>)}

    <Polyline positions={riskyRoad} pathOptions={{color:"#ef4444",weight:6,opacity:.8}}>
      <Popup><b>⚠️ High Risk Corridor</b><br/>NH-13 / Tawang · Risk {safeNumber(riskScore,69)}/100</Popup>
    </Polyline>

    {/* ONE shared AI route layer. Dashboard and Route Optimizer use this exact geometry. */}
    {showSaferRoute && hasRoute && <>
      <Polyline positions={routePositions} pathOptions={{color:"#16a34a",weight:8,opacity:1,dashArray:"12 10",lineCap:"round",lineJoin:"round"}}>
        <Popup><b>🧠 AI Safer Route</b><br/>{selectedRoute?.name || "Optimized route"}<br/>Risk {safeNumber(selectedRoute?.risk_score,"—")}/100</Popup>
      </Polyline>
      {waypointIndexes.map((idx)=><CircleMarker key={`route-point-${idx}`} center={routePositions[idx]} radius={5} pathOptions={{color:"#16a34a",fillColor:"#ffffff",fillOpacity:1,weight:3}} />)}
      <CircleMarker center={routeStart} radius={10} pathOptions={{color:"#16a34a",fillColor:"#16a34a",fillOpacity:1,weight:3}}><Popup><b>🟢 Route Start</b></Popup></CircleMarker>
      <CircleMarker center={routeEnd} radius={10} pathOptions={{color:"#16a34a",fillColor:"#16a34a",fillOpacity:1,weight:3}}><Popup><b>🟢 Route Destination</b></Popup></CircleMarker>
    </>}

    {!showSaferRoute && locations.map(l=><CircleMarker key={`r-${l.name}`} center={l.position} radius={Math.max(5,Math.min(13,safeNumber(l.risk,0)/7))} pathOptions={{color:l.risk>=60?"#ef4444":l.risk>=40?"#f59e0b":"#22c55e",fillOpacity:.18}} />)}

    {pickMode && origin && <CircleMarker center={origin} radius={9} pathOptions={{color:"#2563eb",fillColor:"#2563eb",fillOpacity:.95,weight:3}}><Popup><b>🟦 Origin</b></Popup></CircleMarker>}
    {pickMode && destination && <CircleMarker center={destination} radius={9} pathOptions={{color:"#7c3aed",fillColor:"#7c3aed",fillOpacity:.95,weight:3}}><Popup><b>🟣 Destination</b></Popup></CircleMarker>}
    {hasRoute && <MapAutoFit positions={routePositions} enabled={true} />}
  </MapContainer>;
}

function Dashboard({vehicles,alerts,riskScore,riskLevel,riskFactors,recommendation,backendOnline,aiLoading,aiError,fetchRisk,findRoute,routeLoading,selectedRoute,routeGeometry,origin,destination,setPage,isOnline,pendingSyncCount}) {
  const active=alerts.filter(a=>a.status==="Open").length; const moving=vehicles.filter(v=>v.status==="Moving").length;
  const displayRiskScore=selectedRoute ? safeNumber(selectedRoute.risk_score,riskScore) : safeNumber(riskScore,69);
  const displayRiskLevel=selectedRoute ? riskLabel(displayRiskScore) : riskLevel;
  const avgFuel=Math.round(vehicles.reduce((s,v)=>s+v.fuel,0)/vehicles.length); const avgRisk=Math.round(vehicles.reduce((s,v)=>s+v.riskScore,0)/vehicles.length);
  return <>
    {!isOnline&&<div style={{marginBottom:16,padding:"13px 16px",borderRadius:14,background:"#fff7ed",border:"1px solid #fed7aa",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b>🟠 Offline Mode Active</b><span>Field updates remain on this device. {pendingSyncCount} report(s) waiting for sync.</span></div>}
    <section className="stats-grid">
      {[ ["🚚","Active Vehicles",vehicles.length,`${moving} moving`],["🛣️","Accessible Roads","87%","Across monitored districts"],["⚠️","High Risk Corridors","07","Requires attention"],["🚨","Active Alerts",active,"Real-time response queue"],["⛽","Average Fuel",`${avgFuel}%`,"Fleet average"],["🧠",selectedRoute?"Route AI Risk":"AI Risk",`${displayRiskScore}/100`,displayRiskLevel] ].map(([i,l,v,s],idx)=><div className="stat-card" key={l}><div className="stat-icon">{i}</div><div><span>{l}</span><strong className={idx===3||(idx===5&&displayRiskScore>=60)?"danger":""}>{v}</strong><small>{s}</small></div></div>)}
    </section>
    <section className="content-grid">
      <div className="panel map-panel"><div className="panel-header"><div><h2>🗺️ Regional Operations Map</h2><p>Live GIS view · corridors · fleet · risk zones</p></div><span className="live-badge">● LIVE GIS</span></div><MapView vehicles={vehicles} riskScore={riskScore} showSaferRoute={routeGeometry.length >= 2} selectedRoute={selectedRoute} routeGeometry={routeGeometry} origin={origin} destination={destination}/><div className="map-legend"><span>🟢 Safe</span><span>🟠 Moderate</span><span>🔴 High Risk</span><span>🟢┄ AI Safer Route · green waypoints</span></div></div>
      <div className="panel risk-panel"><div className="panel-header"><div><h2>🤖 AI Risk Command</h2><p>NH-13 · Tawang corridor</p></div>{backendOnline&&<span className="live-badge">● AI LIVE</span>}</div>
        {aiError&&<div className="route-message">⚠️ {aiError}</div>}
        <div className="risk-score"><div className="score-circle"><strong>{aiLoading?"--":displayRiskScore}</strong><span>/100</span></div><div><h2 className={riskClass(displayRiskScore)}>{aiLoading?"Analyzing...":`${displayRiskLevel} Risk`}</h2><p>{selectedRoute?"Selected route safety assessment":"Current corridor assessment"}</p></div></div>
        <div className="risk-factors">{[["🌧️","Rainfall",riskFactors.rainfall],["⛰️","Landslide",riskFactors.landslide_history],["🚗","Traffic",riskFactors.traffic],["🛣️","Road Damage",riskFactors.road_damage],["🏔️","Terrain",riskFactors.terrain]].map(([i,n,v])=><div key={n}><span>{i} {n}</span><strong className={riskClass(v)}>{v>=70?"High":v>=40?"Medium":"Low"}</strong></div>)}</div>
        <div className="route-message"><b>💡 AI Recommendation</b><p>{recommendation}</p>{selectedRoute&&<small style={{display:"block",marginTop:8,fontWeight:700}}>Route risk: {displayRiskScore}/100 · Corridor baseline: {safeNumber(riskScore,69)}/100</small>}</div>
        <button className="route-button" onClick={fetchRisk} disabled={aiLoading}>{aiLoading?"🤖 Analyzing...":"🔄 Refresh AI Assessment"}</button>
        <button className="route-button" onClick={findRoute} disabled={routeLoading} style={{marginTop:9}}>{routeLoading?"🧠 Optimizing...":"🧭 Find Safer Route"}</button>
        {selectedRoute&&<div style={{marginTop:14,padding:14,borderRadius:12,background:"#f0fdf4",border:"1px solid #bbf7d0"}}><b>🧠 Selected: {selectedRoute.route_id}</b><div style={{marginTop:6,fontWeight:700}}>{selectedRoute.name}</div><small>{safeNumber(selectedRoute.distance_km,0).toFixed(1)} km · {formatTravelTime(safeNumber(selectedRoute.estimated_minutes,0))} · +{safeNumber(selectedRoute.delay_minutes,0)} min · Risk {safeNumber(selectedRoute.risk_score,0)}/100</small></div>}
      </div>
    </section>
    <section className="bottom-grid">
      <div className="panel"><div className="panel-header"><div><h2>🚚 Fleet Command</h2><p>Live logistics telemetry</p></div><button className="view-button" onClick={()=>setPage("Vehicles")}>View All</button></div>{vehicles.map(v=><div className="vehicle-row" key={v.id}><div className="vehicle-icon">🚚</div><div className="vehicle-info"><strong>{v.id}</strong><span>{v.cargo}</span></div><div className="vehicle-route">{v.route}</div><div className="vehicle-status">● {v.status}</div><b>{progress(v)}%</b></div>)}</div>
      <div className="panel"><div className="panel-header"><div><h2>🚨 Response Queue</h2><p>Latest accessibility events</p></div><button className="view-button" onClick={()=>setPage("Alerts")}>View All</button></div>{alerts.slice(0,4).map(a=><div className={`alert-row ${a.severity==="Critical"?"critical":a.severity==="Low"?"info":"warning"}`} key={a.id}><div className="alert-icon">{a.icon}</div><div><strong>{a.type}</strong><span>{a.location}</span></div><small>{a.time}</small></div>)}</div>
    </section>
  </>;
}

function GenericMapPage({vehicles,riskScore,selectedRoute,setPage,routeGeometry,origin,destination}) { return <div className="panel"><div className="panel-header"><div><h2>🗺️ Live Regional Map</h2><p>GIS operations view with vehicles, risk corridors and AI alternate routing</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div><MapView vehicles={vehicles} riskScore={riskScore} showSaferRoute={routeGeometry.length >= 2} selectedRoute={selectedRoute} routeGeometry={routeGeometry} origin={origin} destination={destination}/><div className="route-message" style={{marginTop:14}}><b>Map intelligence</b><p>Red corridor indicates elevated risk. Green dashed corridor represents the AI-selected route. Use Route Optimizer to choose any monitored location or click directly on the map to set endpoints.</p></div></div>; }

function VehiclesPage({vehicles,setPage}) { return <div className="panel"><div className="panel-header"><div><h2>🚚 Fleet & GPS Command</h2><p>Live logistics vehicle telemetry across monitored corridors</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginTop:18}}>{vehicles.map(v=><div key={v.id} style={{border:"1px solid #e5e7eb",borderRadius:16,padding:18,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><h3 style={{margin:"0 0 4px"}}>🚚 {v.id}</h3><small>{v.driver}</small></div><span className="live-badge">● LIVE</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:18}}>{[["Cargo",`${v.cargoIcon} ${v.cargo}`],["Status",v.status],["Speed",`${v.speed} km/h`],["Fuel",`${v.fuel}%`],["ETA",formatTravelTime(v.etaMinutes)],["Risk",`${v.riskScore}/100 · ${riskLabel(v.riskScore)}`]].map(([a,b])=><div key={a}><small>{a}</small><div className={a==="Risk"?riskClass(v.riskScore):""} style={{fontWeight:600}}>{b}</div></div>)}</div><div style={{marginTop:16}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span>Delivery progress</span><b>{progress(v)}%</b></div><div style={{height:8,background:"#e5e7eb",borderRadius:10,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:`${progress(v)}%`,background:"#2563eb"}}/></div></div><div style={{marginTop:14,fontSize:12,color:"#6b7280"}}>📍 {v.position[0].toFixed(4)}, {v.position[1].toFixed(4)}</div></div>)}</div></div>; }

function RiskPage({riskScore,riskLevel,riskFactors,recommendation,fetchRisk,aiLoading,backendOnline,setPage}) { return <div className="panel"><div className="panel-header"><div><h2>⚠️ AI Risk Analysis</h2><p>Explainable corridor risk assessment from the FastAPI risk engine</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div><div style={{display:"grid",gridTemplateColumns:"minmax(250px,.7fr) minmax(320px,1.3fr)",gap:20,marginTop:20}}><div style={{display:"grid",placeItems:"center",padding:20}}><div className="score-circle" style={{width:190,height:190}}><strong>{aiLoading?"--":riskScore}</strong><span>/100</span></div><h2 className={riskClass(riskScore)} style={{marginTop:15}}>{riskLevel} Risk</h2><span>{backendOnline?"● Connected to FastAPI":"● Backend unavailable"}</span></div><div><h3>Risk factor breakdown</h3>{Object.entries(riskFactors).map(([k,v])=><div key={k} style={{margin:"18px 0"}}><div style={{display:"flex",justifyContent:"space-between"}}><b>{k.replaceAll("_"," ")}</b><b>{v}/100</b></div><div style={{height:11,background:"#e5e7eb",borderRadius:8,marginTop:6}}><div style={{height:"100%",width:`${v}%`,background:v>=70?"#ef4444":v>=40?"#f59e0b":"#22c55e",borderRadius:8}}/></div></div>)}<div className="route-message"><b>🤖 Recommendation</b><p>{recommendation}</p></div><button className="route-button" onClick={fetchRisk} disabled={aiLoading}>{aiLoading?"Analyzing...":"Run Fresh Prediction"}</button></div></div></div>; }

function RoutePage({vehicles,riskScore,selectedRoute,alternatives,findRoute,loading,setPage,originName,destinationName,setOriginName,setDestinationName,origin,destination,routeGeometry,routeDistance,routeDuration,routeError,pickMode,setPickMode,onMapPick,setOrigin,setDestination,setSelectedRoute,setAlternatives,setRouteGeometry,setRouteDistance,setRouteDuration,setRouteError}) {
  const endpointOptions = locations.map(l => l.name);
  return <div className="panel">
    <div className="panel-header"><div><h2>🧭 AI Route Optimizer</h2><p>Choose endpoints, calculate a real road route, then score it for safety, delay and accessibility.</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14,marginTop:18}}>
      <div className="form-group"><label>Origin</label><select value={endpointOptions.includes(originName)?originName:""} onChange={e=>{const value=e.target.value;const loc=locations.find(l=>l.name===value);if(loc){setOriginName(loc.name);setOrigin(loc.position);setRouteGeometry([]);setRouteDistance(0);setRouteDuration(0);setSelectedRoute(null);setAlternatives([]);setRouteError("");}setPickMode(null)}}><option value="">Select origin</option>{endpointOptions.map(x=><option key={x}>{x}</option>)}</select><button className="view-button" onClick={()=>setPickMode("origin")} style={{marginTop:7,width:"100%"}}>{pickMode==="origin"?"📍 Click map to set origin":"📍 Pick origin from map"}</button></div>
      <div className="form-group"><label>Destination</label><select value={endpointOptions.includes(destinationName)?destinationName:""} onChange={e=>{const value=e.target.value;const loc=locations.find(l=>l.name===value);if(loc){setDestinationName(loc.name);setDestination(loc.position);setRouteGeometry([]);setRouteDistance(0);setRouteDuration(0);setSelectedRoute(null);setAlternatives([]);setRouteError("");}setPickMode(null)}}><option value="">Select destination</option>{endpointOptions.map(x=><option key={x}>{x}</option>)}</select><button className="view-button" onClick={()=>setPickMode("destination")} style={{marginTop:7,width:"100%"}}>{pickMode==="destination"?"📍 Click map to set destination":"📍 Pick destination from map"}</button></div>
    </div>
    {pickMode&&<div className="route-message"><b>📍 Map selection active</b><p>Click anywhere on the map to set the {pickMode}. The selected coordinates will be used for routing.</p></div>}
    <MapView vehicles={vehicles} riskScore={riskScore} showSaferRoute={routeGeometry.length >= 2} selectedRoute={selectedRoute} routeGeometry={routeGeometry} origin={origin} destination={destination} compact pickMode={pickMode} onMapPick={onMapPick}/>
    <button className="route-button" onClick={()=>findRoute(origin,destination)} disabled={loading || !origin || !destination} style={{marginTop:14}}>{loading?"🧠 Calculating road route...":"🧭 Get Route & AI Safety Score"}</button>
    {routeError&&<div className="route-message" style={{marginTop:12}}><b>⚠️ Routing service note</b><p>{routeError}</p></div>}
    {selectedRoute&&<div className="route-message" style={{marginTop:15}}><b>🏆 Recommended route</b><h3>{selectedRoute.name}</h3><p>{routeDistance?`${routeDistance.toFixed(1)} km · ${formatTravelTime(routeDuration)}`:`${selectedRoute.distance_km} km · ${formatTravelTime(selectedRoute.estimated_minutes)}`} · Risk {selectedRoute.risk_score}/100 · Optimization score {selectedRoute.optimization_score}</p></div>}
    <div style={{display:"grid",gap:12,marginTop:18}}>{(alternatives.length?alternatives:routeCandidates.map(r=>({...r,optimization_score:routeScore(r)}))).map(r=><div key={r.route_id} style={{border:"1px solid #e5e7eb",borderRadius:14,padding:16,background:r.route_id===selectedRoute?.route_id?"#f0fdf4":"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b>{r.route_id} · {r.name}</b><span className={riskClass(r.risk_score)}>{riskLabel(r.risk_score)} · {r.risk_score}/100</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:12,fontSize:13}}><span>📏 {Number(r.distance_km).toFixed(1)} km</span><span>⏱️ {formatTravelTime(r.estimated_minutes)}</span><span>⏳ +{r.delay_minutes} min</span><span>🛣️ {r.road_condition}</span></div></div>)}</div>
  </div>;
}

function AlertsPage({alerts,resolve,refresh,setPage}) { const [filter,setFilter]=useState("All"); const list=filter==="All"?alerts:alerts.filter(a=>a.severity===filter); const counts={Open:alerts.filter(a=>a.status==="Open").length,Critical:alerts.filter(a=>a.status==="Open"&&a.severity==="Critical").length,High:alerts.filter(a=>a.status==="Open"&&a.severity==="High").length}; return <><div className="panel"><div className="panel-header"><div><h2>🚨 Alerts & Notifications</h2><p>Centralized logistics, accessibility and emergency response queue</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div><div className="stats-grid" style={{marginTop:18}}>{[["🔔","Open Alerts",counts.Open,"Active"],["🔴","Critical",counts.Critical,"Immediate attention"],["🟠","High",counts.High,"Needs monitoring"]].map(x=><div className="stat-card" key={x[1]}><div className="stat-icon">{x[0]}</div><div><span>{x[1]}</span><strong>{x[2]}</strong><small>{x[3]}</small></div></div>)}</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:18}}>{["All","Critical","High","Medium","Low"].map(f=><button className="view-button" key={f} onClick={()=>setFilter(f)} style={{fontWeight:filter===f?800:500,border:filter===f?"2px solid #2563eb":"1px solid #e5e7eb"}}>{f}</button>)}<button className="route-button" onClick={refresh} style={{marginLeft:"auto"}}>🔄 Refresh</button></div></div><div className="panel" style={{marginTop:18}}>{list.map(a=><div className={`alert-row ${a.severity==="Critical"?"critical":a.severity==="Low"?"info":"warning"}`} key={a.id} style={{marginBottom:10,opacity:a.status==="Resolved"?.55:1}}><div className="alert-icon">{a.icon}</div><div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><strong>{a.type}</strong><span className={sevClass(a.severity)}>{a.severity}</span><span>{a.status}</span></div><span>{a.location}</span><small style={{display:"block",marginTop:4}}>{a.description}</small></div><div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}><small>{a.time}</small>{a.status==="Open"&&<button className="view-button" onClick={()=>resolve(a.id)}>✓ Resolve</button>}</div></div>)}</div></>; }

function FieldReports({reports,setReports,alerts,setAlerts,isOnline,pendingSyncCount,syncNow,lastSync,reportForm,setReportForm,setPage}) { const submit=e=>{e.preventDefault();const id=Date.now();const r={id,...reportForm,icon:iconFor(reportForm.type),time:"Just now",status:"Open",syncStatus:isOnline?"Synced":"Pending"};setReports(x=>[r,...x]);if(["High","Critical"].includes(r.severity))setAlerts(x=>[{id:id+1,type:`Field Report: ${r.type}`,icon:r.icon,severity:r.severity,location:r.location,description:r.description,time:"Just now",status:"Open"},...x]);setReportForm(x=>({...x,description:""}));};return <><div className="panel"><div className="panel-header"><div><h2>📍 Field Intelligence</h2><p>Geo-tagged incident reporting with offline-first synchronization</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div><div style={{marginTop:16,padding:14,borderRadius:13,background:isOnline?"#f0fdf4":"#fff7ed",border:`1px solid ${isOnline?"#bbf7d0":"#fed7aa"}`,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><b>{isOnline?"🟢 Online & Sync Ready":"🟠 Offline & Saving Locally"}</b><div style={{fontSize:12,marginTop:4}}>{pendingSyncCount} pending report(s) · {lastSync?`Last sync ${new Date(lastSync).toLocaleString()}`:"No sync recorded"}</div></div><button className="route-button" onClick={syncNow} disabled={!isOnline||pendingSyncCount===0}>🔄 Sync {pendingSyncCount?`(${pendingSyncCount})`:""}</button></div></div><div style={{display:"grid",gridTemplateColumns:"minmax(320px,.85fr) minmax(400px,1.4fr)",gap:18,marginTop:18}}><div className="panel"><h2>📝 New Field Report</h2><p>Submit road, weather or accessibility intelligence</p><form onSubmit={submit} style={{marginTop:16}}>{[["Incident Type","type",["Road Blockage","Landslide","Flood","Heavy Rainfall","Road Damage","Vehicle Incident","Other"]],["Severity","severity",["Low","Medium","High","Critical"]]].map(([l,k,opts])=><div className="form-group" key={k}><label>{l}</label><select value={reportForm[k]} onChange={e=>setReportForm(x=>({...x,[k]:e.target.value}))}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>)}<div className="form-group"><label>Location / District</label><input required value={reportForm.location} onChange={e=>setReportForm(x=>({...x,location:e.target.value}))}/></div><div className="form-group"><label>Reporter / Field Unit</label><input required value={reportForm.reporter} onChange={e=>setReportForm(x=>({...x,reporter:e.target.value}))}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div className="form-group"><label>Latitude</label><input required value={reportForm.latitude} onChange={e=>setReportForm(x=>({...x,latitude:e.target.value}))}/></div><div className="form-group"><label>Longitude</label><input required value={reportForm.longitude} onChange={e=>setReportForm(x=>({...x,longitude:e.target.value}))}/></div></div><div className="form-group"><label>Description</label><textarea required rows="5" value={reportForm.description} onChange={e=>setReportForm(x=>({...x,description:e.target.value}))} placeholder="Describe incident, road condition or accessibility issue..."/></div><button className="route-button" style={{width:"100%"}}>📡 Save Geo-Tagged Report</button></form></div><div className="panel"><div className="panel-header"><div><h2>🛰️ Report Queue</h2><p>Persisted field intelligence</p></div></div><div style={{marginTop:16}}>{reports.map(r=><div className={`alert-row ${r.severity==="Critical"?"critical":r.severity==="Low"?"info":"warning"}`} key={r.id} style={{marginBottom:10}}><div className="alert-icon">{r.icon}</div><div><div><b>{r.type}</b> <span className={sevClass(r.severity)}>{r.severity}</span></div><span>{r.location}</span><small style={{display:"block",marginTop:4}}>👤 {r.reporter} · 📍 {r.latitude}, {r.longitude}</small><small style={{display:"block",marginTop:4}}>{r.description}</small></div><div><small>{r.syncStatus==="Pending"?"⏳ Pending":"✓ Synced"}</small></div></div>)}</div></div></div></>; }

function Analytics({ vehicles, alerts, riskScore, setPage }) {
  const openAlerts = alerts.filter((a) => a.status === "Open");

  const moving = vehicles.filter(
    (v) => v.status === "Moving"
  ).length;

  const delivered = vehicles.filter(
    (v) => v.status === "Delivered"
  ).length;

  const avgFuel = Math.round(
    vehicles.reduce((sum, v) => sum + v.fuel, 0) /
      Math.max(1, vehicles.length)
  );

  const avgRisk = Math.round(
    vehicles.reduce((sum, v) => sum + v.riskScore, 0) /
      Math.max(1, vehicles.length)
  );

  const avgSpeed = Math.round(
    vehicles.reduce((sum, v) => sum + v.speed, 0) /
      Math.max(1, vehicles.length)
  );

  const totalDistance = vehicles.reduce(
    (sum, v) => sum + v.totalDistanceKm,
    0
  );

  const travelledDistance = vehicles.reduce(
    (sum, v) => sum + v.distanceTravelledKm,
    0
  );

  const fleetUtilization = totalDistance
    ? Math.round((travelledDistance / totalDistance) * 100)
    : 0;

  const operationalScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          avgRisk * 0.35 +
          avgFuel * 0.2 +
          fleetUtilization * 0.25 -
          openAlerts.length * 2
      )
    )
  );

  const riskDistribution = [
    {
      name: "Low",
      value: vehicles.filter((v) => v.riskScore < 40).length,
    },
    {
      name: "Medium",
      value: vehicles.filter(
        (v) => v.riskScore >= 40 && v.riskScore < 60
      ).length,
    },
    {
      name: "High",
      value: vehicles.filter(
        (v) => v.riskScore >= 60 && v.riskScore < 80
      ).length,
    },
    {
      name: "Critical",
      value: vehicles.filter(
        (v) => v.riskScore >= 80
      ).length,
    },
  ].filter((x) => x.value > 0);

  const riskTrend = [
    ["08:00", riskScore - 18],
    ["10:00", riskScore - 14],
    ["12:00", riskScore - 10],
    ["14:00", riskScore - 6],
    ["16:00", riskScore - 3],
    ["18:00", riskScore - 1],
    ["Now", riskScore],
  ].map(([time, risk]) => ({
    time,
    risk: Math.max(0, Math.min(100, risk)),
  }));

  const fleetData = vehicles.map((v) => ({
    name: v.id.replace("NER-", ""),
    risk: v.riskScore,
    fuel: v.fuel,
    speed: v.speed,
    progress: progress(v),
  }));

  const utilizationData = vehicles.map((v) => ({
    name: v.id.replace("NER-", ""),
    utilization: progress(v),
    distance: v.distanceTravelledKm,
  }));

  const fuelData = vehicles.map((v) => ({
    name: v.id.replace("NER-", ""),
    fuel: v.fuel,
    risk: v.riskScore,
  }));

  const routePerformance = [
    {
      route: "NH-13",
      safety: 22,
      reliability: 48,
      efficiency: 58,
    },
    {
      route: "Guwahati–Tawang",
      safety: 58,
      reliability: 82,
      efficiency: 88,
    },
    {
      route: "Mountain Alt.",
      safety: 45,
      reliability: 68,
      efficiency: 64,
    },
  ];

  const districtRisk = [
    { district: "Guwahati", risk: 22 },
    { district: "Shillong", risk: 28 },
    { district: "Itanagar", risk: 51 },
    { district: "Bomdila", risk: 55 },
    { district: "Tawang", risk: 69 },
  ];

  const riskFactors = [
    { name: "Rainfall", value: 80 },
    { name: "Terrain", value: 80 },
    { name: "Landslide History", value: 70 },
    { name: "Road Damage", value: 60 },
    { name: "Traffic", value: 40 },
  ];

  const alertTrend = [
    { time: "08:00", alerts: 1 },
    { time: "10:00", alerts: 2 },
    { time: "12:00", alerts: 2 },
    { time: "14:00", alerts: 3 },
    { time: "16:00", alerts: 4 },
    { time: "18:00", alerts: openAlerts.length + 2 },
    { time: "Now", alerts: openAlerts.length },
  ];

  const deliveryData = [
    {
      category: "Medicine",
      delivered: 82,
      delayed: 18,
    },
    {
      category: "Food",
      delivered: 91,
      delayed: 9,
    },
    {
      category: "Agriculture",
      delivered: 76,
      delayed: 24,
    },
  ];

  const chartCard = {
    minHeight: 360,
    overflow: "hidden",
  };

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>📈 Analytics & Intelligence Center</h2>
            <p>
              AI-powered operational analytics for fleet, routes,
              accessibility and emergency response
            </p>
          </div>

          <button
            className="view-button"
            onClick={() => setPage("Dashboard")}
          >
            ← Dashboard
          </button>
        </div>

        <div className="stats-grid" style={{ marginTop: 18 }}>
          {[
            [
              "🧠",
              "AI Risk",
              `${riskScore}/100`,
              "Current corridor",
            ],
            [
              "⚡",
              "Operational Score",
              `${operationalScore}/100`,
              "Overall efficiency",
            ],
            [
              "🚚",
              "Fleet Utilization",
              `${fleetUtilization}%`,
              `${moving} vehicles moving`,
            ],
            [
              "⛽",
              "Fuel Health",
              `${avgFuel}%`,
              "Fleet average",
            ],
            [
              "⚠️",
              "Average Vehicle Risk",
              `${avgRisk}/100`,
              riskLabel(avgRisk),
            ],
            [
              "🚨",
              "Open Alerts",
              openAlerts.length,
              "Active response queue",
            ],
          ].map(([icon, label, value, sub]) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon">{icon}</div>

              <div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{sub}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(360px,1fr))",
          gap: 18,
          marginTop: 18,
        }}
      >
        <div className="panel" style={chartCard}>
          <h2>🧠 AI Risk Trend</h2>
          <p>Corridor risk evolution during the current monitoring period</p>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={riskTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="risk"
                name="AI Risk"
                stroke="#7c3aed"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>⚠️ Risk Distribution</h2>
          <p>Current fleet risk classification</p>

          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={riskDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                label
              >
                {riskDistribution.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      [
                        "#22c55e",
                        "#f59e0b",
                        "#ef4444",
                        "#991b1b",
                      ][index]
                    }
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>🚚 Fleet Risk vs Fuel</h2>
          <p>Compare vehicle safety exposure with fuel reserves</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fleetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="risk"
                name="Risk"
                fill="#ef4444"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="fuel"
                name="Fuel"
                fill="#22c55e"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>📊 Fleet Utilization</h2>
          <p>Delivery progress and distance utilization</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />

              <Bar
                dataKey="utilization"
                name="Utilization %"
                fill="#2563eb"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>⛽ Fuel Intelligence</h2>
          <p>Current fuel reserve across the monitored fleet</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fuelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="fuel"
                name="Fuel %"
                fill="#16a34a"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="risk"
                name="Risk"
                fill="#f59e0b"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>🛰️ GPS Fleet Performance</h2>
          <p>Vehicle speed and delivery progress</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fleetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="speed"
                name="Speed km/h"
                fill="#0891b2"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="progress"
                name="Progress %"
                fill="#7c3aed"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>🛣️ Route Performance</h2>
          <p>Safety, reliability and efficiency comparison</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={routePerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="route" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="safety"
                name="Safety"
                fill="#22c55e"
              />

              <Bar
                dataKey="reliability"
                name="Reliability"
                fill="#2563eb"
              />

              <Bar
                dataKey="efficiency"
                name="Efficiency"
                fill="#7c3aed"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>🚨 Alert Activity</h2>
          <p>Response queue activity over the monitoring period</p>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={alertTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="alerts"
                name="Alerts"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>🌐 District Risk Intelligence</h2>
          <p>Regional accessibility risk comparison</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={districtRisk}
              layout="vertical"
              margin={{
                left: 20,
                right: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                type="number"
                domain={[0, 100]}
              />

              <YAxis
                dataKey="district"
                type="category"
                width={80}
              />

              <Tooltip />

              <Bar
                dataKey="risk"
                name="Risk Score"
                fill="#dc2626"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>🌧️ AI Risk Factor Contribution</h2>
          <p>Inputs currently influencing corridor risk</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskFactors}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />

              <Bar
                dataKey="value"
                name="Contribution"
                fill="#f59e0b"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel" style={chartCard}>
          <h2>📦 Delivery Performance</h2>
          <p>Completed vs delayed logistics movement</p>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deliveryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="delivered"
                name="Delivered %"
                fill="#16a34a"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="delayed"
                name="Delayed %"
                fill="#ef4444"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(320px,1fr))",
          gap: 18,
          marginTop: 18,
        }}
      >
        <div className="panel">
          <h2>🎯 Operational Intelligence</h2>
          <p>Automatically generated platform insights</p>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 18,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <strong>🚚 Fleet Activity</strong>
              <p style={{ margin: "5px 0 0" }}>
                {moving} of {vehicles.length} vehicles are currently
                moving through monitored corridors.
              </p>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <strong>⛽ Fuel Status</strong>
              <p style={{ margin: "5px 0 0" }}>
                Fleet average fuel is {avgFuel}%.{" "}
                {avgFuel >= 70
                  ? "Current reserve is healthy."
                  : "Fuel monitoring should be prioritized."}
              </p>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
              }}
            >
              <strong>⚠️ Risk Monitoring</strong>
              <p style={{ margin: "5px 0 0" }}>
                Average vehicle risk is {avgRisk}/100 while the
                current corridor AI risk is {riskScore}/100.
              </p>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
              }}
            >
              <strong>🧭 Route Intelligence</strong>
              <p style={{ margin: "5px 0 0" }}>
                Route optimization should prioritize safety,
                predicted delay and road accessibility rather than
                distance alone.
              </p>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>🏆 Operational Score</h2>
          <p>Combined fleet and logistics performance indicator</p>

          <div
            style={{
              display: "grid",
              placeItems: "center",
              padding: 25,
            }}
          >
            <div
              style={{
                width: 190,
                height: 190,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                border: "14px solid #dbeafe",
                background:
                  "linear-gradient(145deg,#ffffff,#eff6ff)",
                boxShadow:
                  "0 10px 30px rgba(37,99,235,.12)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: 44,
                    lineHeight: 1,
                  }}
                >
                  {operationalScore}
                </strong>

                <span
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  / 100
                </span>
              </div>
            </div>

            <h3 style={{ marginTop: 18 }}>
              {operationalScore >= 80
                ? "Excellent Operations"
                : operationalScore >= 60
                ? "Stable Operations"
                : "Needs Attention"}
            </h3>

            <p
              style={{
                textAlign: "center",
                maxWidth: 420,
                color: "#64748b",
              }}
            >
              Score combines AI risk exposure, fleet utilization,
              fuel health and active response alerts.
            </p>
          </div>
        </div>

        <div className="panel">
          <h2>📊 Key Performance Indicators</h2>
          <p>Current logistics performance snapshot</p>

          <div style={{ marginTop: 18 }}>
            {[
              ["Fleet Utilization", fleetUtilization, "#2563eb"],
              ["Fuel Health", avgFuel, "#16a34a"],
              ["Operational Score", operationalScore, "#7c3aed"],
              ["Delivery Completion", delivered ? 85 : 70, "#0891b2"],
              ["Route Reliability", 82, "#f59e0b"],
            ].map(([label, value, color]) => (
              <div key={label} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 7,
                    fontSize: 13,
                  }}
                >
                  <strong>{label}</strong>
                  <strong>{value}%</strong>
                </div>

                <div
                  style={{
                    height: 10,
                    background: "#e5e7eb",
                    borderRadius: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, value)}%`,
                      height: "100%",
                      background: color,
                      borderRadius: 20,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
function EmergencyCenter({emergencies,setEmergencies,setAlerts,setPage,language}) { const [form,setForm]=useState({type:"Road Blockage",severity:"Critical",location:"Tawang, Arunachal Pradesh",message:""}); const broadcast=e=>{e.preventDefault();const id=Date.now();const item={id,...form,icon:iconFor(form.type),time:"Just now",status:"Broadcasted"};setEmergencies(x=>[item,...x]);setAlerts(x=>[{id:id+1,type:`Emergency: ${form.type}`,icon:item.icon,severity:form.severity,location:form.location,description:form.message,time:"Just now",status:"Open"},...x]);setForm(x=>({...x,message:""}));}; const ack=id=>setEmergencies(x=>x.map(e=>e.id===id?{...e,status:"Acknowledged"}:e)); const esc=id=>setEmergencies(x=>x.map(e=>e.id===id?{...e,status:"Escalated"}:e)); const critical=emergencies.filter(e=>e.severity==="Critical"&&e.status!=="Resolved").length; return <><div className="panel"><div className="panel-header"><div><h2>🆘 Emergency Command Center</h2><p>Broadcast, acknowledge and escalate critical regional incidents</p></div><button className="view-button" onClick={()=>setPage("Dashboard")}>← Dashboard</button></div><div className="stats-grid" style={{marginTop:18}}>{[["🚨","Active Emergencies",emergencies.length,"Response queue"],["📡","Broadcasts Sent",emergencies.length,"Regional notifications"],["🔴","Critical Events",critical,"Immediate attention"]].map(x=><div className="stat-card" key={x[1]}><div className="stat-icon">{x[0]}</div><div><span>{x[1]}</span><strong>{x[2]}</strong><small>{x[3]}</small></div></div>)}</div></div><div className="panel" style={{marginTop:18}}><h2>📢 Broadcast Emergency Alert</h2><p>Publish a centralized operational alert for response teams.</p><form onSubmit={broadcast} style={{marginTop:16}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}><div className="form-group"><label>Incident Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{["Landslide","Flood","Road Blockage","Heavy Rainfall","Vehicle Incident","Medical Emergency"].map(x=><option key={x}>{x}</option>)}</select></div><div className="form-group"><label>Severity</label><select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}>{["Critical","High","Medium"].map(x=><option key={x}>{x}</option>)}</select></div><div className="form-group"><label>Location / District</label><input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div></div><div className="form-group"><label>Emergency Message</label><textarea required rows="4" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Describe the emergency and required action..."/></div><button className="route-button">📡 Broadcast Alert</button></form></div><div className="panel" style={{marginTop:18}}><div className="panel-header"><div><h2>⚡ Emergency Workflow</h2><p>Detect → Broadcast → Acknowledge → Escalate</p></div></div><div style={{display:"grid",gap:12,marginTop:16}}>{emergencies.map(e=><div key={e.id} style={{padding:16,border:"1px solid #e5e7eb",borderRadius:14,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><b>{e.icon} {e.type} · {e.location}</b><div style={{marginTop:5,fontSize:13}}>{e.message}</div></div><span className={sevClass(e.severity)}>{e.severity}</span></div><div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:12,flexWrap:"wrap"}}><small>{e.time} · <b>{e.status}</b></small><div style={{display:"flex",gap:8}}><button className="view-button" disabled={e.status==="Acknowledged"||e.status==="Escalated"} onClick={()=>ack(e.id)}>✓ Acknowledge</button><button className="view-button" disabled={e.status==="Escalated"} onClick={()=>esc(e.id)}>⬆ Escalate</button></div></div></div>)}</div></div></>; }

export default function App() {
  const [page,setPage]=useState("Dashboard");
  const [language,setLanguage]=useState("EN");
  const [isOnline,setIsOnline]=useState(()=>typeof navigator==="undefined"?true:navigator.onLine);
  const [backendOnline,setBackendOnline]=useState(false);
  const [vehicles,setVehicles]=useState(initialVehicles);
  const [alerts,setAlerts]=usePersistent(STORAGE.alerts,initialAlerts);
  const [reports,setReports]=usePersistent(STORAGE.reports,initialReports);
  const [emergencies,setEmergencies]=usePersistent(STORAGE.emergencies,initialEmergencies);
  const [lastSync,setLastSync]=useState(()=>{try{return localStorage.getItem(STORAGE.lastSync)}catch(_){return null}});
  const [syncMessage,setSyncMessage]=useState("");
  const [reportForm,setReportForm]=useState({type:"Road Blockage",severity:"High",location:"Tawang, Arunachal Pradesh",reporter:"Field Unit",latitude:"27.5860",longitude:"91.8590",description:""});
  const [riskScore,setRiskScore]=useState(0); const [riskLevel,setRiskLevel]=useState("Loading...");
  const [riskFactors,setRiskFactors]=useState({rainfall:80,road_damage:60,landslide_history:70,traffic:40,terrain:80}); const [recommendation,setRecommendation]=useState("Connecting to AI Risk Engine...");
  const [aiLoading,setAiLoading]=useState(true); const [aiError,setAiError]=useState(""); const [riskRefreshCount,setRiskRefreshCount]=useState(0); const [selectedRoute,setSelectedRoute]=useState(null); const [alternatives,setAlternatives]=useState([]); const [routeLoading,setRouteLoading]=useState(false); const [originName,setOriginName]=useState("Guwahati"); const [destinationName,setDestinationName]=useState("Tawang"); const [origin,setOrigin]=useState(locations[0].position); const [destination,setDestination]=useState(locations[3].position); const [routeGeometry,setRouteGeometry]=useState([]); const [routeDistance,setRouteDistance]=useState(0); const [routeDuration,setRouteDuration]=useState(0); const [routeError,setRouteError]=useState(""); const [pickMode,setPickMode]=useState(null);
  const pendingSyncCount=reports.filter(r=>r.syncStatus==="Pending").length; const alertCount=alerts.filter(a=>a.status==="Open").length;

  useEffect(()=>{
    const o=locations.find(l=>l.name===originName);
    if(o){setOrigin(o.position);setRouteError("");}
  },[originName]);
  useEffect(()=>{
    const d=locations.find(l=>l.name===destinationName);
    if(d){setDestination(d.position);setRouteError("");}
  },[destinationName]);
  function handleMapPick(position){
    if(pickMode==="origin"){setOrigin(position);setOriginName(`Map point ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);setPickMode(null);}
    if(pickMode==="destination"){setDestination(position);setDestinationName(`Map point ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);setPickMode(null);}
  }

  useEffect(()=>{const on=()=>setIsOnline(true),off=()=>setIsOnline(false);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)}},[]);
  useEffect(()=>{if(isOnline&&pendingSyncCount>0){const t=setTimeout(syncNow,700);return()=>clearTimeout(t)}},[isOnline,pendingSyncCount]);
  useEffect(()=>{const id=setInterval(()=>setVehicles(vs=>vs.map((v,i)=>{const p=Math.min(v.totalDistanceKm,v.distanceTravelledKm+1);return {...v,position:[v.position[0]+(i===1?.0015:.001),v.position[1]+(i===1?-.0015:.002)],distanceTravelledKm:p,etaMinutes:Math.max(0,v.etaMinutes-1),fuel:Number(Math.max(10,v.fuel-(i===0?.05:.03)).toFixed(1)),status:progress({...v,distanceTravelledKm:p})>=100?"Delivered":"Moving"}})),3000);return()=>clearInterval(id)},[]);
  async function fetchRisk(){
    setAiLoading(true);
    setAiError("");
    const refreshNo=riskRefreshCount+1;
    setRiskRefreshCount(refreshNo);
    const variation=[0,6,-5,9,-8,4,-3][refreshNo%7];
    const inputs={
      rainfall:Math.max(0,Math.min(100,80+variation)),
      road_damage:Math.max(0,Math.min(100,60+Math.round(variation*0.6))),
      landslide_history:Math.max(0,Math.min(100,70+Math.round(variation*0.8))),
      traffic:Math.max(0,Math.min(100,40+Math.round(variation*0.9))),
      terrain:80,
    };
    try{
      const r=await fetch(`${API_BASE_URL}/api/risk/predict`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(inputs)});
      if(!r.ok)throw Error();
      const d=await r.json();
      setRiskScore(d.risk_score);
      setRiskLevel(d.risk_level);
      setRiskFactors(d.factors);
      setRecommendation(d.recommendation);
      setBackendOnline(true);
      setSelectedRoute(current=>{
        if(!current) return current;
        const routeBase=safeNumber(current.risk_score,50);
        const distanceEffect=Math.min(10,Math.round(safeNumber(current.distance_km,0)*0.01));
        const refreshedRisk=Math.max(5,Math.min(95,Math.round(routeBase*0.45+d.risk_score*0.55+distanceEffect)));
        const updated={
          ...current,
          risk_score:refreshedRisk,
          road_condition:refreshedRisk>=70?"High Risk":refreshedRisk>=45?"Moderate":"Good",
        };
        updated.optimization_score=routeScore(updated);
        setAlternatives(list=>list.map(route=>route.route_id===updated.route_id?updated:route));
        setRecommendation(prev=>`${prev} Selected route risk refreshed to ${refreshedRisk}/100.`);
        return updated;
      });
    }catch(e){
      setBackendOnline(false);
      const fallbackScores=[69,74,63,78,61,72,66];
      const fallbackScore=fallbackScores[refreshNo%fallbackScores.length];
      setRiskScore(fallbackScore);
      setRiskLevel(riskLabel(fallbackScore));
      setRiskFactors({
        rainfall:Math.max(0,Math.min(100,80+variation)),
        road_damage:Math.max(0,Math.min(100,60+Math.round(variation*0.6))),
        landslide_history:Math.max(0,Math.min(100,70+Math.round(variation*0.8))),
        traffic:Math.max(0,Math.min(100,40+Math.round(variation*0.9))),
        terrain:80,
      });
      setRecommendation("Use the AI safer route and monitor rainfall, landslide and road-condition updates.");
      setAiError("Backend unavailable — demo fallback is active. Refresh simulation is enabled.");
      setSelectedRoute(current=>{
        if(!current) return current;
        const refreshedRisk=Math.max(5,Math.min(95,Math.round(safeNumber(current.risk_score,50)*0.45+fallbackScore*0.55)));
        const updated={...current,risk_score:refreshedRisk,road_condition:refreshedRisk>=70?"High Risk":refreshedRisk>=45?"Moderate":"Good"};
        updated.optimization_score=routeScore(updated);
        setAlternatives(list=>list.map(route=>route.route_id===updated.route_id?updated:route));
        return updated;
      });
    }finally{setAiLoading(false)}
  }
  async function findRoute(originOverride=origin,destinationOverride=destination){
    const o=originOverride; const d=destinationOverride;
    if(!o || !d) return;
    setRouteLoading(true); setRouteError("");
    try {
      const url=`https://router.project-osrm.org/route/v1/driving/${o[1]},${o[0]};${d[1]},${d[0]}?overview=full&geometries=geojson&alternatives=true&steps=false`;
      const response=await fetch(url);
      if(!response.ok) throw new Error(`Routing service returned HTTP ${response.status}`);
      const data=await response.json();
      if(data.code!=="Ok" || !data.routes?.length) throw new Error("No road route was returned for these endpoints.");
      const evaluated=data.routes.map((r,index)=>{
        const distanceKm=Math.max(0,safeNumber(r?.distance,0)/1000);
        const minutes=Math.max(0,safeNumber(r?.duration,0)/60);
        if(distanceKm<=0 || minutes<=0 || !Array.isArray(r?.geometry?.coordinates) || r.geometry.coordinates.length<2){
          throw new Error("Routing service returned incomplete route data.");
        }
        const risk=Math.max(12,Math.min(92,Math.round(20 + distanceKm*0.035 + minutes*0.018)));
        const delay=Math.max(0,Math.round(minutes*0.08));
        const geometry=r.geometry.coordinates
          .filter(point=>Array.isArray(point) && point.length>=2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
          .map(([lng,lat])=>[Number(lat),Number(lng)]);
        if(geometry.length<2) throw new Error("Routing service returned invalid route geometry.");
        return {route_id:`LIVE-${index+1}`,name:index===0?`${originName} → ${destinationName} · Live Road Route`:`Alternative Road Route ${index}`,distance_km:Number(distanceKm.toFixed(1)),estimated_minutes:Number(minutes.toFixed(0)),delay_minutes:delay,risk_score:risk,road_condition:risk>=70?"High Risk":risk>=45?"Moderate":"Good",optimization_score:routeScore({risk_score:risk,distance_km:distanceKm,delay_minutes:delay}),geometry};
      });
      evaluated.sort((a,b)=>a.optimization_score-b.optimization_score);
      const best=evaluated[0];
      setSelectedRoute(best);
      setAlternatives(evaluated);
      setRouteGeometry(best.geometry);
      setRouteDistance(safeNumber(best.distance_km));
      setRouteDuration(safeNumber(best.estimated_minutes));
      // Keep the dashboard's 69/100 corridor AI assessment separate from route-specific risk.
      // The selected route risk is displayed inside the route result instead of replacing the global score.
      setRecommendation(`Safer route selected: ${best.name}. Route risk is ${best.risk_score}/100 with an estimated travel time of ${formatTravelTime(best.estimated_minutes)}.`);
      setRouteError("");
      // Keep the corridor AI assessment independent from route-specific risk.
      // Dashboard switches to selectedRoute.risk_score; Risk Analysis continues to show the corridor assessment.
      setRiskScore(safeNumber(riskScore,69));
      setRiskLevel(riskLabel(safeNumber(riskScore,69)));
    } catch(e) {
      const lat1=safeNumber(o?.[0],26.1445); const lat2=safeNumber(d?.[0],27.586);
      const lon1=safeNumber(o?.[1],91.7362); const lon2=safeNumber(d?.[1],91.859);
      const distanceKm=Math.max(1,Math.sqrt(Math.pow((lat2-lat1)*111,2)+Math.pow((lon2-lon1)*98,2)));
      const minutes=Math.max(1,Math.round(distanceKm/45*60));
      const risk=Math.max(18,Math.min(88,Math.round(25+distanceKm*0.08)));
      const mid=[(lat1+lat2)/2,(lon1+lon2)/2];
      const geometry=[[lat1,lon1],[mid[0]+0.08,mid[1]-0.05],[lat2,lon2]];
      const fallback={route_id:"DEMO-1",name:`${originName} → ${destinationName} · Demo Route`,distance_km:Number(distanceKm.toFixed(1)),estimated_minutes:minutes,delay_minutes:Math.round(minutes*0.08),risk_score:risk,road_condition:risk>=70?"High Risk":risk>=45?"Moderate":"Good",optimization_score:routeScore({risk_score:risk,distance_km:distanceKm,delay_minutes:minutes*0.08}),geometry};
      setSelectedRoute(fallback);
      setAlternatives([fallback]);
      setRouteGeometry(geometry);
      setRouteDistance(safeNumber(fallback.distance_km));
      setRouteDuration(safeNumber(fallback.estimated_minutes));
      const corridorRisk = safeNumber(riskScore,69);
      setRiskScore(corridorRisk);
      setRiskLevel(riskLabel(corridorRisk));
      setRecommendation(`Demo safer route selected: ${fallback.name}. Route risk is ${fallback.risk_score}/100.`);
      setRouteError("Live road-routing service could not be reached. A deterministic fallback route is displayed so the demo does not fail.");
    } finally { setRouteLoading(false); }
  }
  useEffect(()=>{fetchRisk()},[]);
  function syncNow(){if(!isOnline){setSyncMessage("Offline — reports remain safely stored on this device.");return}const count=pendingSyncCount;setReports(rs=>rs.map(r=>r.syncStatus==="Pending"?{...r,syncStatus:"Synced"}:r));const now=new Date().toISOString();setLastSync(now);try{localStorage.setItem(STORAGE.lastSync,now)}catch(_){}setSyncMessage(count?`${count} pending report(s) synchronized in demo mode.`:"All local reports are already synchronized.")}
  function resolveAlert(id){setAlerts(xs=>xs.map(a=>a.id===id?{...a,status:"Resolved"}:a))}
  function refreshAlerts(){setAlerts(xs=>xs.map(a=>a.status==="Open"?{...a,time:"Just now"}:a))}
  const title={Dashboard:"Logistics Intelligence Dashboard","Live Map":"Live Regional Operations Map",Vehicles:"Vehicle Monitoring","Risk Analysis":"AI Risk Analysis","Route Optimizer":"AI Route Optimizer",Alerts:"Alerts & Notifications","Field Reports":"Field Intelligence Center",Analytics:"Analytics & Intelligence","Emergency Center":"Emergency Command Center"}[page];
  const subtitle={Dashboard:"AI-powered accessibility & transportation monitoring","Live Map":"GIS visibility across roads, districts and monitored fleet",Vehicles:"Live GPS tracking & logistics fleet intelligence","Risk Analysis":"Explainable corridor risk prediction","Route Optimizer":"AI-assisted safer route selection",Alerts:"Centralized logistics and accessibility alerts","Field Reports":"Geo-tagged incident reporting with offline-first sync",Analytics:"Operational performance & logistics intelligence","Emergency Center":"Centralized emergency communication and escalation"}[page];
  let content;
  if(page==="Dashboard") content=<Dashboard {...{vehicles,alerts,riskScore,riskLevel,riskFactors,recommendation,backendOnline,aiLoading,aiError,fetchRisk,findRoute,routeLoading,selectedRoute,routeGeometry,origin,destination,setPage,isOnline,pendingSyncCount}}/>;
  else if(page==="Live Map") content=<GenericMapPage {...{vehicles,riskScore,selectedRoute,setPage,routeGeometry,origin,destination}}/>;
  else if(page==="Vehicles") content=<VehiclesPage {...{vehicles,setPage}}/>;
  else if(page==="Risk Analysis") content=<RiskPage {...{riskScore,riskLevel,riskFactors,recommendation,fetchRisk,aiLoading,backendOnline,setPage}}/>;
  else if(page==="Route Optimizer") content=<RoutePage {...{vehicles,riskScore,selectedRoute,alternatives,findRoute,loading:routeLoading,setPage,originName,destinationName,setOriginName,setDestinationName,origin,destination,routeGeometry,routeDistance,routeDuration,routeError,pickMode,setPickMode,onMapPick:handleMapPick,setOrigin,setDestination,setSelectedRoute,setAlternatives,setRouteGeometry,setRouteDistance,setRouteDuration,setRouteError}}/>;
  else if(page==="Alerts") content=<AlertsPage {...{alerts,resolve:resolveAlert,refresh:refreshAlerts,setPage}}/>;
  else if(page==="Field Reports") content=<FieldReports {...{reports,setReports,alerts,setAlerts,isOnline,pendingSyncCount,syncNow,lastSync,reportForm,setReportForm,setPage}}/>;
  else if(page==="Analytics") content=<Analytics {...{vehicles,alerts,riskScore,setPage}}/>;
  else content=<EmergencyCenter {...{emergencies,setEmergencies,setAlerts,setPage,language}}/>;
  return <Shell {...{page,setPage,alertCount,language,setLanguage,isOnline,backendOnline,pendingSyncCount,title,subtitle}}>{content}</Shell>;
}
