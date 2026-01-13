import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {label}
                </label>
            )}
            <input
                className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-neutral-800 
          ${error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-neutral-300 dark:border-neutral-600 focus:ring-indigo-500'
                    } 
          text-neutral-900 dark:text-white focus:ring-2 outline-none transition-all ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

export default Input;
