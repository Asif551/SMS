import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, CheckCircle, History, Save, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ [key: number]: string }>({});
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [view, setView] = useState<'mark' | 'summary' | 'history'>('mark');
  const [summary, setSummary] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const jsonHeaders = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass);
      fetchStudents(selectedClass);
      setSelectedSubject('');
      setSelectedStudent('');
    } else {
      setSubjects([]);
      setStudents([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && view === 'summary') fetchSummary();
  }, [selectedClass, view]);

  useEffect(() => {
    if (selectedStudent && view === 'history') fetchHistory();
  }, [selectedStudent, view]);

  const fetchClasses = async () => {
    const res = await fetch('/api/classes', { headers: authHeaders });
    if (!res.ok) return;
    const data = await res.json();
    setClasses(data);
    if (data[0]) setSelectedClass(String(data[0].id));
  };

  const fetchSubjects = async (classId: string) => {
    const res = await fetch(`/api/subjects?class_id=${classId}`, { headers: authHeaders });
    if (!res.ok) return;
    const data = await res.json();
    setSubjects(data);
    if (data[0]) setSelectedSubject(String(data[0].id));
  };

  const fetchStudents = async (classId: string) => {
    const res = await fetch(`/api/students/class/${classId}`, { headers: authHeaders });
    if (!res.ok) return;
    const data = await res.json();
    setStudents(data);
    const initialAttendance: { [key: number]: string } = {};
    data.forEach((student: any) => {
      initialAttendance[student.id] = 'Present';
    });
    setAttendance(initialAttendance);
  };

  const fetchSummary = async () => {
    const res = await fetch(`/api/attendance/summary?class_id=${selectedClass}`, { headers: authHeaders });
    if (res.ok) setSummary(await res.json());
  };

  const fetchHistory = async () => {
    const res = await fetch(`/api/attendance/history/${selectedStudent}`, { headers: authHeaders });
    if (res.ok) setHistory(await res.json());
  };

  const submitAttendance = async () => {
    setError(null);
    setMessage(null);

    if (!selectedClass || !selectedSubject) {
      setError('Select a class and subject before saving attendance.');
      return;
    }

    const records = Object.keys(attendance).map((id) => ({
      student_id: Number(id),
      status: attendance[Number(id)],
    }));

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        date,
        records,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Failed to save attendance.');
      return;
    }

    setMessage('Attendance saved successfully.');
    if (view === 'summary') fetchSummary();
  };

  const toggleHistoryStatus = async (record: any) => {
    const nextStatus = record.status === 'Present' ? 'Absent' : 'Present';
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        class_id: record.class_id,
        subject_id: record.subject_id,
        date: record.date,
        records: [{ student_id: record.student_id, status: nextStatus }],
      }),
    });
    if (res.ok) fetchHistory();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <div className="flex rounded-lg bg-white p-1 shadow-sm">
          {[
            { key: 'mark', label: 'Mark', icon: CheckCircle },
            { key: 'summary', label: 'Summary', icon: BarChart2 },
            { key: 'history', label: 'History', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key as any)}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${view === item.key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      {view === 'mark' && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Class</label>
              <select className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
              <select className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!subjects.length}>
                <option value="">Select Subject</option>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Date</label>
              <input type="date" className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {students.length > 0 && selectedSubject ? (
            <div>
              <div className="overflow-x-auto">
                <table className="mb-6 min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{student.student_id}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setAttendance({ ...attendance, [student.id]: 'Present' })} className={`inline-flex items-center rounded-full px-3 py-1 ${attendance[student.id] === 'Present' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                              <CheckCircle size={16} className="mr-1" /> Present
                            </button>
                            <button onClick={() => setAttendance({ ...attendance, [student.id]: 'Absent' })} className={`inline-flex items-center rounded-full px-3 py-1 ${attendance[student.id] === 'Absent' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}>
                              <XCircle size={16} className="mr-1" /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button onClick={submitAttendance} className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700">
                  <Save size={20} className="mr-2" /> Save Attendance
                </button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Select a class and subject to load students.</p>
          )}
        </div>
      )}

      {view === 'summary' && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 max-w-xs">
            <label className="mb-2 block text-sm font-medium text-gray-700">Filter by Class</label>
            <select className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Classes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Present</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {summary.map((item) => {
                  const percentage = item.total_days > 0 ? Math.round((item.present_count / item.total_days) * 100) : 0;
                  return (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.name} ({item.student_id})</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.total_days}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">{item.present_count}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">{item.absent_count}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="mr-2 h-2.5 w-full rounded-full bg-gray-200">
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
        </div>
      )}

      {view === 'history' && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Class</label>
              <select className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Student</label>
              <select className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
                <option value="">Select Student</option>
                {students.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.student_id})</option>)}
              </select>
            </div>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{format(new Date(item.date), 'MMM dd, yyyy')}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.subject_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${item.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.status}
                          </span>
                          <button onClick={() => toggleHistoryStatus(item)} className="text-xs text-indigo-600 underline hover:text-indigo-900">Toggle</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Select a student to view attendance history.</p>
          )}
        </div>
      )}
    </div>
  );
}
