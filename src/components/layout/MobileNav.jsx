import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Receipt, FileText } from 'lucide-react';

const MobileNav = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: Receipt, label: 'Billing', path: '/billing' },
        { icon: FileText, label: 'Pay Later', path: '/pay-later' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 z-50 px-6 py-2 shadow-lg safe-area-bottom">
            <div className="flex justify-between items-center">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                            }`
                        }
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
