import React, { useState } from 'react';
import { Download, Database, Check, AlertCircle } from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Settings = () => {
    return (
        <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
            <div className="grid gap-6">
                <BackupSection />
            </div>
        </div>
    );
};

const BackupSection = () => {
    const { currentShop } = useAuth();
    const [isBackingUp, setIsBackingUp] = useState(false);

    const handleBackup = async () => {
        if (!currentShop?.id) return toast.error("Shop information missing");

        setIsBackingUp(true);
        const toastId = toast.loading("Generating backup...");

        try {
            const backupData = {
                shop: currentShop,
                timestamp: new Date().toISOString(),
                products: [],
                customers: [],
                orders: []
            };

            // 1. Fetch Products
            const productsQuery = query(collection(db, 'products'), where('shopId', '==', currentShop.id));
            const productsSnap = await getDocs(productsQuery);
            backupData.products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Fetch Orders
            const ordersQuery = query(collection(db, 'orders'), where('shopId', '==', currentShop.id));
            const ordersSnap = await getDocs(ordersQuery);
            backupData.orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Fetch Customers & Transactions
            const customersQuery = query(collection(db, 'customers'), where('shopId', '==', currentShop.id));
            const customersSnap = await getDocs(customersQuery);

            const customerPromises = customersSnap.docs.map(async (customerDoc) => {
                const customerData = { id: customerDoc.id, ...customerDoc.data() };

                // Fetch transactions for each customer
                const transactionsQuery = query(collection(db, `customers/${customerDoc.id}/transactions`));
                const transactionsSnap = await getDocs(transactionsQuery);
                customerData.transactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                return customerData;
            });

            backupData.customers = await Promise.all(customerPromises);

            // 4. Download File
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shop_inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Backup downloaded successfully!", { id: toastId });
        } catch (error) {
            console.error("Backup failed:", error);
            toast.error("Failed to generate backup", { id: toastId });
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Database className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Data Backup</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                        Download a backup of all your shop data (Products, Customers, Transactions, Orders).
                        This file can be used to restore your data later or for record keeping.
                    </p>

                    <button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBackingUp ? (
                            <>Loading...</>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download Backup JSON
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;
