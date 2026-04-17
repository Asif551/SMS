import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Edit } from 'lucide-react';

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: 'student',
    name: '',
    email: '',
    student_id: '',
    password: '',
    class_id: '',
    home_town: '',
    nid_birth_cert: '',
    current_address: '',
    previous_school: '',
    parents_name: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  const fetchClasses = async () => {
    const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClasses(await res.json());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const method = editingId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchUsers();
      resetForm();
    } else {
      const data = await res.json();
      setError(data.error || 'An error occurred');
    }
  };

  const handleEdit = (user: any) => {
    setError(null);
    setFormData({
      role: user.role,
      name: user.name,
      email: user.email || '',
      student_id: user.student_id || '',
      password: '',
      class_id: user.class_id || '',
      home_town: user.home_town || '',
      nid_birth_cert: user.nid_birth_cert || '',
      current_address: user.current_address || '',
      previous_school: user.previous_school || '',
      parents_name: user.parents_name || ''
    });
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the user');
    }
  };

  const resetForm = () => {
    setFormData({ 
      role: 'student', name: '', email: '', student_id: '', password: '', class_id: '',
      home_town: '', nid_birth_cert: '', current_address: '', previous_school: '', parents_name: ''
    });
    setEditingId(null);
    setError(null);
  };

  const filteredUsers = users.filter(user => roleFilter === 'all' || user.role === roleFilter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="flex space-x-4">
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="accountant">Accountant</option>
            <option value="admin">Admin</option>
          </select>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700"
          >
            <Plus size={20} className="mr-2" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identifier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || user.student_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.class_id ? classes.find(c => c.id === user.class_id)?.name : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit User' : 'Add New User'}</h2>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    disabled={!!editingId}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input 
                    type="text" required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {formData.role === 'student' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Student ID</label>
                      <input 
                        type="text" required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={formData.student_id}
                        onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Class</label>
                      <select 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={formData.class_id}
                        onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Parents Name</label>
                      <input 
                        type="text" required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={formData.parents_name}
                        onChange={(e) => setFormData({...formData, parents_name: e.target.value})}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Home Town</label>
                  <input 
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.home_town}
                    onChange={(e) => setFormData({...formData, home_town: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">NID / Birth Certificate</label>
                  <input 
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.nid_birth_cert}
                    onChange={(e) => setFormData({...formData, nid_birth_cert: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Current Address</label>
                  <input 
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.current_address}
                    onChange={(e) => setFormData({...formData, current_address: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Previous School</label>
                  <input 
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.previous_school}
                    onChange={(e) => setFormData({...formData, previous_school: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Password {editingId && '(Leave blank to keep current)'}</label>
                  <input 
                    type="password" required={!editingId}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
