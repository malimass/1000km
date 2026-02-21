import { MapContainer, TileLayer, Polyline, Marker, Popup, ZoomControl } from "react-leaflet";
import { Icon, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Coordinate delle 15 tappe (Bologna → Terranova Sappo Minulio)
const waypoints: [number, number][] = [
  [44.4949, 11.3426], // Bologna
  [44.6471, 10.9252], // Modena
  [44.6989, 10.6297], // Reggio Emilia
  [44.8015, 10.3279], // Parma
  [44.3764,  9.8813], // Pontremoli
  [44.1024,  9.8240], // La Spezia
  [43.8376, 10.4950], // Lucca
  [43.7696, 11.2558], // Firenze
  [43.4633, 11.8788], // Arezzo
  [43.1122, 12.3888], // Perugia
  [42.5636, 12.6427], // Terni
  [42.4012, 12.8565], // Rieti
  [41.0739, 14.3325], // Caserta
  [39.3088, 16.2520], // Cosenza
  [38.3397, 16.1152], // Terranova Sappo Minulio
];

const labels = [
  "Bologna", "Modena", "Reggio Emilia", "Parma", "Pontremoli",
  "La Spezia", "Lucca", "Firenze", "Arezzo", "Perugia",
  "Terni", "Rieti", "Caserta", "Cosenza", "Terranova Sappo Minulio",
];

const dates = [
  "18 apr", "19 apr", "20 apr", "21 apr", "22 apr",
  "23 apr", "24 apr", "25 apr", "26 apr", "27 apr",
  "28 apr", "29 apr", "30 apr", "1 mag", "1 mag",
];

const km = [
  0, 60, 110, 165, 245, 310, 385, 465, 550, 625,
  705, 765, 855, 940, 1000,
];

function makeIcon(color: string, size = 10) {
  return divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.4)
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const startIcon = makeIcon("#22c55e", 16);
const endIcon   = makeIcon("#e11d48", 16);
const midIcon   = makeIcon("#f97316", 10);

export default function RouteMap() {
  // Centro mappa: circa metà Italia
  const center: [number, number] = [42.5, 12.5];

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-lg border border-border" style={{ height: 480 }}>
      <MapContainer
        center={center}
        zoom={6}
        zoomControl={false}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Linea del percorso */}
        <Polyline
          positions={waypoints}
          pathOptions={{
            color: "#e11d48",
            weight: 3,
            opacity: 0.85,
            dashArray: "6 4",
          }}
        />

        {/* Marker per ogni tappa */}
        {waypoints.map((pos, i) => {
          const icon =
            i === 0 ? startIcon : i === waypoints.length - 1 ? endIcon : midIcon;
          return (
            <Marker key={labels[i]} position={pos} icon={icon}>
              <Popup>
                <div className="text-sm font-sans">
                  <strong>{labels[i]}</strong>
                  <br />
                  {dates[i]} · {km[i]} km
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
