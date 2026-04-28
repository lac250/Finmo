
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';
import RootLayout from './layouts/RootLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Mentor from './pages/Mentor';
import Reserve from './pages/Reserve';
import Wishlist from './pages/Wishlist';
import Settings from './pages/Settings';
import Login from './pages/Login';

const AppRoutes: React.FC = () => {
    const { fbUser, isAuthReady } = useFinancial();

    if (!isAuthReady) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!fbUser) return <Login />;

    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="mentor" element={<Mentor />} />
                <Route path="reserve" element={<Reserve />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <FinancialProvider>
                <AppRoutes />
            </FinancialProvider>
        </BrowserRouter>
    );
};

export default App;
