
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';
import RootLayout from './layouts/RootLayout';
import Dashboard from './pages/Dashboard';
import FixedExpenses from './pages/FixedExpenses';
import Settings from './pages/Settings';
import Login from './pages/Login';

const AppRoutes: React.FC = () => {
    const { fbUser } = useFinancial();

    if (!fbUser) return <Login />;

    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="fixed-expenses" element={<FixedExpenses />} />
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
