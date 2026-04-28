import React from 'react';
import { useFinancial } from '../contexts/FinancialContext';

const Dashboard: React.FC = () => {
    const { transactions } = useFinancial();
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black">Dashboard</h1>
            <div className="glass p-6 rounded-3xl">
                <p>Transações recentes: {transactions.length}</p>
            </div>
        </div>
    );
};
export default Dashboard;
