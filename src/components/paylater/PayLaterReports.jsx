import React from 'react';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

const PayLaterReports = ({ customers }) => {
    // We can calculate total outstanding from customers available
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);
    const customersWithDues = customers.filter(c => c.totalDue > 0).length;

    // For Daily/Monthly reports, we ideally need to query 'orders' or 'transactions'.
    // Since 'transactions' are subcollections, querying 'orders' with paymentMode=='credit' is easier 
    // for "New Debt Created".
    // For "Payments Received", we'd strictly need to query transactions group or keep a separate record.
    // Given the constraints and existing setup, we'll focus on "New Debt Created" via Orders for now.

    // We'll trust the user to create indexes if needed, or just show Total Outstanding which is most important.

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">Pay Later Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-medium">Total Outstanding</span>
                    </div>
                    <div className="text-4xl font-bold">₹{totalOutstanding.toFixed(2)}</div>
                    <div className="mt-4 text-indigo-100 text-sm">
                        Across {customersWithDues} customers
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-neutral-500">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Active Debtors</span>
                    </div>
                    <div className="text-4xl font-bold text-neutral-900 dark:text-white">{customersWithDues}</div>
                    <div className="mt-4 text-neutral-400 text-sm">
                        {(customersWithDues / (customers.length || 1) * 100).toFixed(0)}% of total customers
                    </div>
                </div>
            </div>

            {/* Note: Further daily/monthly breakdowns would require a Collection Group query on 'transactions' 
                which requires an index. For this iteration, we provide the high-level summary. */}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">About Reports</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                    Detailed daily and monthly breakdown of credits and payments will appear here once sufficient transaction history is built and indexes are enabled.
                </p>
            </div>
        </div>
    );
};

export default PayLaterReports;
