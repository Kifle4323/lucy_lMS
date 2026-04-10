import { useState, useEffect } from 'react';
import { getStudentExamSchedules, requestEarlyExam, cancelEarlyExamRequest } from '../api.js';

export default function StudentExamsPage() {
  const [examSchedules, setExamSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadExamSchedules();
  }, []);

  async function loadExamSchedules() {
    try {
      const data = await getStudentExamSchedules();
      setExamSchedules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAgreeEarlyExam(examId) {
    try {
      await requestEarlyExam(examId);
      setSuccess('You have agreed to take the exam early!');
      loadExamSchedules();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelEarlyExam(examId) {
    try {
      await cancelEarlyExamRequest(examId);
      setSuccess('Early exam request cancelled.');
      loadExamSchedules();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  // Group exams by semester
  const examsBySemester = examSchedules.reduce((acc, exam) => {
    const semKey = exam.courseSection?.semester?.id || 'unknown';
    if (!acc[semKey]) {
      acc[semKey] = {
        semester: exam.courseSection?.semester,
        exams: [],
      };
    }
    acc[semKey].exams.push(exam);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Exam Schedule</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {Object.keys(examsBySemester).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No exam schedules available yet.
        </div>
      ) : (
        Object.values(examsBySemester).map(({ semester, exams }) => (
          <div key={semester?.id || 'unknown'} className="mb-8">
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold">{semester?.name || 'Unknown Semester'}</h2>
              <p className="text-sm text-gray-500">{semester?.academicYear?.name}</p>
              {semester?.examPeriodStart && semester?.examPeriodEnd && (
                <p className="text-sm text-red-600 mt-1">
                  Exam Period: {new Date(semester.examPeriodStart).toLocaleDateString()} - {new Date(semester.examPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {exams.map(exam => (
                <div key={exam.id} className="bg-white rounded-lg shadow border overflow-hidden">
                  <div className={`p-3 ${
                    exam.examType === 'FINAL' ? 'bg-red-600' :
                    exam.examType === 'MIDTERM' ? 'bg-yellow-600' :
                    'bg-blue-600'
                  } text-white`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{exam.examType}</span>
                      <span className="text-sm opacity-90">{exam.courseSection?.course?.code}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium text-lg">{exam.title}</h3>
                    <p className="text-sm text-gray-500">{exam.courseSection?.course?.title}</p>

                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">{new Date(exam.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Time:</span>
                        <span className="font-medium">{new Date(exam.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{exam.duration} minutes</span>
                      </div>
                      {exam.location && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Location:</span>
                          <span className="font-medium">{exam.location}</span>
                        </div>
                      )}
                    </div>

                    {exam.instructions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <div className="font-medium text-gray-700 mb-1">Instructions:</div>
                        <p className="text-gray-600">{exam.instructions}</p>
                      </div>
                    )}

                    {/* Early Exam Section */}
                    {exam.isEarlyAllowed && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="font-medium text-green-800 mb-2">Early Exam Available</div>
                        {exam.earlyExamDeadline && (
                          <p className="text-xs text-green-600 mb-2">
                            Request deadline: {new Date(exam.earlyExamDeadline).toLocaleDateString()}
                          </p>
                        )}

                        {exam.myEarlyRequest ? (
                          <div className="flex items-center justify-between">
                            <span className={`text-sm px-2 py-1 rounded ${
                              exam.myEarlyRequest.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                              exam.myEarlyRequest.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {exam.myEarlyRequest.status === 'APPROVED' ? 'Early Exam Approved!' :
                               exam.myEarlyRequest.status === 'REJECTED' ? 'Request Rejected' :
                               'Request Pending'}
                            </span>
                            {exam.myEarlyRequest.status === 'PENDING' && (
                              <button
                                onClick={() => handleCancelEarlyExam(exam.id)}
                                className="text-red-600 hover:underline text-sm"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAgreeEarlyExam(exam.id)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                          >
                            Agree to Take Exam Early
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
