import React, { useState, useEffect } from 'react';
import { IndianRupee, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import StatsCard from '../components/dashboard/StatsCard';
import SalesChart from '../components/dashboard/SalesChart';
import { motion } from 'framer-motion';
import { useFirestore } from '../hooks/useFirestore';
import { orderBy } from 'firebase/firestore';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { data: orders, loading, error } = useFirestore('orders', [orderBy('createdAt', 'desc')]);
    const { currentShop, currentUser } = useAuth();
    const [stats, setStats] = useState([
        { title: 'Total Revenue', value: '₹0', icon: IndianRupee, trend: 0, color: 'indigo' },
        { title: 'Total Orders', value: '0', icon: ShoppingBag, trend: 0, color: 'pink' },
        { title: 'New Customers', value: '0', icon: Users, trend: 0, color: 'green' },
        { title: 'Growth', value: '0%', icon: TrendingUp, trend: 0, color: 'orange' },
    ]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (loading || !orders) return;

        // Calculate Stats
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const uniqueCustomers = new Set(orders.map(o => o.customerName)).size;

        // Simple growth calculation (placeholder)
        const growth = orders.length > 0 ? 10 : 0;

        setStats([
            { title: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, icon: IndianRupee, trend: 12, color: 'indigo' },
            { title: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag, trend: 8, color: 'pink' },
            { title: 'New Customers', value: uniqueCustomers.toString(), icon: Users, trend: 24, color: 'green' },
            { title: 'Growth', value: `+${growth}%`, icon: TrendingUp, trend: 4, color: 'orange' },
        ]);

        // Recent Activity
        setRecentActivity(orders.slice(0, 5));

        // Chart Data (Last 7 days)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        const newChartData = last7Days.map(date => {
            const dayName = days[date.getDay()];
            const dateStr = date.toISOString().split('T')[0];
            const daySales = orders
                .filter(o => o.createdAt.startsWith(dateStr))
                .reduce((sum, o) => sum + o.total, 0);
            return { name: dayName, sales: daySales };
        });

        setChartData(newChartData);
    }, [orders, loading]);

    const handleInvite = async () => {
        const email = window.prompt("Enter the email address to invite:");
        if (!email) return;

        const toastId = toast.loading("Sending invitation...");
        try {
            // Create invitation document
            // We use the email as the doc ID to ensure one invite per email (and easy lookup)
            await setDoc(doc(db, "invitations", email.toLowerCase()), {
                shopId: currentShop.id,
                shopName: currentShop.name,
                invitedBy: currentUser.uid,
                role: 'staff',
                createdAt: new Date().toISOString()
            });
            toast.success(`Invitation sent to ${email}`, { id: toastId });
        } catch (error) {
            console.error("Invite error:", error);
            toast.error("Failed to send invite: " + error.message, { id: toastId });
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard Overview</h2>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Last updated: {new Date().toLocaleDateString()}
                    <button
                        onClick={handleInvite}
                        className="ml-4 px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-lg transition-colors flex items-center gap-1 inline-flex"
                    >
                        <Users className="w-3 h-3" />
                        Invite
                    </button>

                </div>
            </div>

            {error && <ErrorAlert error={error} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <StatsCard {...stat} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesChart data={chartData} />
                </div>
                <div className="lg:col-span-1">
                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 h-full">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {recentActivity.length === 0 ? (
                                <div className="text-center text-neutral-500 py-8">
                                    No recent activity
                                </div>
                            ) : (
                                recentActivity.map((order) => (
                                    <div key={order.id} className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                                New order {order.customerName !== 'Walk-in Customer' ? `from ${order.customerName}` : ''}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                ₹{order.total.toFixed(2)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
