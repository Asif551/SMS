'use client';

import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Help & Guidelines</h2>
          <button 
            onClick={onClose}
            className="text-4xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 text-gray-700">
          
          <div>
            <h3 className="text-xl font-semibold mb-4">1. Dashboard</h3>
            <p>Overview of the School. Shows quick statistics and visualize data.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">2. User Management (Admin Only)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Add new students, teachers, accountants</li>
              <li>Edit user details</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">3. Fees & Salaries (Admin Only)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Add or edit fees structure for different classes</li>
              <li>Manage employee salaries structure for different employees</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">4. Attendance (Teacher)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>(Mark) - Take daily attendance for students.</li>
              <li>(Summary) - View attendance reports.</li>
              <li>(History) - View and edit attendance records for specific students.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">5. Result Module</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Add exam marks</li>
              <li>Generate report cards</li>
              <li>View individual student results</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">6. Finance Module</h3>
            <p>Complete financial overview, income, expenses, and reports for accountants.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">7. Admit Cards (Admin Only)</h3>
            <p>Generate and download admit cards for examinations.</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">8. Student Portal</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>View own attendance</li>
              <li>Check results</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>F1</strong> — Open this Help window</li>
            </ul>
          </div>

          <div className="bg-gray-100 p-5 rounded-xl">
            <h3 className="font-semibold mb-2">Need Further Help?</h3>
            <p>
                For assistance, please contact your school system administrator.
                If the issue persists, reach our support team at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=asifikbal280@gmail.com" className="text-blue-500 hover:underline">asifikbal280@gmail.com</a>.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center text-sm text-gray-500 bg-gray-50">
          Press <strong>F1</strong> anytime to open this help • EduManage School System
        </div>
      </div>
    </div>
  );
}