import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, Save, History, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ [key: number]: string }>({});
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [view, setView] = useState<'mark' | 'summary' | 'history'>('mark');
  const [summary, setSummary] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      setSelectedStudent('');
    }
    if (selectedClass && view === 'summary') fetchSummary();
  }, [selectedClass, view]);

  useEffect(() => {
    if (selectedStudent && view === 'history') fetchHistory();
  }, [selectedStudent, view]);

  const fetchClasses = async () => {
    const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClasses(await res.json());
  };

  const fetchPeriods = async () => {
    const res = await fetch('/api/periods', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPeriods(await res.json());
  };

  const fetchStudents = async () => {
    const res = await fetch(`/api/students/class/${selectedClass}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setStudents(data);
      const initialAtt: any = {};
      data.forEach((s: any) => initialAtt[s.id] = 'Present');
      setAttendance(initialAtt);
    }
  };

  const fetchSummary = async () => {
    const res = await fetch(`/api/attendance/summary?class_id=${selectedClass}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSummary(await res.json());
  };

  const fetchHistory = async () => {
    const res = await fetch(`/api/attendance/history/${selectedStudent}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setHistory(await res.json());
  };

  const submitAttendance = async () => {
    const records = Object.keys(attendance).map(id => ({
      student_id: parseInt(id),
      status: attendance[parseInt(id)]
    }));

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        class_id: selectedClass,
        period_id: selectedPeriod,
        date,
        records
      })
    });

    if (res.ok) {
      alert('Attendance saved successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
          <button 
            onClick={() => setView('mark')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'mark' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Mark
          </button>
          <button 
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'summary' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Summary
          </button>
          <button 
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'history' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            History
          </button>
        </div>
      </div>

      {view === 'mark' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">Select Period</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input 
                type="date" 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={date} onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {students.length > 0 && selectedPeriod && (
            <div>
              <table className="min-w-full divide-y divide-gray-200 mb-6">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map(student => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.student_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setAttendance({...attendance, [student.id]: 'Present'})}
                            className={`px-3 py-1 rounded-full flex items-center ${attendance[student.id] === 'Present' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                          >
                            <CheckCircle size={16} className="mr-1" /> Present
                          </button>
                          <button
                            onClick={() => setAttendance({...attendance, [student.id]: 'Absent'})}
                            className={`px-3 py-1 rounded-full flex items-center ${attendance[student.id] === 'Absent' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}
                          >
                            <XCircle size={16} className="mr-1" /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <button 
                  onClick={submitAttendance}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-indigo-700"
                >
                  <Save size={20} className="mr-2" /> Save Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'summary' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class</label>
            <select 
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.map(s => {
                const percentage = s.total_days > 0 ? Math.round((s.present_count / s.total_days) * 100) : 0;
                return (
                  <tr key={s.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name} ({s.student_id})</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.total_days}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{s.present_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{s.absent_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div className={`h-2.5 rounded-full ${percentage >= 75 ? 'bg-green-600' : percentage >= 50 ? 'bg-yellow-400' : 'bg-red-600'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'history' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={!selectedClass}
              >
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
              </select>
            </div>
          </div>

          {history.length > 0 && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(h => (
                  <tr key={h.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(h.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{h.period_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${h.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {h.status}
                        </span>
                        <button
                          onClick={async () => {
                            const newStatus = h.status === 'Present' ? 'Absent' : 'Present';
                            const res = await fetch('/api/attendance', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({
                                class_id: h.class_id,
                                period_id: h.period_id,
                                date: h.date,
                                records: [{ student_id: h.student_id, status: newStatus }]
                              })
                            });
                            if (res.ok) fetchHistory();
                          }}
                          className="text-indigo-600 hover:text-indigo-900 text-xs ml-4 underline"
                        >
                          Toggle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
