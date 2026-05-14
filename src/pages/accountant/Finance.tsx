import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, ArrowUpRight, ArrowDownRight, DollarSign, Search, FileEdit } from 'lucide-react';
import { format } from 'date-fns';

export default function Finance() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [view, setView] = useState<'transactions' | 'dues' | 'user_report'>('transactions');
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [amountError, setAmountError] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'income',
    user_id: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchUsers();
    fetchDues();
  }, []);

  const fetchTransactions = async () => {
    const res = await fetch('/api/transactions', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTransactions(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  const fetchDues = async () => {
    const res = await fetch('/api/fees/dues', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setDues(await res.json());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = Number(formData.amount);
    if (isNaN(amountValue) || amountValue < 1) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!formData.description.trim()) {
      alert('Description cannot be empty.');
      return;
    }

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setIsModalOpen(false);
      setEditingTransactionId(null);
      fetchTransactions();
      fetchDues();
      setFormData({ type: 'income', user_id: '', amount: '', description: '' });
    }
  };
  
  const updateTransaction = async (e: React.FormEvent, transactionId: number) => {
      e.preventDefault();
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingTransactionId(null);
        fetchTransactions();
        fetchDues();
        setFormData({ type: 'income', user_id: '', amount: '', description: '' });
        return true;
      }

      const errorData = await res.json().catch(() => null);
      console.error('Update transaction failed', errorData);
      return false;
    };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const userReportData = useMemo(() => {
    if (!searchUserId) return null;
    
    const userTransactions = transactions.filter(t => t.user_id === Number(searchUserId));
    const groupedByMonth: Record<string, { transactions: any[], totalIncome: number, totalExpense: number }> = {};
    
    userTransactions.forEach(t => {
      const month = format(new Date(t.date), 'MMMM yyyy');
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = { transactions: [], totalIncome: 0, totalExpense: 0 };
      }
      groupedByMonth[month].transactions.push(t);
      if (t.type === 'income') {
        groupedByMonth[month].totalIncome += t.amount;
      } else {
        groupedByMonth[month].totalExpense += t.amount;
      }
    });
    
    return groupedByMonth;
  }, [searchUserId, transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setView('transactions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'transactions' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Transactions
          </button>
          <button 
            onClick={() => setView('dues')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dues' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Student Dues
          </button>
          <button 
            onClick={() => setView('user_report')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'user_report' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            User Report
          </button>
          <button 
            onClick={() => {
                          setEditingTransactionId(null);

                          setFormData({
                            type: 'income',
                            user_id: '',
                            amount: '',
                            description: '',
                          });

                          setIsModalOpen(true);
                        }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 ml-4"
          >
            <Plus size={20} className="mr-2" /> New Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-green-100 text-green-600">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-2xl font-bold text-gray-900">${totalIncome.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-red-100 text-red-600">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">${totalExpense.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Net Balance</p>
            <p className="text-2xl font-bold text-gray-900">${(totalIncome - totalExpense).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {view === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User/Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(t.date), 'MMM dd, yyyy HH:mm')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.user_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.description}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                        onClick={() => {
                          setEditingTransactionId(t.id);

                          setFormData({
                            type: t.type,
                            user_id: t.user_id ? t.user_id.toString() : '',
                            amount: t.amount.toString(),
                            description: t.description || '',
                          });

                          setIsModalOpen(true);
                        }}
                      >
                        <FileEdit size={16} />
                        Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'user_report' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search User</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input 
                type="text"
                list="user-list"
                placeholder="Search by name or role..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                onChange={(e) => {
                  const selectedUser = users.find(u => `${u.name} (${u.role})` === e.target.value);
                  if (selectedUser) {
                    setSearchUserId(selectedUser.id.toString());
                  } else {
                    setSearchUserId('');
                  }
                }}
              />
              <datalist id="user-list">
                {users.map(u => <option key={u.id} value={`${u.name} (${u.role})`} />)}
              </datalist>
            </div>
          </div>

          {userReportData && Object.keys(userReportData).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(userReportData as Record<string, { transactions: any[], totalIncome: number, totalExpense: number }>).map(([month, data]) => (
                <div key={month} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{month}</h3>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-green-600 font-medium">Total Fees/Income: ${data.totalIncome.toFixed(2)}</span>
                      <span className="text-red-600 font-medium">Total Expenses: ${data.totalExpense.toFixed(2)}</span>
                    </div>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(t.date), 'MMM dd, yyyy HH:mm')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.description}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : searchUserId ? (
            <p className="text-gray-500 text-center py-8">No transactions found for this user.</p>
          ) : (
            <p className="text-gray-500 text-center py-8">Select a user to view their transaction report.</p>
          )}
        </div>
      )}

      {view === 'dues' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dues.map((d) => (
                <tr key={d.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.name} ({d.student_id})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.class_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${d.monthly_fee.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">${d.total_paid.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => {
                        setEditingTransactionId(null);

                        setFormData({
                          type: 'income',
                          user_id: d.student_id.toString(),
                          amount: (d.monthly_fee - d.total_paid).toString(),
                          description: `Payment for ${format(new Date(), 'MMMM yyyy')} fee`
                        });

                        setIsModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Collect Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingTransactionId ? 'Update Transaction' : 'Record Transaction'}
            </h2>
            <form
                  onSubmit={async (e) => {
                    if (editingTransactionId !== null) {
                      await updateTransaction(e, editingTransactionId);
                    } else {
                      await handleSubmit(e);
                    }
                  }}
                  className="space-y-4"
                >
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select 
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">User (Optional)</label>
                <select 
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.user_id}
                  onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                >
                  <option value="">-- Select User --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                <input 
                  type="number" step="0.01" min="1" required
                  className= {`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border 
                  ${amountError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300  focus:border-indigo-500 focus:ring-indigo-500"}`}
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({...formData, amount: e.target.value});
                    setAmountError(!value || Number(value) < 1);
                    }}
                />
                {amountError && <p className="text-red-500 text-sm mt-1">Amount must be a greater or equal to 1.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input 
                  type="text" required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => {
                        setIsModalOpen(false);
                        setEditingTransactionId(null);

                        setFormData({
                          type: 'income',
                          user_id: '',
                          amount: '',
                          description: '',
                        });
                      }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingTransactionId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
