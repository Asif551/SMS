import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, ClipboardCheck, Edit, Eye, LineChart, Plus, Save, Send, Trash2 } from 'lucide-react';

type ViewMode = 'entry' | 'overview' | 'performance' | 'subjects';

export default function ResultManagement() {
  const { token, user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [resultView, setResultView] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classForm, setClassForm] = useState({ id: 0, name: '' });
  const [subjectForm, setSubjectForm] = useState({ id: 0, name: '' });
  const [examForm, setExamForm] = useState({ name: '', date: '' });
  const [draftMarks, setDraftMarks] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>(user?.role === 'admin' ? 'subjects' : 'entry');

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  useEffect(() => {
    fetchBootstrap();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setSubjectForm({ id: 0, name: '' });
      fetchSubjects(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedExam) {
      fetchOverview(selectedClass, selectedExam);
      if (selectedSubject) {
        fetchEntries(selectedClass, selectedExam, selectedSubject);
        fetchPerformance(selectedClass, selectedExam, selectedSubject);
      }
    }
  }, [selectedClass, selectedExam, selectedSubject]);

  const fetchBootstrap = async () => {
    const [classRes, examRes] = await Promise.all([
      fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/exams', { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (classRes.ok) {
      const classData = await classRes.json();
      setClasses(classData);
      if (classData[0]) setSelectedClass(String(classData[0].id));
    }

    if (examRes.ok) {
      const examData = await examRes.json();
      setExams(examData);
      if (examData[0]) setSelectedExam(String(examData[0].id));
    }
  };

  const fetchSubjects = async (classId: string) => {
    const res = await fetch(`/api/subjects?class_id=${classId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    setSubjects(data);
    if (data.length > 0) {
      setSelectedSubject((prev) => {
        const exists = data.some((item: any) => String(item.id) === prev);
        return exists ? prev : String(data[0].id);
      });
    } else {
      setSelectedSubject('');
    }
  };

  const fetchEntries = async (classId: string, examId: string, subjectId: string) => {
    const res = await fetch(`/api/marks?class_id=${classId}&exam_id=${examId}&subject_id=${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setEntries(data.entries || []);
    const nextDrafts: Record<number, string> = {};
    (data.entries || []).forEach((entry: any) => {
      nextDrafts[entry.student_id] = entry.marks !== null ? String(entry.marks) : '';
    });
    setDraftMarks(nextDrafts);
  };

  const fetchOverview = async (classId: string, examId: string) => {
    const res = await fetch(`/api/results/class-view?class_id=${classId}&exam_id=${examId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    setResultView(await res.json());
  };

  const fetchPerformance = async (classId: string, examId: string, subjectId: string) => {
    const res = await fetch(`/api/results/subject-performance?class_id=${classId}&exam_id=${examId}&subject_id=${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    setPerformance(await res.json());
  };

  const saveMark = async (studentId: number) => {
    setError(null);
    setMessage(null);
    if (draftMarks[studentId] === '' || draftMarks[studentId] === undefined) {
      setError('Enter marks before saving.');
      return;
    }
    const res = await fetch('/api/marks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        student_id: studentId,
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        exam_id: Number(selectedExam),
        marks: Number(draftMarks[studentId]),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save mark.');
      return;
    }
    setMessage('Marks saved and result recalculated.');
    fetchEntries(selectedClass, selectedExam, selectedSubject);
    fetchOverview(selectedClass, selectedExam);
    fetchPerformance(selectedClass, selectedExam, selectedSubject);
  };

  const saveAllMarks = async () => {
    setError(null);
    setMessage(null);

    const marks = entries
      .map((entry) => ({ student_id: entry.student_id, marks: draftMarks[entry.student_id] }))
      .filter((entry) => entry.marks !== '' && entry.marks !== undefined)
      .map((entry) => ({ student_id: entry.student_id, marks: Number(entry.marks) }));

    if (!marks.length) {
      setError('Enter at least one mark before saving all.');
      return;
    }

    if (marks.some((entry) => Number.isNaN(entry.marks) || entry.marks < 0 || entry.marks > 100)) {
      setError('All entered marks must be between 0 and 100.');
      return;
    }

    const res = await fetch('/api/marks/bulk', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        exam_id: Number(selectedExam),
        marks,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save marks.');
      return;
    }
    setMessage(`Saved ${data.count} mark${data.count === 1 ? '' : 's'} and recalculated results.`);
    fetchEntries(selectedClass, selectedExam, selectedSubject);
    fetchOverview(selectedClass, selectedExam);
    fetchPerformance(selectedClass, selectedExam, selectedSubject);
  };

  const submitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = classForm.id ? `/api/classes/${classForm.id}` : '/api/classes';
    const method = classForm.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ name: classForm.name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save class.');
      return;
    }
    setClassForm({ id: 0, name: '' });
    setMessage('Class saved successfully.');
    fetchBootstrap();
  };

  const deleteClass = async (id: number) => {
    if (!confirm('Delete this class and its subjects, result records, fee structure, and attendance records?')) return;
    const res = await fetch(`/api/classes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to delete class.');
      return;
    }
    setClassForm({ id: 0, name: '' });
    setMessage('Class deleted successfully.');
    fetchBootstrap();
  };

  const submitSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = subjectForm.id ? `/api/subjects/${subjectForm.id}` : '/api/subjects';
    const method = subjectForm.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ name: subjectForm.name, class_id: Number(selectedClass) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save subject.');
      return;
    }
    setSubjectForm({ id: 0, name: '' });
    setMessage('Subject saved successfully.');
    fetchSubjects(selectedClass);
    fetchOverview(selectedClass, selectedExam);
  };

  const deleteSubject = async (id: number) => {
    if (!confirm('Delete this subject? Existing marks for this subject will be removed.')) return;
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to delete subject.');
      return;
    }
    setMessage('Subject deleted successfully.');
    fetchSubjects(selectedClass);
    fetchOverview(selectedClass, selectedExam);
  };

  const submitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/exams', { method: 'POST', headers, body: JSON.stringify(examForm) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to create exam.');
      return;
    }
    setExamForm({ name: '', date: '' });
    setMessage('Exam created successfully.');
    fetchBootstrap();
  };

  const updatePublication = async (state: 'draft' | 'published') => {
    const res = await fetch('/api/results/publication', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ class_id: Number(selectedClass), exam_id: Number(selectedExam), state }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to update publication.');
      return;
    }
    setMessage(`Result state changed to ${state}.`);
    fetchOverview(selectedClass, selectedExam);
  };

  const publicationState = resultView?.publication?.state || 'draft';
  const availableViews: ViewMode[] = user?.role === 'admin' ? ['subjects', 'entry', 'overview', 'performance'] : ['entry', 'overview', 'performance'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Result Management</h1>
          <p className="text-sm text-gray-500">Manage classes and subjects, submit marks, review performance, and publish final results.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select className="rounded-lg border border-gray-300 p-2" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="rounded-lg border border-gray-300 p-2" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
            {exams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="rounded-lg border border-gray-300 p-2" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!subjects.length}>
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableViews.map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${view === item ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow-sm'}`}
          >
            {item === 'entry' && <span className="inline-flex items-center gap-2"><ClipboardCheck size={16} /> Mark Entry</span>}
            {item === 'overview' && <span className="inline-flex items-center gap-2"><Eye size={16} /> Results</span>}
            {item === 'performance' && <span className="inline-flex items-center gap-2"><LineChart size={16} /> Performance</span>}
            {item === 'subjects' && <span className="inline-flex items-center gap-2"><BookOpen size={16} /> Classes & Subjects</span>}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      {view === 'subjects' && user?.role === 'admin' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Classes</h2>
            <form onSubmit={submitClass} className="mb-6 flex flex-col gap-3 sm:flex-row">
              <input className="flex-1 rounded-lg border border-gray-300 p-2" placeholder="Class name" value={classForm.name} onChange={(e) => setClassForm((prev) => ({ ...prev, name: e.target.value }))} required />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white"><Plus size={16} />{classForm.id ? 'Update' : 'Add'}</button>
            </form>
            <div className="space-y-3">
              {classes.map((item) => (
                <div key={item.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${String(item.id) === selectedClass ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'}`}>
                  <button className="text-left font-medium text-gray-800" onClick={() => setSelectedClass(String(item.id))}>{item.name}</button>
                  <div className="flex items-center gap-3">
                    <button className="text-indigo-600" title="Edit class" onClick={() => setClassForm({ id: item.id, name: item.name })}><Edit size={16} /></button>
                    <button className="text-red-600" title="Delete class" onClick={() => deleteClass(item.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {classes.length === 0 && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No classes found.</p>}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Class Subjects</h2>
            <form onSubmit={submitSubject} className="mb-6 flex flex-col gap-3 sm:flex-row">
              <input className="flex-1 rounded-lg border border-gray-300 p-2" placeholder="Subject name" value={subjectForm.name} onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))} required />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white"><Plus size={16} />{subjectForm.id ? 'Update' : 'Add'}</button>
            </form>
            <div className="space-y-3">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                  <span className="font-medium text-gray-800">{subject.name}</span>
                  <div className="flex gap-3">
                    <button className="text-sm text-indigo-600" onClick={() => setSubjectForm({ id: subject.id, name: subject.name })}>Edit</button>
                    <button className="text-sm text-red-600" onClick={() => deleteSubject(subject.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No subjects assigned to this class.</p>}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Publication Control</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${publicationState === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{publicationState}</span>
              </div>
              <div className="flex gap-3">
                <button className="rounded-lg bg-yellow-500 px-4 py-2 text-white" onClick={() => updatePublication('draft')}>Set Draft</button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white" onClick={() => updatePublication('published')}><Send size={16} />Publish Results</button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Exam / Term</h2>
              <form onSubmit={submitExam} className="grid gap-3">
                <input className="rounded-lg border border-gray-300 p-2" placeholder="Exam name" value={examForm.name} onChange={(e) => setExamForm((prev) => ({ ...prev, name: e.target.value }))} required />
                <input className="rounded-lg border border-gray-300 p-2" type="date" value={examForm.date} onChange={(e) => setExamForm((prev) => ({ ...prev, date: e.target.value }))} required />
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Create Exam</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {view === 'entry' && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Mark Entry</h2>
            <p className="text-sm text-gray-500">Marks are validated from 0 to 100 and instantly recalculate subject grade and overall GPA.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GPA</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {entries.map((entry) => (
                  <tr key={entry.student_id}>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{entry.student_name}</div>
                      <div className="text-xs text-gray-500">{entry.student_identifier}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <input className="w-28 rounded-lg border border-gray-300 p-2" type="number" min={0} max={100} value={draftMarks[entry.student_id] ?? ''} onChange={(e) => setDraftMarks((prev) => ({ ...prev, [entry.student_id]: e.target.value }))} disabled={publicationState === 'published'} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.grade || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{entry.gpa ?? '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300" onClick={() => saveMark(entry.student_id)} disabled={publicationState === 'published'}>
                        <Save size={16} />
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Select class, exam, and subject to start entering marks.</td></tr>}
              </tbody>
            </table>
          </div>
          {entries.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">Bulk save sends all entered marks for this class, exam, and subject in one request.</p>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:bg-gray-300" onClick={saveAllMarks} disabled={publicationState === 'published'}>
                <Save size={16} />
                Save All Marks
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'overview' && resultView && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Class Result Sheet</h2>
              <p className="text-sm text-gray-500">{resultView.class?.name} - {resultView.exam?.name}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${publicationState === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{publicationState}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                  {resultView.subjects?.map((subject: any) => <th key={subject.id} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{subject.name}</th>)}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GPA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Final Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {resultView.rows?.map((row: any) => (
                  <tr key={row.student_id}>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{row.student_name}</div>
                      <div className="text-xs text-gray-500">{row.student_identifier}</div>
                    </td>
                    {row.subject_results.map((subject: any) => <td key={subject.subject_id} className="px-4 py-4 text-sm text-gray-700"><div>{subject.marks ?? '-'}</div><div className="text-xs text-gray-500">{subject.grade || '-'}</div></td>)}
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{row.overall_gpa ?? '-'}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{row.final_grade ?? '-'}</td>
                    <td className="px-4 py-4 text-sm"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.final_status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.final_status || 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'performance' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Entries</p><p className="mt-2 text-2xl font-bold text-gray-900">{performance?.summary?.entries ?? 0}</p></div>
            <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Average</p><p className="mt-2 text-2xl font-bold text-gray-900">{performance?.summary?.average ?? 0}</p></div>
            <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Highest</p><p className="mt-2 text-2xl font-bold text-gray-900">{performance?.summary?.highest ?? 0}</p></div>
            <div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Pass Rate</p><p className="mt-2 text-2xl font-bold text-gray-900">{performance?.summary?.passRate ?? 0}%</p></div>
          </div>
          <div className="rounded-xl bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4"><h2 className="text-lg font-semibold text-gray-900">Subject Performance</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {performance?.rows?.map((row: any) => (
                    <tr key={row.student_identifier}>
                      <td className="px-6 py-4 text-sm text-gray-700"><div className="font-medium text-gray-900">{row.student_name}</div><div className="text-xs text-gray-500">{row.student_identifier}</div></td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.marks}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.grade}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.gpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
