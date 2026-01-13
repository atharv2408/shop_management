import React from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';

const ErrorAlert = ({ error, onRetry }) => {
    if (!error) return null;

    const isOffline = error.message && error.message.includes('offline');
    const isPermission = error.code === 'permission-denied';

    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            {isOffline ? (
                <WifiOff className="w-5 h-5 text-red-500 mt-0.5" />
            ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {isOffline ? 'You are offline' : 'Error loading data'}
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {isPermission
                        ? "You don't have permission to view this data."
                        : error.message || "Something went wrong. Please try again."}
                </p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-2 text-sm font-medium text-red-700 dark:text-red-400 hover:text-red-800 underline"
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorAlert;
