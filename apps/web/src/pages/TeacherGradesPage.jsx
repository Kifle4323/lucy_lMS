import { useState, useEffect } from 'react';
import {
  getTeacherSections, getSectionStudents, enterGrade, submitSectionGrades,
  createExamSchedule, getSectionExamSchedules, updateExamSchedule, deleteExamSchedule,
  getEarlyExamRequests, approveEarlyExam
} from '../api.js';

export default function TeacherGradesPage() {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [earlyRequests, setEarlyRequests] = useState(null);
  const [activeTab, setActiveTab] = useState('grades');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam schedule form
  const [examForm, setExamForm] = useState({
    examType: 'MIDTERM',
    title: '',
    scheduledDate: '',
    duration: 60,
    location: '',
    instructions: '',
    isEarlyAllowed: false,
    earlyExamDeadline: '',
  });
  const [editingExam, setEditingExam] = useState(null);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const data = await getTeacherSections();
      setSections(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectSection(section) {
    setSelectedSection(section);
    setActiveTab('grades');
    setSuccess('');
    setError('');
    setEarlyRequests(null);
    try {
      const [studentsData, examsData] = await Promise.all([
        getSectionStudents(section.id),
        getSectionExamSchedules(section.id)
      ]);
      setStudents(studentsData);
      setExamSchedules(examsData);
    } catch (err) {
      setError(err.message);
    }
  }

  function updateStudentGrade(studentId, field, value) {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          grade: {
            ...s.grade,
            [field]: value === '' ? null : parseInt(value, 10)
          }
        };
      }
      return s;
    }));
  }

  async function saveGrade(student) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const gradeData = {
        enrollmentId: student.id,
        quizScore: student.grade?.quizScore,
        midtermScore: student.grade?.midtermScore,
        finalScore: student.grade?.finalScore,
        attendanceScore: student.grade?.attendanceScore,
        feedback: student.grade?.feedback
      };
      await enterGrade(gradeData);
      setSuccess('Grade saved successfully!');
      // Refresh data
      const data = await getSectionStudents(selectedSection.id);
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAllGrades() {
    if (!confirm('Submit all grades? This will lock the grades and students will be able to see them once published by admin.')) return;
    try {
      await submitSectionGrades(selectedSection.id);
      setSuccess('Grades submitted successfully!');
      // Refresh
      const data = await getSectionStudents(selectedSection.id);
      setStudents(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // Exam Schedule functions
  async function handleCreateExam(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...examForm,
        courseSectionId: selectedSection.id,
      };
      const newExam = await createExamSchedule(data);
      setExamSchedules([...examSchedules, newExam]);
      setExamForm({
        examType: 'MIDTERM',
        title: '',
        scheduledDate: '',
        duration: 60,
        location: '',
        instructions: '',
        isEarlyAllowed: false,
        earlyExamDeadline: '',
      });
      setSuccess('Exam schedule created!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateExam(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateExamSchedule(editingExam.id, examForm);
      setExamSchedules(examSchedules.map(ex => ex.id === updated.id ? updated : ex));
      setEditingExam(null);
      setExamForm({
        examType: 'MIDTERM',
        title: '',
        scheduledDate: '',
        duration: 60,
        location: '',
        instructions: '',
        isEarlyAllowed: false,
        earlyExamDeadline: '',
      });
      setSuccess('Exam schedule updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExam(examId) {
    if (!confirm('Delete this exam schedule?')) return;
    try {
      await deleteExamSchedule(examId);
      setExamSchedules(examSchedules.filter(ex => ex.id !== examId));
      setSuccess('Exam schedule deleted!');
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditExam(exam) {
    setEditingExam(exam);
    setExamForm({
      examType: exam.examType,
      title: exam.title,
      scheduledDate: exam.scheduledDate.split('T')[0],
      duration: exam.duration,
      location: exam.location || '',
      instructions: exam.instructions || '',
      isEarlyAllowed: exam.isEarlyAllowed,
      earlyExamDeadline: exam.earlyExamDeadline?.split('T')[0] || '',
    });
  }

  async function loadEarlyRequests(examId) {
    try {
      const data = await getEarlyExamRequests(examId);
      setEarlyRequests(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApproveEarlyExam(examId) {
    if (!confirm('Approve early exam for all students who agreed?')) return;
    try {
      await approveEarlyExam(examId);
      setSuccess('Early exam approved!');
      loadEarlyRequests(examId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Grade Management</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sections List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">My Course Sections</h2>
          <div className="space-y-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => selectSection(section)}
                className={`w-full text-left p-3 rounded border ${
                  selectedSection?.id === section.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{section.course?.title}</div>
                <div className="text-sm text-gray-500">
                  {section.sectionCode} | {section.semester?.name}
                </div>
                <div className="text-xs text-gray-400">
                  {section._count?.enrollments || 0} students
                </div>
              </button>
            ))}
            {sections.length === 0 && (
              <p className="text-gray-500 text-sm">No course sections assigned.</p>
            )}
          </div>
        </div>

        {/* Students & Grades */}
        <div className="md:col-span-3">
          {selectedSection ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedSection.course?.title}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedSection.sectionCode} | {selectedSection.semester?.name}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-4 border-b">
                <button
                  onClick={() => setActiveTab('grades')}
                  className={`pb-2 px-4 ${activeTab === 'grades' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                >
                  Grades
                </button>
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`pb-2 px-4 ${activeTab === 'exams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                >
                  Exam Schedules
                </button>
              </div>

              {/* Grades Tab */}
              {activeTab === 'grades' && (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={submitAllGrades}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Submit All Grades
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3">Student</th>
                          <th className="text-center p-3">Quiz<br/><span className="text-xs text-gray-400">/100</span></th>
                          <th className="text-center p-3">Midterm<br/><span className="text-xs text-gray-400">/100</span></th>
                          <th className="text-center p-3">Final<br/><span className="text-xs text-gray-400">/100</span></th>
                          <th className="text-center p-3">Attendance<br/><span className="text-xs text-gray-400">/100</span></th>
                          <th className="text-center p-3">Total</th>
                          <th className="text-center p-3">Grade</th>
                          <th className="text-center p-3">Status</th>
                          <th className="text-center p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium">{student.student?.fullName}</div>
                              <div className="text-xs text-gray-500">{student.student?.email}</div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={student.grade?.quizScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'quizScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border rounded px-2 py-1 text-center disabled:bg-gray-100"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={student.grade?.midtermScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'midtermScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border rounded px-2 py-1 text-center disabled:bg-gray-100"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={student.grade?.finalScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'finalScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border rounded px-2 py-1 text-center disabled:bg-gray-100"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={student.grade?.attendanceScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'attendanceScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border rounded px-2 py-1 text-center disabled:bg-gray-100"
                              />
                            </td>
                            <td className="p-3 text-center font-medium">
                              {student.grade?.totalScore ?? '-'}
                            </td>
                            <td className="p-3 text-center">
                              {student.grade?.gradeLetter ? (
                                <span className={`px-2 py-1 rounded text-white ${
                                  student.grade.gradeLetter.startsWith('A') ? 'bg-green-600' :
                                  student.grade.gradeLetter.startsWith('B') ? 'bg-blue-600' :
                                  student.grade.gradeLetter.startsWith('C') ? 'bg-yellow-600' :
                                  student.grade.gradeLetter === 'D' ? 'bg-orange-600' :
                                  'bg-red-600'
                                }`}>
                                  {student.grade.gradeLetter}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {student.grade?.isSubmitted ? (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Submitted</span>
                              ) : student.grade ? (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Draft</span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">No Grade</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => saveGrade(student)}
                                disabled={saving || student.grade?.isSubmitted}
                                className="text-blue-600 hover:underline disabled:text-gray-400 text-sm"
                              >
                                Save
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {students.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No students enrolled in this section.</p>
                  )}
                </>
              )}

              {/* Exams Tab */}
              {activeTab === 'exams' && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Exam Form */}
                  <div className="border rounded p-4">
                    <h3 className="font-semibold mb-4">
                      {editingExam ? 'Edit Exam Schedule' : 'Schedule New Exam'}
                    </h3>
                    <form onSubmit={editingExam ? handleUpdateExam : handleCreateExam} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Exam Type</label>
                          <select
                            value={examForm.examType}
                            onChange={e => setExamForm({ ...examForm, examType: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                          >
                            <option value="QUIZ">Quiz</option>
                            <option value="MIDTERM">Midterm</option>
                            <option value="FINAL">Final</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Duration (min)</label>
                          <input
                            type="number"
                            min="1"
                            value={examForm.duration}
                            onChange={e => setExamForm({ ...examForm, duration: parseInt(e.target.value) })}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                          type="text"
                          value={examForm.title}
                          onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="e.g., Midterm Exam"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={examForm.scheduledDate}
                          onChange={e => setExamForm({ ...examForm, scheduledDate: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <input
                          type="text"
                          value={examForm.location}
                          onChange={e => setExamForm({ ...examForm, location: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="e.g., Room 101"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Instructions</label>
                        <textarea
                          value={examForm.instructions}
                          onChange={e => setExamForm({ ...examForm, instructions: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          rows={3}
                          placeholder="Exam instructions for students..."
                        />
                      </div>
                      <div className="border-t pt-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={examForm.isEarlyAllowed}
                            onChange={e => setExamForm({ ...examForm, isEarlyAllowed: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Allow students to request early exam</span>
                        </label>
                        {examForm.isEarlyAllowed && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium mb-1">Early Request Deadline</label>
                            <input
                              type="date"
                              value={examForm.earlyExamDeadline}
                              onChange={e => setExamForm({ ...examForm, earlyExamDeadline: e.target.value })}
                              className="w-full border rounded px-3 py-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">Students must agree before this date</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {editingExam ? 'Update' : 'Create'}
                        </button>
                        {editingExam && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExam(null);
                              setExamForm({
                                examType: 'MIDTERM',
                                title: '',
                                scheduledDate: '',
                                duration: 60,
                                location: '',
                                instructions: '',
                                isEarlyAllowed: false,
                                earlyExamDeadline: '',
                              });
                            }}
                            className="px-4 py-2 border rounded"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Exam List */}
                  <div>
                    <h3 className="font-semibold mb-4">Scheduled Exams</h3>
                    <div className="space-y-3">
                      {examSchedules.map(exam => (
                        <div key={exam.id} className="border rounded p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                exam.examType === 'FINAL' ? 'bg-red-100 text-red-700' :
                                exam.examType === 'MIDTERM' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {exam.examType}
                              </span>
                              <h4 className="font-medium mt-1">{exam.title}</h4>
                              <p className="text-sm text-gray-500">
                                {new Date(exam.scheduledDate).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                Duration: {exam.duration} min | {exam.location || 'Location TBD'}
                              </p>
                              {exam.isEarlyAllowed && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-1 inline-block">
                                  Early Exam Allowed
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditExam(exam)}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-red-600 hover:underline text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {exam.isEarlyAllowed && (
                            <div className="mt-3 pt-3 border-t">
                              <button
                                onClick={() => loadEarlyRequests(exam.id)}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Early Requests ({exam._count?.earlyRequests || 0} students)
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {examSchedules.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No exams scheduled yet.</p>
                      )}
                    </div>

                    {/* Early Requests Modal/Panel */}
                    {earlyRequests && (
                      <div className="mt-4 border rounded p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">Early Exam Requests</h4>
                          <button
                            onClick={() => setEarlyRequests(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Close
                          </button>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm">
                            <strong>{earlyRequests.agreedCount}</strong> of <strong>{earlyRequests.totalStudents}</strong> students agreed
                          </p>
                          {earlyRequests.allAgreed ? (
                            <p className="text-sm text-green-600 font-medium">All students have agreed!</p>
                          ) : (
                            <p className="text-sm text-yellow-600">Waiting for all students to agree</p>
                          )}
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {earlyRequests.students?.map(s => (
                            <div key={s.student.id} className="flex justify-between items-center text-sm">
                              <span>{s.student.fullName}</span>
                              {s.hasRequested ? (
                                <span className="text-green-600">Agreed</span>
                              ) : (
                                <span className="text-gray-400">Pending</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {earlyRequests.allAgreed && (
                          <button
                            onClick={() => handleApproveEarlyExam(earlyRequests.exam.id)}
                            className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Approve Early Exam
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Select a course section to manage grades and exams.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
