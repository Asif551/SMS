import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save } from 'lucide-react';

export default function Settings() {
  const { token } = useAuth();
  const [schoolName, setSchoolName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'school_name', value: schoolName })
      });
      
      if (res.ok) {
        setMessage('Settings saved successfully. Refresh the page to see changes.');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      setMessage('An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Name
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name"
            />
            <p className="mt-2 text-sm text-gray-500">
              This name will be highlighted in the web app header.
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded-md ${message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={20} className="mr-2" /> 
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
