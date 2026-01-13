import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, User } from 'lucide-react';

const Header = () => {
    const { theme, toggleTheme } = useTheme();
    const { currentUser, userRole } = useAuth();

    return (
        <header className="h-16 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-40 px-6 flex items-center justify-end gap-4 transition-colors duration-300">
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 md:hidden mr-auto">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white">ShopInv</h1>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-neutral-200 dark:border-neutral-700">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {currentUser?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                        {userRole || 'Staff'}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <User className="w-5 h-5" />
                </div>
            </div>
        </header>
    );
};

export default Header;
