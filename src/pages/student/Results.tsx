import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function StudentResults() {
  const { token } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [current, setCurrent] = useState<any>(null);
  const [subjectResults, setSubjectResults] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (selectedExam) fetchExamDetails(selectedExam);
  }, [selectedExam]);

  const fetchHistory = async () => {
    const res = await fetch('/api/student/results', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    setHistory(data.history || []);
    if (data.history?.[0]) {
      setSelectedExam(String(data.history[0].exam_id));
      setCurrent(data.history[0]);
    }
  };

  const fetchExamDetails = async (examId: string) => {
    const res = await fetch(`/api/student/results?exam_id=${examId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    setCurrent(data.current);
    setSubjectResults(data.subject_results || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
          <p className="text-sm text-gray-500">View published subject-wise results, overall GPA, grade, and result history.</p>
        </div>
        <select className="rounded-lg border border-gray-300 p-2" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
          {history.map((item) => <option key={item.exam_id} value={item.exam_id}>{item.exam_name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Overall GPA</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{current?.overall_gpa ?? '-'}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Final Grade</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{current?.final_grade ?? '-'}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Percentage</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{current?.overall_percentage ?? '-'}%</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Status</p>
          <p className={`mt-2 text-2xl font-bold ${current?.final_status === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{current?.final_status ?? '-'}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Subject-wise Result</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {subjectResults.map((row) => (
                <tr key={row.subject_name}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.subject_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.marks}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.grade}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.gpa}</td>
                </tr>
              ))}
              {subjectResults.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No published result details found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Result History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GPA</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {history.map((item) => (
                <tr key={item.exam_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.exam_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.exam_date || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.overall_gpa}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.final_grade}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.final_status}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Published results will appear here when your school releases them.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
