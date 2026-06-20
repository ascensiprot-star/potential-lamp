import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FitBounds({ providers, userLocation }) {
    const map = useMap();
    useEffect(() => {
        const points = providers.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]);
        if (userLocation) points.push(userLocation);
        if (points.length > 0) {
            map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
        }
    }, [providers, userLocation, map]);
    return null;
}

const userIcon = new L.DivIcon({
    className: '',
    html: '<div style="width:16px;height:16px;background:#000;border:3px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

export default function MapView({ providers = [], userLocation, className = 'h-[400px]' }) {
    const center = userLocation || [40.7128, -74.006];
    return (
        <div className={`${className} rounded-lg overflow-hidden border border-border`}>
            <MapContainer center={center} zoom={12} className="h-full w-full" zoomControl={false}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <FitBounds providers={providers} userLocation={userLocation} />
                {userLocation && <Marker position={userLocation} icon={userIcon}><Popup>You are here</Popup></Marker>}
                {providers.map(p => p.latitude && p.longitude && (
                    <Marker key={p.id} position={[p.latitude, p.longitude]}>
                        <Popup>
                            <div className="font-inter text-xs">
                                <p className="font-semibold">{p.business_name}</p>
                                <p className="text-muted-foreground">{p.address}</p>
                                <Link to={`/providers/${p.id}`} className="underline">View</Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}