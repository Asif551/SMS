import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, Save } from 'lucide-react';

export default function FeesAndSalaries() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  
  const [feeForm, setFeeForm] = useState({ class_id: '', amount: '' });
  const [salaryForm, setSalaryForm] = useState({ user_id: '', amount: '' });

  const [SalaryAmountError, setSalaryAmountError] = useState(false);
  const [FeeAmountError, setFeeAmountError] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [clsRes, usrRes, feeRes, salRes] = await Promise.all([
      fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/fees', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/salaries', { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (clsRes.ok) setClasses(await clsRes.json());
    if (usrRes.ok) setUsers(await usrRes.json());
    if (feeRes.ok) setFeeStructures(await feeRes.json());
    if (salRes.ok) setSalaryStructures(await salRes.json());
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(feeForm)
    });
    if (res.ok) {
      setFeeForm({ class_id: '', amount: '' });
      fetchData();
    }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/salaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(salaryForm)
    });
    if (res.ok) {
      setSalaryForm({ user_id: '', amount: '' });
      fetchData();
    }
  };

  const staff = users.filter(u => u.role !== 'student');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <DollarSign className="h-8 w-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Fees & Salaries Structure</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fees Structure */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Monthly Fee Structure</h2>
          
          <form onSubmit={handleFeeSubmit} className="flex gap-4 mb-6">
            <select 
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={feeForm.class_id} onChange={(e) => setFeeForm({...feeForm, class_id: e.target.value})} required
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className = "flex flex-col">
              <input 
                type="number" placeholder="Amount ($)" required step="0.01" min="1"
                className={`w-32 rounded-md border shadow-sm sm:text-sm p-2
                  ${FeeAmountError 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                value={feeForm.amount} onChange={(e) => {
                  const value = e.target.value;
                  setFeeForm({...feeForm, amount: e.target.value})
                  setFeeAmountError(value === '' || Number(value) <= 0);
              }}
              />
              {FeeAmountError && ( <p className="text-red-500 text-xs mt-1">Please enter a valid amount</p> )}
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700">
              <Save size={18} />
            </button>
          </form>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly Fee</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feeStructures.map(f => {
                const cls = classes.find(c => c.id === f.class_id);
                return (
                  <tr key={f.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">${f.amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Salary Structure */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Staff Salary Structure</h2>
          
          <form onSubmit={handleSalarySubmit} className="flex gap-4 mb-6">
            <select 
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={salaryForm.user_id} onChange={(e) => setSalaryForm({...salaryForm, user_id: e.target.value})} required
            >
              <option value="">Select Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
            </select>
            <div className = "flex flex-col">
              <input 
                type="number" placeholder="Amount ($)" required step="0.01" min="1"
                className={`w-32 rounded-md border shadow-sm sm:text-sm p-2
                  ${SalaryAmountError 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                value={salaryForm.amount} onChange={(e) => {
                    const value = e.target.value;
                    setSalaryForm({...salaryForm, amount: value});
                    setSalaryAmountError(value === '' || Number(value) <= 0);
                }}
              />
              {SalaryAmountError && ( <p className="text-red-500 text-xs mt-1">Please enter a valid amount</p> )}
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700">
              <Save size={18} />
            </button>
          </form>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly Salary</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salaryStructures.map(s => {
                const user = users.find(u => u.id === s.user_id);
                return (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user?.name || 'Unknown'} <span className="text-gray-500 text-xs">({user?.role})</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">${s.amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
