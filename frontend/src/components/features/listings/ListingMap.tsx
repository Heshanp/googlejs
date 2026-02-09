'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Next.js
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface ListingMapProps {
    location: string | { city: string; suburb: string; };
    title?: string;
}

// Helper to center map on coordinates
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center);
    return null;
}

export function ListingMap({ location, title }: ListingMapProps) {
    const [coords, setCoords] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCoords = async () => {
            setLoading(true);
            try {
                const query = typeof location === 'string'
                    ? location
                    : `${location.suburb}, ${location.city}, New Zealand`;

                // Use Nominatim OpenStreetMap API for geocoding
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data && data.length > 0) {
                    setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                } else {
                    // Default to Wellington, NZ if not found
                    setCoords([-41.2866, 174.7756]);
                }
            } catch (error) {
                setCoords([-41.2866, 174.7756]); // Default fallback
            } finally {
                setLoading(false);
            }
        };

        fetchCoords();
    }, [location]);

    if (loading || !coords) {
        return (
            <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center rounded-xl">
                <span className="text-gray-400 text-sm">Loading map...</span>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-xl overflow-hidden relative z-0">
            <MapContainer
                center={coords}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <ChangeView center={coords} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={coords} icon={icon}>
                    <Popup>
                        {title || 'Item Location'}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
