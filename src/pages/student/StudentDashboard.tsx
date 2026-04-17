import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, DollarSign, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { token } = useAuth();
  const [feeInfo, setFeeInfo] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);
  const [latestSubjects, setLatestSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetchFees();
    fetchAttendance();
    fetchResults();
  }, []);

  const fetchFees = async () => {
    const res = await fetch('/api/student/fees', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setFeeInfo(data.feeInfo);
      setPaymentHistory(data.history);
    }
  };

  const fetchAttendance = async () => {
    const res = await fetch('/api/student/attendance', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAttendanceHistory(await res.json());
  };

  const fetchResults = async () => {
    const historyRes = await fetch('/api/student/results', { headers: { Authorization: `Bearer ${token}` } });
    if (!historyRes.ok) return;
    const historyData = await historyRes.json();
    if (historyData.current) {
      setLatestResult(historyData.current);
      const detailsRes = await fetch(`/api/student/results?exam_id=${historyData.current.exam_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setLatestSubjects(detailsData.subject_results || []);
      }
    }
  };

  const presentCount = attendanceHistory.filter(a => a.status === 'Present').length;
  const absentCount = attendanceHistory.filter(a => a.status === 'Absent').length;
  const totalDays = presentCount + absentCount;
  const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-6 w-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Attendance Summary</h2>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900">{totalDays}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Attendance Rate</p>
              <p className={`text-2xl font-bold ${attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                {attendancePercentage}%
              </p>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div className={`h-2.5 rounded-full ${attendancePercentage >= 75 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${attendancePercentage}%` }}></div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="flex items-center text-green-600"><CheckCircle size={16} className="mr-1" /> {presentCount} Present</span>
            <span className="flex items-center text-red-600"><XCircle size={16} className="mr-1" /> {absentCount} Absent</span>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="h-6 w-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Fee Status</h2>
          </div>
          
          {feeInfo && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Monthly Fee</span>
                <span className="font-bold text-gray-900">${feeInfo.monthly_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-green-700">Total Paid</span>
                <span className="font-bold text-green-700">${feeInfo.total_paid.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Latest Published Result</h2>
            <p className="text-sm text-gray-500">{latestResult?.exam_name || 'No published result yet'}</p>
          </div>
          {latestResult && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${latestResult.final_status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {latestResult.final_status}
            </span>
          )}
        </div>

        {latestResult ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Overall GPA</p>
                <p className="text-2xl font-bold text-gray-900">{latestResult.overall_gpa}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Final Grade</p>
                <p className="text-2xl font-bold text-gray-900">{latestResult.final_grade}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Overall Percentage</p>
                <p className="text-2xl font-bold text-gray-900">{latestResult.overall_percentage}%</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GPA</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {latestSubjects.map((subject) => (
                    <tr key={subject.subject_name}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{subject.subject_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{subject.marks}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{subject.grade}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{subject.gpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Your school has not published any results yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Attendance</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceHistory.slice(0, 10).map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(a.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.period_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${a.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentHistory.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        {format(new Date(p.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      ${p.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {paymentHistory.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No payment history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
