import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UPDATE_INTERVAL_MS = 10000; // 10 seconds

const RiderLocationSharer = ({ orders }) => {
    const { authToken } = useAuth();
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const intervalRef = useRef(null);

    const activeOrders = orders.filter(o => o.status === 'Out for Delivery');

    const sendLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const config = {
                    headers: { Authorization: `Bearer ${authToken}` },
                };
                const payload = { lat: latitude, lng: longitude };

                activeOrders.forEach((order) => {
                    axios
                        .put(
                            `${process.env.REACT_APP_API_URL}/api/admin/orders/${order._id}/location`,
                            payload,
                            config
                        )
                        .then(() => {
                            setLastUpdated(new Date());
                            setError(null);
                        })
                        .catch((err) => {
                            console.warn('Location update failed for order', order._id, err);
                            setError(err.response?.data?.msg || 'Failed to update location');
                        });
                });
            },
            (err) => {
                setError(err.message || 'Could not get location. Please allow location access.');
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }, [activeOrders, authToken]);

    const startSharing = () => {
        if (activeOrders.length === 0) return;
        setError(null);
        sendLocation();
        setIsSharing(true);
        intervalRef.current = setInterval(sendLocation, UPDATE_INTERVAL_MS);
    };

    const stopSharing = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsSharing(false);
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const hasActiveOrders = activeOrders.length > 0;

    return (
        <div className="rider-location-card">
            <div className="rider-location-header">
                <span className="rider-location-icon">📍</span>
                <h3 className="rider-location-title">Share Your Location</h3>
            </div>
            <p className="rider-location-desc">
                {hasActiveOrders
                    ? 'Customers can track your live location when delivering. Click below to start sharing.'
                    : 'When you have orders marked "Out for Delivery", you can share your location so customers can track you in real time.'}
            </p>
            {!hasActiveOrders && (
                <p className="rider-location-hint">
                    Share location is available when you have orders with status &quot;Out for Delivery&quot;. Ask your admin to assign you and update the order status.
                </p>
            )}
            {error && <p className="rider-location-error">{error}</p>}
            {isSharing ? (
                <div className="rider-location-status">
                    <span className="rider-location-dot" />
                    <span>Sharing location every 10 seconds</span>
                    {lastUpdated && (
                        <span className="rider-location-time">
                            Last sent: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        type="button"
                        className="rider-location-stop-btn"
                        onClick={stopSharing}
                    >
                        Stop Sharing
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="rider-location-start-btn"
                    onClick={startSharing}
                    disabled={!hasActiveOrders}
                >
                    {hasActiveOrders ? 'Start Sharing Location' : 'No orders out for delivery'}
                </button>
            )}
        </div>
    );
};

export default RiderLocationSharer;
