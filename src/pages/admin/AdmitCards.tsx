import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, FileText, Plus } from 'lucide-react';
import jsPDF from 'jspdf';

export default function AdmitCards() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', date: '' });
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

  useEffect(() => {
    fetchClasses();
    fetchExams();
  }, []);

  const fetchClasses = async () => {
    const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClasses(await res.json());
  };

  const fetchExams = async () => {
    const res = await fetch('/api/exams', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setExams(await res.json());
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(examForm)
    });
    if (res.ok) {
      setIsExamModalOpen(false);
      setExamForm({ name: '', date: '' });
      fetchExams();
    }
  };

  const generateAdmitCards = async () => {
    if (!selectedClass || !selectedExam) return;
    setIsGenerating(true);
    
    try {
      const res = await fetch(`/api/admit-cards/generate/${selectedExam}/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const cardsPerPage = 8;
      const cardWidth = 95;
      const cardHeight = 65;
      const marginX = 10;
      const marginY = 10;
      const gapX = 5;
      const gapY = 5;

      data.students.forEach((student: any, index: number) => {
        if (index > 0 && index % cardsPerPage === 0) {
          doc.addPage();
        }
        
        const cardIndexOnPage = index % cardsPerPage;
        const col = cardIndexOnPage % 2;
        const row = Math.floor(cardIndexOnPage / 2);
        
        const x = marginX + col * (cardWidth + gapX);
        const y = marginY + row * (cardHeight + gapY);
        
        // Border
        doc.rect(x, y, cardWidth, cardHeight);
        
        // Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${schoolName}`, x + cardWidth / 2, y + 8, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text('ADMIT CARD', x + cardWidth / 2, y + 14, { align: 'center' });
        
        // Details
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Exam: ${data.exam.name}`, x + 5, y + 22);
        doc.text(`Year: ${new Date(data.exam.date).getFullYear()}`, x + 55, y + 22);
        
        doc.text(`Name: ${student.name}`, x + 5, y + 30);
        doc.text(`ID: ${student.student_id}`, x + 55, y + 30);
        
        doc.text(`Class: ${data.classInfo.name}`, x + 5, y + 38);
        
        // Signatures
        doc.line(x + 5, y + 55, x + 35, y + 55);
        doc.text('Student Sign', x + 10, y + 60);
        
        doc.line(x + 55, y + 55, x + 85, y + 55);
        doc.text('Principal Sign', x + 60, y + 60);
      });
      
      doc.save(`Admit_Cards_${data.classInfo.name}_${data.exam.name}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Generate Admit Cards</h1>
        </div>
        <button 
          onClick={() => setIsExamModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700"
        >
          <Plus size={20} className="mr-2" /> Add Exam
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
            <select 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">-- Select Exam --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
            <select 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={generateAdmitCards}
          disabled={!selectedClass || !selectedExam || isGenerating}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            'Generating PDF...'
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Generate & Download PDF
            </>
          )}
        </button>
      </div>

      {isExamModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Exam</h2>
            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Exam Name</label>
                <input 
                  type="text" required placeholder="e.g. Midterm, Final, Class Test"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={examForm.name}
                  onChange={(e) => setExamForm({...examForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Exam Date</label>
                <input 
                  type="date" required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={examForm.date}
                  onChange={(e) => setExamForm({...examForm, date: e.target.value})}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Save Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
