import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getTeacherSections, getSectionStudents, enterGrade, submitSectionGrades, syncAssessmentsToGrades,
  createExamSchedule, getSectionExamSchedules, updateExamSchedule, deleteExamSchedule,
  proposeEarlyExam, cancelEarlyExamProposal, getEarlyExamResponses, confirmEarlyExam,
  getLiveAttendanceStats, syncAttendanceToGrades,
  createManualAttendance, getManualAttendanceSessions, deleteManualAttendanceSession,
  getGradeConfig
} from '../api.js';
import Layout from '../components/Layout';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';

export default function TeacherGradesPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [earlyResponses, setEarlyResponses] = useState(null);
  const [activeTab, setActiveTab] = useState('grades');
  const [liveAttendance, setLiveAttendance] = useState(null);
  const [manualSessions, setManualSessions] = useState([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ title: '', date: '' });
  const [manualRecords, setManualRecords] = useState({}); // { studentId: status }
  const [gradeConfig, setGradeConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam schedule form
  const [examForm, setExamForm] = useState({
    examType: 'MIDTERM',
    duration: 60,
    location: '',
    instructions: '',
    weight: 30,
    examDate: '',
    examTime: '09:00',
    proposeEarly: false,
    proposedDate: '',
    proposedTime: '09:00',
    proposalDeadline: '',
    proposalDeadlineTime: '23:59',
  });
  const [editingExam, setEditingExam] = useState(null);

  // Early exam proposal form
  const [earlyProposalForm, setEarlyProposalForm] = useState({
    proposedDate: '',
    proposalDeadline: '',
  });
  const [showEarlyProposal, setShowEarlyProposal] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const data = await getTeacherSections();
      setSections(data);
      
      // Auto-select section from URL query param
      const sectionId = searchParams.get('section');
      const courseId = searchParams.get('course');
      
      if (sectionId) {
        const section = data.find(s => s.id === sectionId);
        if (section) {
          selectSection(section);
        }
      } else if (courseId) {
        // Filter to sections for this course and auto-select first one
        const courseSections = data.filter(s => s.courseId === courseId);
        if (courseSections.length === 1) {
          selectSection(courseSections[0]);
        }
      }
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
    setEarlyResponses(null);
    setShowEarlyProposal(false);
    try {
      const [studentsData, examsData, configData] = await Promise.all([
        getSectionStudents(section.id),
        getSectionExamSchedules(section.id),
        getGradeConfig(section.courseId).catch(() => null)
      ]);
      setStudents(studentsData);
      setExamSchedules(examsData);
      setGradeConfig(configData || { quizWeight: 25, midtermWeight: 25, finalWeight: 40, attendanceWeight: 10 });
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
    const confirmed = await confirm({
      title: 'Submit All Grades',
      message: 'Submit all grades? This will lock the grades and students will be able to see them once published by admin.',
      confirmText: 'Submit',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!confirmed) return;
    try {
      await submitSectionGrades(selectedSection.id);
      toast.success('Grades submitted successfully!');
      // Refresh
      const data = await getSectionStudents(selectedSection.id);
      setStudents(data);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function syncFromAssessments() {
    const confirmed = await confirm({
      title: 'Sync from Assessments',
      message: 'Sync assessment results to grades? This will overwrite existing quiz, midterm, and final scores with assessment data.',
      confirmText: 'Sync',
      cancelText: 'Cancel',
      type: 'info',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      const result = await syncAssessmentsToGrades(selectedSection.id);
      toast.success(result.message);
      // Refresh students list
      const data = await getSectionStudents(selectedSection.id);
      setStudents(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Exam Schedule functions
  async function handleCreateExam(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        courseSectionId: selectedSection.id,
        examType: examForm.examType,
        duration: examForm.duration,
        location: examForm.location,
        instructions: examForm.instructions,
        weight: examForm.weight,
        // Teacher-set exam date and time
        examDate: examForm.examDate + 'T' + examForm.examTime,
        // Include early exam proposal if checked
        ...(examForm.proposeEarly && {
          proposedDate: examForm.proposedDate + 'T' + examForm.proposedTime,
          proposalDeadline: examForm.proposalDeadline + 'T' + examForm.proposalDeadlineTime,
        }),
      };
      const newExam = await createExamSchedule(data);
      setExamSchedules([...examSchedules, newExam]);
      setExamForm({
        examType: 'MIDTERM',
        duration: 60,
        location: '',
        instructions: '',
        weight: 30,
        examDate: '',
        examTime: '09:00',
        proposeEarly: false,
        proposedDate: '',
        proposedTime: '09:00',
        proposalDeadline: '',
        proposalDeadlineTime: '23:59',
      });
      setSuccess(examForm.proposeEarly 
        ? 'Exam schedule created with early exam proposal! Students will be notified.' 
        : 'Exam schedule created!');
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
        duration: 60,
        location: '',
        instructions: '',
        weight: 30,
        examDate: '',
        examTime: '09:00',
        proposeEarly: false,
        proposedDate: '',
        proposedTime: '09:00',
        proposalDeadline: '',
        proposalDeadlineTime: '23:59',
      });
      setSuccess('Exam schedule updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExam(examId) {
    const confirmed = await confirm({
      title: 'Delete Exam Schedule',
      message: 'Delete this exam schedule?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteExamSchedule(examId);
      setExamSchedules(examSchedules.filter(ex => ex.id !== examId));
      toast.success('Exam schedule deleted!');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function startEditExam(exam) {
    setEditingExam(exam);
    setExamForm({
      examType: exam.examType,
      duration: exam.duration,
      location: exam.location || '',
      instructions: exam.instructions || '',
    });
  }

  async function handleProposeEarlyExam(examId, e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await proposeEarlyExam(examId, earlyProposalForm);
      setExamSchedules(examSchedules.map(ex => ex.id === updated.id ? updated : ex));
      setShowEarlyProposal(false);
      setEarlyProposalForm({ proposedDate: '', proposalDeadline: '' });
      setSuccess('Early exam proposed! Students will be notified to respond.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelEarlyProposal(examId) {
    const confirmed = await confirm({
      title: 'Cancel Early Exam Proposal',
      message: 'Cancel early exam proposal?',
      confirmText: 'Cancel Proposal',
      cancelText: 'Keep',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await cancelEarlyExamProposal(examId);
      const examsData = await getSectionExamSchedules(selectedSection.id);
      setExamSchedules(examsData);
      setEarlyResponses(null);
      toast.success('Early exam proposal cancelled.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function loadEarlyResponses(examId) {
    try {
      const data = await getEarlyExamResponses(examId);
      setEarlyResponses(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmEarlyExam(examId) {
    const confirmed = await confirm({
      title: 'Confirm Early Exam',
      message: 'Confirm early exam? This will set the exam date to the proposed early date.',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!confirmed) return;
    try {
      await confirmEarlyExam(examId);
      const examsData = await getSectionExamSchedules(selectedSection.id);
      setExamSchedules(examsData);
      setEarlyResponses(null);
      toast.success('Early exam confirmed! Exam will be held on the proposed date.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function loadLiveAttendance() {
    if (!selectedSection) return;
    try {
      const [statsData, manualData] = await Promise.all([
        getLiveAttendanceStats(selectedSection.id),
        getManualAttendanceSessions(selectedSection.id),
      ]);
      setLiveAttendance(statsData);
      setManualSessions(manualData);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSyncAttendance() {
    const confirmed = await confirm({
      title: 'Sync Attendance to Grades',
      message: 'This will auto-calculate attendance scores from live session data and update the attendance grade for each student. Existing attendance scores will be overwritten.',
      confirmText: 'Sync',
      cancelText: 'Cancel',
      type: 'info',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      const result = await syncAttendanceToGrades(selectedSection.id);
      toast.success(`Attendance synced for ${result.synced} students!`);
      // Refresh students to show updated attendance scores
      const data = await getSectionStudents(selectedSection.id);
      setStudents(data);
      // Refresh attendance stats
      await loadLiveAttendance();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openManualAttendanceForm() {
    // Initialize all students as PRESENT by default
    const defaultRecords = {};
    students.forEach(s => {
      defaultRecords[s.student?.id || s.id] = 'PRESENT';
    });
    setManualRecords(defaultRecords);
    setManualForm({ title: 'Face-to-Face Class', date: new Date().toISOString().split('T')[0] });
    setShowManualForm(true);
  }

  async function handleSaveManualAttendance() {
    if (!manualForm.date) {
      toast.error('Please select a date');
      return;
    }
    setSaving(true);
    try {
      const records = Object.entries(manualRecords).map(([studentId, status]) => ({
        studentId,
        status,
      }));
      await createManualAttendance(selectedSection.id, {
        title: manualForm.title || 'Face-to-Face Class',
        date: manualForm.date + 'T09:00:00.000Z',
        records,
      });
      toast.success('Manual attendance saved!');
      setShowManualForm(false);
      setManualForm({ title: '', date: '' });
      setManualRecords({});
      // Refresh attendance data
      await loadLiveAttendance();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteManualSession(sessionId) {
    const confirmed = await confirm({
      title: 'Delete Attendance Session',
      message: 'Delete this attendance session and all its records?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteManualAttendanceSession(sessionId);
      toast.success('Attendance session deleted');
      await loadLiveAttendance();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Grade Management</h1>

      {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded mb-4">{success}</div>}

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sections List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">My Course Sections</h2>
          <div className="space-y-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => selectSection(section)}
                className={`w-full text-left p-3 rounded border ${
                  selectedSection?.id === section.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{section.course?.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {section.class?.name} | {section.sectionCode}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {section.semester?.name} | {section._count?.enrollments || 0} students
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSection.course?.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSection.class?.name} | {selectedSection.sectionCode} | {selectedSection.semester?.name}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-4 border-b">
                <button
                  onClick={() => setActiveTab('grades')}
                  className={`pb-2 px-4 ${activeTab === 'grades' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  Grades
                </button>
                <button
                  onClick={() => { setActiveTab('attendance'); loadLiveAttendance(); }}
                  className={`pb-2 px-4 ${activeTab === 'attendance' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  Attendance
                </button>
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`pb-2 px-4 ${activeTab === 'exams' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                >
                  Exam Schedules
                </button>
              </div>

              {/* Grades Tab */}
              {activeTab === 'grades' && (
                <>
                  <div className="flex justify-end gap-3 mb-4">
                    <button
                      onClick={syncFromAssessments}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? 'Syncing...' : 'Sync from Assessments'}
                    </button>
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
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                          <th className="text-left p-3 text-gray-700 dark:text-gray-300">Student</th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Quiz<br/><span className="text-xs text-gray-400">/{gradeConfig?.quizWeight || 25}</span></th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Midterm<br/><span className="text-xs text-gray-400">/{gradeConfig?.midtermWeight || 25}</span></th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Final<br/><span className="text-xs text-gray-400">/{gradeConfig?.finalWeight || 40}</span></th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Attendance<br/><span className="text-xs text-gray-400">/{gradeConfig?.attendanceWeight || 10}</span></th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Total</th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Grade</th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Status</th>
                          <th className="text-center p-3 text-gray-700 dark:text-gray-300">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3">
                              <div className="font-medium text-gray-900 dark:text-white">{student.student?.fullName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{student.student?.email}</div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max={gradeConfig?.quizWeight || 25}
                                step="0.1"
                                value={student.grade?.quizScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'quizScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max={gradeConfig?.midtermWeight || 25}
                                step="0.1"
                                value={student.grade?.midtermScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'midtermScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max={gradeConfig?.finalWeight || 40}
                                step="0.1"
                                value={student.grade?.finalScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'finalScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max={gradeConfig?.attendanceWeight || 10}
                                step="0.1"
                                value={student.grade?.attendanceScore ?? ''}
                                onChange={e => updateStudentGrade(student.id, 'attendanceScore', e.target.value)}
                                disabled={student.grade?.isSubmitted}
                                className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
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

              {/* Attendance Tab */}
              {activeTab === 'attendance' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Tracking</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Combined attendance from live sessions (auto) and face-to-face classes (manual)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={openManualAttendanceForm}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                      >
                        + Take Attendance
                      </button>
                      <button
                        onClick={handleSyncAttendance}
                        disabled={saving || !liveAttendance?.endedSessions}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {saving ? 'Syncing...' : 'Sync to Grades'}
                      </button>
                    </div>
                  </div>

                  {/* Manual Attendance Entry Form */}
                  {showManualForm && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Take Face-to-Face Attendance</h4>
                        <button onClick={() => setShowManualForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Title</label>
                          <input
                            type="text"
                            value={manualForm.title}
                            onChange={e => setManualForm({ ...manualForm, title: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Face-to-Face Class"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                          <input
                            type="date"
                            value={manualForm.date}
                            onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Student</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(s => {
                              const studentId = s.student?.id || s.id;
                              return (
                                <tr key={studentId} className="border-b border-gray-200 dark:border-gray-700">
                                  <td className="p-3">
                                    <div className="font-medium text-gray-900 dark:text-white">{s.student?.fullName}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{s.student?.email}</div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex gap-1 justify-center">
                                      {['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'].map(status => (
                                        <button
                                          key={status}
                                          onClick={() => setManualRecords({ ...manualRecords, [studentId]: status })}
                                          className={`px-3 py-1 rounded text-xs font-medium ${
                                            manualRecords[studentId] === status
                                              ? status === 'PRESENT' ? 'bg-green-600 text-white'
                                                : status === 'LATE' ? 'bg-yellow-500 text-white'
                                                : status === 'EXCUSED' ? 'bg-blue-500 text-white'
                                                : 'bg-red-600 text-white'
                                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                          }`}
                                        >
                                          {status}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowManualForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                        <button onClick={handleSaveManualAttendance} disabled={saving || !manualForm.date} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!liveAttendance ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading attendance data...</p>
                    </div>
                  ) : liveAttendance.totalSessions === 0 && manualSessions.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">No attendance records yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Click "Take Attendance" to record face-to-face class attendance, or conduct a live session for automatic tracking</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{liveAttendance.totalSessions || 0}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-300">Total Sessions</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{liveAttendance.endedLiveSessions || 0}</p>
                          <p className="text-sm text-green-600 dark:text-green-300">Live Sessions</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{liveAttendance.manualSessions || 0}</p>
                          <p className="text-sm text-indigo-600 dark:text-indigo-300">In-Person</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{liveAttendance.students?.length || 0}</p>
                          <p className="text-sm text-purple-600 dark:text-purple-300">Students</p>
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                          <strong>Scoring (cumulative):</strong> Live: Attended=100%, Partial=50%, Absent=0% | In-Person: Present=100%, Late=75%, Excused=50%, Absent=0%. 
                          Final score = average across all sessions. Click "Sync to Grades" to apply.
                        </p>
                      </div>

                      {/* Student Cumulative Attendance Table */}
                      <div className="overflow-x-auto mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cumulative Attendance</h4>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                              <th className="text-left p-3 text-gray-700 dark:text-gray-300">Student</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">Live Attended</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">Live Partial</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">In-Person Present</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">In-Person Late</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">Total Absent</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300">Score /100</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveAttendance.students.map(stat => (
                              <tr key={stat.student.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="p-3">
                                  <div className="font-medium text-gray-900 dark:text-white">{stat.student.fullName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{stat.student.email}</div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                    {stat.liveAttended || 0}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                                    {stat.livePartial || 0}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                    {stat.manualPresent || 0}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                                    {stat.manualLate || 0}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                                    {(stat.liveAbsent || 0) + (stat.manualAbsent || 0)}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    stat.score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    stat.score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {stat.score}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Manual Attendance History */}
                      {manualSessions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">In-Person Attendance History</h4>
                          <div className="space-y-3">
                            {manualSessions.map(session => (
                              <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-white">{session.title}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                      {new Date(session.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {session.records.filter(r => r.status === 'PRESENT').length} present, {' '}
                                      {session.records.filter(r => r.status === 'LATE').length} late, {' '}
                                      {session.records.filter(r => r.status === 'ABSENT').length} absent
                                    </span>
                                    <button
                                      onClick={() => handleDeleteManualSession(session.id)}
                                      className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {session.records.map(r => (
                                    <span key={r.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                      r.status === 'PRESENT' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                      r.status === 'LATE' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                      r.status === 'EXCUSED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                      {r.student?.fullName} ({r.status})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Exams Tab */}
              {activeTab === 'exams' && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Exam Form */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
                      {editingExam ? 'Edit Exam Details' : 'Create Exam Schedule'}
                    </h3>
                    {!editingExam && selectedSection?.semester?.midtermExamDate && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm">
                        <p className="font-medium text-blue-800">Official Exam Dates (set by admin)</p>
                        <p className="text-blue-700">Midterm: {new Date(selectedSection.semester.midtermExamDate).toLocaleString()}</p>
                        <p className="text-blue-700">Final: {selectedSection?.semester?.finalExamDate ? new Date(selectedSection.semester.finalExamDate).toLocaleString() : 'Not set'}</p>
                      </div>
                    )}
                    <form onSubmit={editingExam ? handleUpdateExam : handleCreateExam} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Exam Type</label>
                          <select
                            value={examForm.examType}
                            onChange={e => setExamForm({ ...examForm, examType: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            disabled={editingExam}
                          >
                            <option value="MIDTERM">Midterm</option>
                            <option value="FINAL">Final</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Weight (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={examForm.weight}
                            onChange={e => setExamForm({ ...examForm, weight: parseInt(e.target.value) })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            disabled={editingExam}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Exam Date</label>
                          <input
                            type="date"
                            value={examForm.examDate}
                            onChange={e => setExamForm({ ...examForm, examDate: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Exam Time</label>
                          <input
                            type="time"
                            value={examForm.examTime}
                            onChange={e => setExamForm({ ...examForm, examTime: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Duration (min)</label>
                          <input
                            type="number"
                            min="1"
                            value={examForm.duration}
                            onChange={e => setExamForm({ ...examForm, duration: parseInt(e.target.value) })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Location</label>
                          <input
                            type="text"
                            value={examForm.location}
                            onChange={e => setExamForm({ ...examForm, location: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g., Room 101"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Instructions</label>
                        <textarea
                          value={examForm.instructions}
                          onChange={e => setExamForm({ ...examForm, instructions: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          rows={3}
                          placeholder="Exam instructions for students..."
                        />
                      </div>

                      {/* Early Exam Proposal Option */}
                      {!editingExam && (
                        <div className="border-t pt-4 mt-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={examForm.proposeEarly}
                              onChange={e => setExamForm({ ...examForm, proposeEarly: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Propose Early Exam Date</span>
                          </label>
                          {examForm.proposeEarly && (
                            <div className="mt-3 space-y-3 pl-6">
                              <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                Students will be notified to accept or reject the early exam proposal.
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Proposed Date</label>
                                  <input
                                    type="date"
                                    value={examForm.proposedDate}
                                    onChange={e => setExamForm({ ...examForm, proposedDate: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Proposed Time</label>
                                  <input
                                    type="time"
                                    value={examForm.proposedTime}
                                    onChange={e => setExamForm({ ...examForm, proposedTime: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Response Deadline Date</label>
                                  <input
                                    type="date"
                                    value={examForm.proposalDeadline}
                                    onChange={e => setExamForm({ ...examForm, proposalDeadline: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Deadline Time</label>
                                  <input
                                    type="time"
                                    value={examForm.proposalDeadlineTime}
                                    onChange={e => setExamForm({ ...examForm, proposalDeadlineTime: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                                duration: 60,
                                location: '',
                                instructions: '',
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
                    <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Scheduled Exams</h3>
                    <div className="space-y-4">
                      {examSchedules.map(exam => (
                        <div key={exam.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                exam.examType === 'FINAL' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {exam.examType}
                              </span>

                              {/* Show official date */}
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">Official Date:</p>
                                <p className="font-medium">
                                  {exam.officialDate ? new Date(exam.officialDate).toLocaleDateString() : 'Not set'}
                                </p>
                              </div>

                              {/* Show proposed early date if any */}
                              {exam.earlyExamStatus !== 'NONE' && exam.proposedDate && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500">Proposed Early Date:</p>
                                  <p className="font-medium text-green-600">
                                    {new Date(exam.proposedDate).toLocaleDateString()}
                                  </p>
                                </div>
                              )}

                              <p className="text-sm text-gray-500 mt-2">
                                Duration: {exam.duration} min | {exam.location || 'Location TBD'}
                              </p>

                              {/* Early exam status */}
                              {exam.earlyExamStatus !== 'NONE' && (
                                <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                                  exam.earlyExamStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                  exam.earlyExamStatus === 'PROPOSED' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {exam.earlyExamStatus === 'APPROVED' ? 'Early Exam Confirmed' :
                                   exam.earlyExamStatus === 'PROPOSED' ? 'Early Exam Proposed' :
                                   exam.earlyExamStatus}
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

                          {/* Early Exam Proposal Section */}
                          {exam.earlyExamStatus === 'NONE' && (
                            <div className="mt-3 pt-3 border-t">
                              <button
                                onClick={() => setShowEarlyProposal(showEarlyProposal === exam.id ? false : exam.id)}
                                className="text-sm text-green-600 hover:underline"
                              >
                                Propose Early Exam
                              </button>
                              {showEarlyProposal === exam.id && (
                                <form onSubmit={(e) => handleProposeEarlyExam(exam.id, e)} className="mt-3 space-y-3">
                                  {!exam.officialDate && (
                                    <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                      Note: Official exam date not set by admin. You can still propose an early date.
                                    </p>
                                  )}
                                  <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Proposed Early Date</label>
                                    <input
                                      type="date"
                                      value={earlyProposalForm.proposedDate}
                                      onChange={e => setEarlyProposalForm({ ...earlyProposalForm, proposedDate: e.target.value })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Response Deadline</label>
                                    <input
                                      type="date"
                                      value={earlyProposalForm.proposalDeadline}
                                      onChange={e => setEarlyProposalForm({ ...earlyProposalForm, proposalDeadline: e.target.value })}
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      required
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                                  >
                                    Submit Proposal
                                  </button>
                                </form>
                              )}
                            </div>
                          )}

                          {/* View Responses for Proposed Exam */}
                          {exam.earlyExamStatus === 'PROPOSED' && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => loadEarlyResponses(exam.id)}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View Student Responses
                                </button>
                                <button
                                  onClick={() => handleCancelEarlyProposal(exam.id)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Cancel Proposal
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Confirmed Early Exam */}
                          {exam.earlyExamStatus === 'APPROVED' && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-green-600 font-medium">
                                Exam will be held on {exam.proposedDate ? new Date(exam.proposedDate).toLocaleDateString() : 'proposed date'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      {examSchedules.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No exams scheduled yet.</p>
                      )}
                    </div>

                    {/* Early Responses Modal/Panel */}
                    {earlyResponses && (
                      <div className="mt-4 border rounded p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">Student Responses</h4>
                          <button
                            onClick={() => setEarlyResponses(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Close
                          </button>
                        </div>
                        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                          <div className="bg-green-100 rounded p-2">
                            <div className="text-lg font-bold text-green-700">{earlyResponses.agreedCount}</div>
                            <div className="text-xs text-green-600">Agreed</div>
                          </div>
                          <div className="bg-red-100 rounded p-2">
                            <div className="text-lg font-bold text-red-700">{earlyResponses.disagreedCount}</div>
                            <div className="text-xs text-red-600">Disagreed</div>
                          </div>
                          <div className="bg-gray-100 rounded p-2">
                            <div className="text-lg font-bold text-gray-700">{earlyResponses.pendingCount}</div>
                            <div className="text-xs text-gray-600">Pending</div>
                          </div>
                        </div>
                        {earlyResponses.anyDisagreed ? (
                          <p className="text-sm text-red-600 font-medium mb-2">
                            Some students disagreed. Exam will be held on official date.
                          </p>
                        ) : earlyResponses.allAgreed ? (
                          <p className="text-sm text-green-600 font-medium mb-2">
                            All students agreed! You can confirm the early exam.
                          </p>
                        ) : (
                          <p className="text-sm text-yellow-600 mb-2">
                            Waiting for all students to respond.
                          </p>
                        )}
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {Array.isArray(earlyResponses?.students) && earlyResponses.students.map(s => (
                            <div key={s.student.id} className="flex justify-between items-center text-sm">
                              <span>{s.student.fullName}</span>
                              {!s.hasResponded ? (
                                <span className="text-gray-400">Pending</span>
                              ) : s.agreed ? (
                                <span className="text-green-600">Agreed</span>
                              ) : (
                                <span className="text-red-600">Disagreed</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {earlyResponses.allAgreed && (
                          <button
                            onClick={() => handleConfirmEarlyExam(earlyResponses.exam.id)}
                            className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Confirm Early Exam
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
              Select a course section to manage grades and exams.
            </div>
          )}
        </div>
      </div>
      </div>
    </Layout>
  );
}
