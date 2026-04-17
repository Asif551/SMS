import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Salary() {
  const { token, user } = useAuth();
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchSalary();
  }, []);

  const fetchSalary = async () => {
    const res = await fetch('/api/staff/salary', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setSalaryInfo(data.salaryInfo);
      setPaymentHistory(data.history);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">My Salary</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="h-6 w-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Salary Status</h2>
        </div>
        
        {salaryInfo ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Monthly Salary</span>
              <span className="font-bold text-gray-900">${salaryInfo.monthly_salary.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-green-700">Total Received</span>
              <span className="font-bold text-green-700">${salaryInfo.total_paid.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No salary structure assigned.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentHistory.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1 text-gray-400" />
                      {format(new Date(p.date), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    ${p.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {paymentHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No payment history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
