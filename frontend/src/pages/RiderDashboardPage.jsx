import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import OrderManager from '../components/OrderManager';
import RiderLocationSharer from '../components/RiderLocationSharer';
import { AdminPageSkeleton } from '../components/AdminSkeleton';
import './AdminPage.css';

const RiderDashboardPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, authToken } = useAuth();

    useEffect(() => {
        const fetchOrders = async () => {
            if (!authToken) {
                setLoading(false);
                return;
            }
            try {
                setError(null);
                const config = {
                    headers: { Authorization: `Bearer ${authToken}` },
                };
                const { data } = await axios.get(
                    `${process.env.REACT_APP_API_URL}/api/admin/orders?limit=1000`,
                    config
                );
                const validOrders = (data.data || []).filter(o => o.user);
                setOrders(validOrders);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
                setError(err.response?.data?.msg || 'Failed to load orders');
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [authToken]);

    const isRider = user?.role === 'rider';

    return (
        <div className="admin-page-container">
            <div className="fixed inset-0 bg-black bg-opacity-60 z-0"></div>
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <h1 className="text-4xl font-bold text-white text-center mb-8">
                    {isRider ? 'Rider Dashboard' : 'Delivery Admin Dashboard'}
                </h1>

                {loading ? (
                    <AdminPageSkeleton />
                ) : error ? (
                    <div className="bg-white/95 dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {isRider
                                ? 'You may not have any orders assigned yet. Contact your admin.'
                                : 'Please ensure you have the correct permissions.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {isRider && (
                            <div className="mb-6">
                                <RiderLocationSharer orders={orders} />
                            </div>
                        )}
                        <div className="admin-order-list-container">
                            <OrderManager orders={orders} setOrders={setOrders} loading={false} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default RiderDashboardPage;
