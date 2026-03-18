import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TRACKING_POLL_MS = 5000;

const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat && center.lng) {
            map.setView([center.lat, center.lng], map.getZoom());
        }
    }, [center, map]);
    return null;
};

const OrderTrackingModal = ({ show, onClose, order }) => {
    const { authToken } = useAuth();
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTracking = useCallback(async () => {
        if (!order?._id || !authToken) return;
        try {
            const { data } = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/orders/${order._id}/tracking`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (data.success) {
                setTrackingData(data.data);
                setError(null);
            }
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to load tracking');
        } finally {
            setLoading(false);
        }
    }, [order?._id, authToken]);

    useEffect(() => {
        if (!show || !order) return;
        setLoading(true);
        fetchTracking();
        const interval = setInterval(fetchTracking, TRACKING_POLL_MS);
        return () => clearInterval(interval);
    }, [show, order, fetchTracking]);

    if (!show) return null;

    const riderLoc = trackingData?.riderLocation;
    const hasLocation = riderLoc && typeof riderLoc.lat === 'number' && typeof riderLoc.lng === 'number';
    const center = hasLocation ? [riderLoc.lat, riderLoc.lng] : [20.5937, 78.9629]; // Default: India center

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Track Order #{order?._id?.substring(0, 8)}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-2xl leading-none text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-4">
                    {loading && !trackingData ? (
                        <p className="text-gray-600 dark:text-gray-400">Loading location...</p>
                    ) : error ? (
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    ) : (
                        <>
                            {trackingData?.assignedRider && (
                                <p className="mb-3 text-gray-700 dark:text-gray-300">
                                    Rider: <strong>{trackingData.assignedRider.name}</strong>
                                    {trackingData.assignedRider.contactNumber && (
                                        <> • {trackingData.assignedRider.contactNumber}</>
                                    )}
                                </p>
                            )}
                            {hasLocation ? (
                                <>
                                    <div className="h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                                        <MapContainer
                                            center={center}
                                            zoom={15}
                                            className="h-full w-full"
                                            scrollWheelZoom={true}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Marker position={center}>
                                                <Popup>Rider&apos;s current location</Popup>
                                            </Marker>
                                            <MapUpdater center={riderLoc} />
                                        </MapContainer>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Last updated: {riderLoc?.updatedAt ? new Date(riderLoc.updatedAt).toLocaleTimeString() : '—'}
                                    </p>
                                </>
                            ) : (
                                <p className="text-amber-600 dark:text-amber-400">
                                    Rider location will appear here once they start sharing. Please wait...
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTrackingModal;
