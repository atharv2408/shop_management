import React from 'react';
import Card from '../common/Card';

const StatsCard = ({ title, value, icon: Icon, trend, color = "indigo" }) => {
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        pink: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
        green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    };

    return (
        <Card className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</h3>
                {trend && (
                    <p className={`text-xs font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend > 0 ? '+' : ''}{trend}% from last month
                    </p>
                )}
            </div>
        </Card>
    );
};

export default StatsCard;
