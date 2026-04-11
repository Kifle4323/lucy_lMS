import { useState, useEffect } from 'react';
import { getStudentExamSchedules, respondToEarlyExamProposal } from '../api.js';
import Layout from '../components/Layout';

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

  async function handleRespond(examId, agreed) {
    try {
      await respondToEarlyExamProposal(examId, agreed);
      setSuccess(agreed ? 'You agreed to take the exam early!' : 'You chose to keep the official exam date.');
      loadExamSchedules();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

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
    <Layout>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{semester?.name || 'Unknown Semester'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{semester?.academicYear?.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">Midterm:</span>{' '}
                  <span>{semester?.midtermExamDate ? new Date(semester.midtermExamDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded p-2">
                  <span className="text-red-600 dark:text-red-400 font-medium">Final:</span>{' '}
                  <span>{semester?.finalExamDate ? new Date(semester.finalExamDate).toLocaleDateString() : 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {exams.map(exam => (
                <div key={exam.id} className="bg-white rounded-lg shadow border overflow-hidden">
                  <div className={`p-3 ${
                    exam.examType === 'FINAL' ? 'bg-red-600' : 'bg-yellow-600'
                  } text-white`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{exam.examType} EXAM</span>
                      <span className="text-sm opacity-90">{exam.courseSection?.course?.code}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium text-lg text-gray-900 dark:text-white">{exam.courseSection?.course?.title}</h3>

                    <div className="mt-3 space-y-2 text-sm">
                      {/* Show actual exam date */}
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">Exam Date: </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {exam.actualDate ? new Date(exam.actualDate).toLocaleDateString() : 'Not set'}
                        </span>
                        {exam.earlyExamStatus === 'APPROVED' && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Early Exam
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-300">Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{exam.duration} minutes</span>
                      </div>
                      {exam.location && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-300">Location:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{exam.location}</span>
                        </div>
                      )}
                    </div>

                    {exam.instructions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <div className="font-medium text-gray-700 mb-1">Instructions:</div>
                        <p className="text-gray-600">{exam.instructions}</p>
                      </div>
                    )}

                    {/* Early Exam Proposal Section */}
                    {exam.earlyExamStatus === 'PROPOSED' && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="font-medium text-yellow-800 mb-2">
                          Teacher Proposed Early Exam
                        </div>
                        <div className="text-sm text-yellow-700 mb-2">
                          <p><strong>Proposed Date:</strong> {exam.proposedDate ? new Date(exam.proposedDate).toLocaleDateString() : 'N/A'}</p>
                          <p><strong>Official Date:</strong> {exam.officialDate ? new Date(exam.officialDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        {exam.proposalDeadline && (
                          <p className="text-xs text-yellow-600 mb-3">
                            Respond by: {new Date(exam.proposalDeadline).toLocaleDateString()}
                          </p>
                        )}

                        {exam.myResponse ? (
                          <div className={`text-sm px-3 py-2 rounded ${
                            exam.myResponse.agreed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {exam.myResponse.agreed
                              ? 'You agreed to take the exam early'
                              : 'You chose to keep the official date'}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(exam.id, true)}
                              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                            >
                              Agree to Early Date
                            </button>
                            <button
                              onClick={() => handleRespond(exam.id, false)}
                              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
                            >
                              Keep Official Date
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Confirmed Early Exam */}
                    {exam.earlyExamStatus === 'APPROVED' && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="font-medium text-green-800">
                          Early Exam Confirmed!
                        </div>
                        <p className="text-sm text-green-700">
                          All students agreed. Exam will be held on {exam.proposedDate ? new Date(exam.proposedDate).toLocaleDateString() : 'the proposed date'}.
                        </p>
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
    </Layout>
  );
}
