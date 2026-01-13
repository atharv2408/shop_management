import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

const Layout = () => {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-64 min-h-screen flex flex-col pb-16 md:pb-0">
                <Header />
                <main className="flex-1 p-6 overflow-x-hidden">
                    <Outlet />
                </main>
                <MobileNav />
            </div>
        </div>
    );
};

export default Layout;
