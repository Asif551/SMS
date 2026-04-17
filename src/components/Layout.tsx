import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, DollarSign, 
  FileText, LogOut, Menu, X, Settings
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('EduManage');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.school_name) {
          setSchoolName(data.school_name);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teacher', 'accountant', 'student'] },
    { path: '/admin/users', icon: Users, label: 'Users', roles: ['admin'] },
    { path: '/admin/fees-salaries', icon: DollarSign, label: 'Fees & Salaries', roles: ['admin'] },
    { path: '/teacher/attendance', icon: BookOpen, label: 'Attendance', roles: ['admin', 'teacher'] },
    { path: '/results', icon: FileText, label: 'Result Module', roles: ['admin', 'teacher'] },
    { path: '/staff/salary', icon: DollarSign, label: 'My Salary', roles: ['teacher', 'accountant'] },
    { path: '/accountant/finance', icon: DollarSign, label: 'Finance', roles: ['admin', 'accountant'] },
    { path: '/admin/admit-cards', icon: FileText, label: 'Admit Cards', roles: ['admin'] },
    { path: '/student/dashboard', icon: LayoutDashboard, label: 'My Dashboard', roles: ['student'] },
    { path: '/student/results', icon: FileText, label: 'My Results', roles: ['student'] },
    { path: '/admin/activity-log', icon: FileText, label: 'Activity Log', roles: ['admin', 'accountant'] },
    { path: '/admin/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-indigo-600 truncate" title={schoolName}>{schoolName}</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-indigo-700' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-4 ml-auto">
            <span className="text-sm font-medium text-gray-700">{user?.name} ({user?.role})</span>
            <button
              onClick={handleLogout}
              className="flex items-center text-sm font-medium text-red-600 hover:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
