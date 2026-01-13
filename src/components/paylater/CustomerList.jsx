import React from 'react';
import { User } from 'lucide-react';

const CustomerList = ({ customers, selectedId, onSelect }) => {
    if (customers.length === 0) {
        return (
            <div className="p-8 text-center text-neutral-500 text-sm">
                No customers found.
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {customers.map(customer => (
                <button
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    className={`flex items-center gap-3 p-4 border-b border-neutral-100 dark:border-neutral-800 transition-colors text-left
                        ${selectedId === customer.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-600'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 border-l-4 border-l-transparent'
                        }`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                        ${selectedId === customer.id
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                        }`}
                    >
                        {customer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${selectedId === customer.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-neutral-900 dark:text-white'}`}>
                            {customer.name}
                        </h4>
                        <p className="text-xs text-neutral-500 truncate">{customer.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right">
                        <span className={`block font-bold text-sm ${customer.totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            ₹{customer.totalDue?.toFixed(2) || '0.00'}
                        </span>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Due</span>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default CustomerList;
