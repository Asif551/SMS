import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(err => console.error(err));
    }
  }, [user, token]);

  const stats = dashboardData ? [
    { label: 'Total Students', value: dashboardData.totalStudents, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: dashboardData.totalTeachers, icon: BookOpen, color: 'bg-green-500' },
    { label: 'Revenue', value: `$${dashboardData.revenue.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500' },
    { label: 'Classes', value: dashboardData.totalClasses, icon: Calendar, color: 'bg-orange-500' },
  ] : [
    { label: 'Total Students', value: '-', icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: '-', icon: BookOpen, color: 'bg-green-500' },
    { label: 'Revenue', value: '-', icon: DollarSign, color: 'bg-purple-500' },
    { label: 'Classes', value: '-', icon: Calendar, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
      
      {user?.role === 'admin' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {dashboardData?.monthlyRevenue && dashboardData.monthlyRevenue.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Revenue Overview</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [`$${value}`, 'Revenue']} />
                    <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {user?.role === 'teacher' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <p className="text-gray-600">Use Attendance for daily records and Result Module to submit marks, review class performance, and finalize draft results.</p>
        </div>
      )}

      {user?.role === 'accountant' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Financial Overview</h2>
          <p className="text-gray-600">Navigate to Finance to manage income and expenses.</p>
        </div>
      )}

      {user?.role === 'student' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Academic Progress</h2>
          <p className="text-gray-600">Check My Results for published grades, GPA, subject-wise marks, and your complete result history.</p>
        </div>
      )}
    </div>
  );
}
