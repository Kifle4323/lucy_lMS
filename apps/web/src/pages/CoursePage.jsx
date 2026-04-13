import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { getCourseAssessments, createAssessment, createQuestion, startAttempt, getAttempt, saveAnswer, submitAttempt, gradeAttempt, getCourseMaterials, createMaterial, deleteMaterial, getCourseStudents, toggleAssessmentOpen, updateAssessment, deleteAssessment, getManualGrades, setManualGrade, createFaceVerification, getProfileStatus, getAttemptsForGrading, getStudentAttempts } from '../api';
import Layout from '../components/Layout';
import FaceTracker from '../components/FaceTracker';
import {
  Plus,
  FileText,
  Clock,
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  ListChecks,
  PenLine,
  MessageSquare,
  FolderOpen,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Users,
  Lock,
  Unlock,
  Edit3,
  Award,
  Upload
} from 'lucide-react';

export default function CoursePage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [assessments, setAssessments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessments');

  // Teacher: create assessment form
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [newAssessment, setNewAssessment] = useState({ title: '', examType: 'QUIZ', timeLimit: '', maxScore: '100' });

  // Teacher: manual grade entry
  const [showGradeModal, setShowGradeModal] = useState(null); // assessment being graded
  const [manualGrades, setManualGrades] = useState({}); // { studentId: { score: '', feedback: '' } }

  // Teacher: create material form
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ title: '', content: '', fileUrl: '', fileType: 'text', fileName: '' });
  const [uploadingFile, setUploadingFile] = useState(false);

  // Teacher: add question form
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [questionType, setQuestionType] = useState('MCQ');
  const [questionForm, setQuestionForm] = useState({
    type: 'MCQ',
    prompt: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct: 'A',
    correctAnswer: '',
    modelAnswer: '',
    points: 1,
  });

  // Teacher: grading view
  const [gradingAttempt, setGradingAttempt] = useState(null);
  const [gradingAnswers, setGradingAnswers] = useState([]);

  // Teacher: view submissions
  const [submissionsAssessment, setSubmissionsAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // Student: attempt state
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [faceTrackingActive, setFaceTrackingActive] = useState(false);
  const [faceMismatchDetected, setFaceMismatchDetected] = useState(false);
  const [studentAttempts, setStudentAttempts] = useState([]); // Track completed attempts

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCourseAssessments(courseId).then(setAssessments),
      getCourseMaterials(courseId).then(setMaterials),
      user?.role === 'TEACHER' ? getCourseStudents(courseId).then(setStudents).catch(() => {}) : Promise.resolve(),
      user?.role === 'STUDENT' ? getProfileStatus().then(status => setProfileImage(status.profileImage)).catch(() => {}) : Promise.resolve(),
      user?.role === 'STUDENT' ? getStudentAttempts(courseId).then(setStudentAttempts).catch(() => []) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [courseId, user?.role]);

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    try {
      const assessment = await createAssessment(courseId, {
        title: newAssessment.title,
        examType: newAssessment.examType,
        timeLimit: newAssessment.timeLimit ? parseInt(newAssessment.timeLimit) : undefined,
        maxScore: newAssessment.maxScore ? parseInt(newAssessment.maxScore) : 100,
      });
      setAssessments([...assessments, assessment]);
      setNewAssessment({ title: '', examType: 'QUIZ', timeLimit: '', maxScore: '100' });
      setShowCreateAssessment(false);
      toast.success('Assessment created!');
    } catch (err) {
      toast.error('Failed to create assessment: ' + err.message);
    }
  };

  const handleToggleAssessment = async (assessmentId, isOpen) => {
    try {
      const updated = await toggleAssessmentOpen(assessmentId, isOpen);
      setAssessments(assessments.map(a => a.id === assessmentId ? updated : a));
    } catch (err) {
      toast.error('Failed to update assessment: ' + err.message);
    }
  };

  const handleEditAssessment = async (assessment) => {
    const title = prompt('Enter new title:', assessment.title);
    if (!title) return;
    
    const timeLimit = prompt('Enter time limit in minutes (leave empty for no limit):', assessment.timeLimit || '');
    const maxScore = prompt('Enter max score:', assessment.maxScore || 100);
    
    try {
      const updated = await updateAssessment(assessment.id, {
        title,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        maxScore: parseInt(maxScore) || 100,
      });
      setAssessments(assessments.map(a => a.id === assessment.id ? updated : a));
      toast.success('Assessment updated!');
    } catch (err) {
      toast.error('Failed to update assessment: ' + err.message);
    }
  };

  const handleDeleteAssessment = async (assessment) => {
    if (!confirm(`Delete "${assessment.title}"? This will also delete all questions and student attempts. This cannot be undone.`)) return;
    
    try {
      await deleteAssessment(assessment.id);
      setAssessments(assessments.filter(a => a.id !== assessment.id));
      toast.success('Assessment deleted!');
    } catch (err) {
      toast.error('Failed to delete assessment: ' + err.message);
    }
  };

  const handleOpenGradeModal = async (assessment) => {
    setShowGradeModal(assessment);
    // Load existing grades
    try {
      const grades = await getManualGrades(assessment.id);
      const gradeMap = {};
      grades.forEach(g => {
        gradeMap[g.studentId] = { score: g.score.toString(), feedback: g.feedback || '' };
      });
      setManualGrades(gradeMap);
    } catch (err) {
      console.error('Failed to load grades:', err);
      setManualGrades({});
    }
  };

  const handleSaveManualGrade = async (studentId) => {
    if (!showGradeModal) return;
    const grade = manualGrades[studentId];
    if (!grade || grade.score === '') return;
    
    try {
      await setManualGrade(showGradeModal.id, studentId, parseInt(grade.score), grade.feedback || undefined);
      toast.success('Grade saved!');
    } catch (err) {
      toast.error('Failed to save grade: ' + err.message);
    }
  };

  const handleSaveAllGrades = async () => {
    if (!showGradeModal) return;
    
    try {
      const promises = Object.entries(manualGrades)
        .filter(([_, g]) => g.score !== '')
        .map(([studentId, g]) => setManualGrade(showGradeModal.id, studentId, parseInt(g.score), g.feedback || undefined));
      
      await Promise.all(promises);
      toast.success('All grades saved!');
      setShowGradeModal(null);
    } catch (err) {
      toast.error('Failed to save some grades: ' + err.message);
    }
  };

  const handleMaterialFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.warning('File must be less than 20MB');
      return;
    }
    
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewMaterial({
        ...newMaterial,
        fileUrl: event.target.result,
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' :
                  file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx') ? 'doc' :
                  file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx') ? 'ppt' :
                  file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx') ? 'xls' :
                  'file'
      });
      setUploadingFile(false);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    try {
      const material = await createMaterial(courseId, {
        title: newMaterial.title,
        content: newMaterial.content || undefined,
        fileUrl: newMaterial.fileUrl || undefined,
        fileType: newMaterial.fileType,
        fileName: newMaterial.fileName || undefined,
      });
      setMaterials([...materials, material]);
      setNewMaterial({ title: '', content: '', fileUrl: '', fileType: 'text', fileName: '' });
      setShowCreateMaterial(false);
      toast.success('Material created!');
    } catch (err) {
      toast.error('Failed to create material: ' + err.message);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Delete this material?')) return;
    await deleteMaterial(materialId);
    setMaterials(materials.filter(m => m.id !== materialId));
    toast.success('Material deleted!');
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await createQuestion(selectedAssessment.id, questionForm);
      toast.success('Question added!');
      setQuestionForm({
        type: questionType,
        prompt: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correct: 'A',
        correctAnswer: '',
        modelAnswer: '',
        points: 1,
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartAttempt = async (assessmentId) => {
    try {
      const attempt = await startAttempt(assessmentId);
      const fullAttempt = await getAttempt(attempt.id);
      setActiveAttempt(fullAttempt);
      const initialAnswers = {};
      fullAttempt.answers?.forEach((a) => {
        initialAnswers[a.questionId] = a.selected || a.textAnswer || '';
      });
      setAnswers(initialAnswers);
      // Start continuous face tracking
      setFaceTrackingActive(true);
      setFaceMismatchDetected(false);
    } catch (err) {
      if (err.message?.includes('already_submitted')) {
        toast.warning('You have already submitted this exam.');
        // Refresh attempts list
        getStudentAttempts(courseId).then(setStudentAttempts);
      } else {
        toast.error('Failed to start exam: ' + err.message);
      }
    }
  };

  const handleFaceMismatch = async (capturedImage) => {
    if (!activeAttempt) return;
    
    setFaceMismatchDetected(true);
    try {
      await createFaceVerification(activeAttempt.id, capturedImage, false);
    } catch (err) {
      console.error('Failed to record face mismatch:', err);
    }
  };

  const handleEndExam = () => {
    setFaceTrackingActive(false);
    setFaceMismatchDetected(false);
  };

  const handleSelectAnswer = async (questionId, selected) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selected }));
    await saveAnswer(activeAttempt.id, questionId, { selected });
  };

  const handleTextAnswer = async (questionId, textAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: textAnswer }));
    await saveAnswer(activeAttempt.id, questionId, { textAnswer });
  };

  const handleSubmitAttempt = async () => {
    if (!confirm('Submit this attempt?')) return;
    const result = await submitAttempt(activeAttempt.id);
    handleEndExam();
    // Refresh attempts list
    getStudentAttempts(courseId).then(setStudentAttempts);
    if (result.hasManualGrading) {
      toast.success(`Submitted! Auto-graded score: ${result.autoScore}. Short answer questions will be graded by your teacher.`);
    } else {
      toast.success(`Submitted! Score: ${result.score}`);
    }
    setActiveAttempt(null);
    setAnswers({});
  };

  const handleOpenGrading = async (attempt) => {
    const fullAttempt = await getAttempt(attempt.id);
    setGradingAttempt(fullAttempt);
    setGradingAnswers(fullAttempt.answers.map((a) => ({
      answerId: a.id,
      score: a.score ?? 0,
      feedback: a.feedback ?? '',
    })));
  };

  const handleGradeSubmit = async () => {
    if (!confirm('Submit grades?')) return;
    await gradeAttempt(gradingAttempt.id, gradingAnswers);
    toast.success('Grades submitted!');
    setGradingAttempt(null);
    setGradingAnswers([]);
  };

  const handleViewSubmissions = async (assessment) => {
    try {
      const attempts = await getAttemptsForGrading(assessment.id);
      setSubmissions(attempts);
      setSubmissionsAssessment(assessment);
    } catch (err) {
      toast.error('Failed to load submissions: ' + err.message);
    }
  };

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  // Teacher grading view
  if (gradingAttempt) {
    const questions = gradingAttempt.assessment?.questions || [];
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setGradingAttempt(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Course
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Grading: {gradingAttempt.assessment?.title}</h2>
            <p className="text-gray-500">Student: {gradingAttempt.student?.fullName || gradingAttempt.studentId}</p>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const answer = gradingAttempt.answers.find((a) => a.questionId === q.id);
              const gradeIdx = gradingAnswers.findIndex((g) => g.answerId === answer?.id);
              return (
                <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded">
                        Q{idx + 1} - {q.type}
                      </span>
                      <p className="mt-2 text-gray-900 font-medium">{q.prompt}</p>
                    </div>
                    <span className="text-sm text-gray-500">{q.points} pts</span>
                  </div>

                  {q.type === 'MCQ' && (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <span className={`flex items-center gap-2 ${answer?.selected === q.correct ? 'text-green-600' : 'text-red-600'}`}>
                        {answer?.selected === q.correct ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        Student: {answer?.selected || 'Not answered'}
                      </span>
                      <span className="text-gray-500">Correct: {q.correct}</span>
                    </div>
                  )}

                  {q.type === 'FITB' && (
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Student:</span>
                        <span className={answer?.textAnswer?.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim() ? 'text-green-600 font-medium' : 'text-red-600'}>
                          {answer?.textAnswer || 'Not answered'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Correct:</span>
                        <span className="text-gray-900">{q.correctAnswer}</span>
                      </div>
                    </div>
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">Student Answer:</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{answer?.textAnswer || 'Not answered'}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 mb-1">Model Answer:</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{q.modelAnswer}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="text-sm text-gray-600">Score:</label>
                      <input
                        type="number"
                        min="0"
                        max={q.points}
                        value={gradeIdx >= 0 ? gradingAnswers[gradeIdx].score : 0}
                        onChange={(e) => {
                          const updated = [...gradingAnswers];
                          if (gradeIdx >= 0) {
                            updated[gradeIdx] = { ...updated[gradeIdx], score: parseInt(e.target.value) || 0 };
                          }
                          setGradingAnswers(updated);
                        }}
                        className="w-16 ml-2 px-2 py-1 border border-gray-200 rounded"
                      />
                      <span className="text-gray-500 text-sm ml-1">/ {q.points}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Add feedback..."
                      value={gradeIdx >= 0 ? gradingAnswers[gradeIdx].feedback : ''}
                      onChange={(e) => {
                        const updated = [...gradingAnswers];
                        if (gradeIdx >= 0) {
                          updated[gradeIdx] = { ...updated[gradeIdx], feedback: e.target.value };
                        }
                        setGradingAnswers(updated);
                      }}
                      className="flex-1 px-3 py-1 border border-gray-200 rounded"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleGradeSubmit}
              className="px-6 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
            >
              Submit Grades
            </button>
            <button
              onClick={() => setGradingAttempt(null)}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Student taking quiz
  if (activeAttempt) {
    const questions = activeAttempt.assessment?.questions || [];
    return (
      <Layout>
        <FaceTracker
          active={faceTrackingActive}
          attemptId={activeAttempt.id}
          profileImage={profileImage}
          onMismatch={handleFaceMismatch}
          intervalMs={60000}
        />
        <div className="max-w-4xl mx-auto">
          {/* Face Mismatch Warning */}
          {faceMismatchDetected && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Face Verification Alert</p>
                  <p className="text-sm text-yellow-700">
                    A face mismatch was detected. An administrator will review this before your exam is graded.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeAttempt.assessment?.title}</h2>
                <p className="text-gray-500 mt-1">{activeAttempt.assessment?.examType}</p>
              </div>
              {activeAttempt.assessment?.timeLimit && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  {activeAttempt.assessment.timeLimit} min
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded">
                      Q{idx + 1} - {q.type}
                    </span>
                    <p className="mt-2 text-gray-900 font-medium">{q.prompt}</p>
                  </div>
                  <span className="text-sm text-gray-500">{q.points} pts</span>
                </div>

                {q.type === 'MCQ' && (
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          answers[q.id] === opt ? 'bg-primary-50 border-2 border-primary-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => handleSelectAnswer(q.id, opt)}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="font-medium text-gray-700">{opt}:</span>
                        <span className="text-gray-900">{q[`option${opt}`]}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'FITB' && (
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}

                {q.type === 'SHORT_ANSWER' && (
                  <textarea
                    placeholder="Write your answer..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmitAttempt}
              className="px-6 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
            >
              Submit Exam
            </button>
            <button
              onClick={() => { setActiveAttempt(null); setAnswers({}); }}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/my-classes" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ChevronLeft className="w-5 h-5" />
            Back to My Classes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Course</h1>
          <p className="text-gray-500 mt-1">Course ID: {courseId}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'assessments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListChecks className="w-4 h-4 inline mr-2" />
            Assessments
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'materials'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-2" />
            Materials
          </button>
          {user?.role === 'TEACHER' && (
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'students'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Students
            </button>
          )}
        </div>

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <>
            {user?.role === 'TEACHER' && (
              <div className="mb-6">
                <button
                  onClick={() => setShowCreateMaterial(!showCreateMaterial)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Material
                </button>
              </div>
            )}

            {showCreateMaterial && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Course Material</h3>
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newMaterial.title}
                      onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Week 1 Lecture Notes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newMaterial.fileType}
                      onChange={(e) => setNewMaterial({ ...newMaterial, fileType: e.target.value, fileUrl: '', fileName: '' })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value="text">Text Content</option>
                      <option value="link">External Link</option>
                      <option value="pdf">PDF Document</option>
                      <option value="doc">Word Document</option>
                      <option value="ppt">PowerPoint</option>
                      <option value="xls">Excel Spreadsheet</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  {newMaterial.fileType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea
                        value={newMaterial.content}
                        onChange={(e) => setNewMaterial({ ...newMaterial, content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter the material content..."
                      />
                    </div>
                  )}
                  {newMaterial.fileType === 'link' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <input
                        type="url"
                        value={newMaterial.fileUrl}
                        onChange={(e) => setNewMaterial({ ...newMaterial, fileUrl: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {newMaterial.fileType === 'video' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                      <input
                        type="url"
                        value={newMaterial.fileUrl}
                        onChange={(e) => setNewMaterial({ ...newMaterial, fileUrl: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="https://youtube.com/... or https://vimeo.com/..."
                      />
                    </div>
                  )}
                  {(newMaterial.fileType === 'pdf' || newMaterial.fileType === 'doc' || newMaterial.fileType === 'ppt' || newMaterial.fileType === 'xls') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                      <div className="flex gap-3">
                        <label className="flex-1 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {uploadingFile ? 'Uploading...' : newMaterial.fileName ? `Selected: ${newMaterial.fileName}` : 'Click to upload file'}
                          </span>
                          <input
                            type="file"
                            accept={newMaterial.fileType === 'pdf' ? '.pdf' : newMaterial.fileType === 'doc' ? '.doc,.docx' : newMaterial.fileType === 'ppt' ? '.ppt,.pptx' : '.xls,.xlsx'}
                            onChange={handleMaterialFileUpload}
                            className="hidden"
                            disabled={uploadingFile}
                          />
                        </label>
                        {newMaterial.fileUrl && (
                          <button
                            type="button"
                            onClick={() => setNewMaterial({ ...newMaterial, fileUrl: '', fileName: '' })}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Max file size: 20MB</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                    >
                      Add Material
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateMaterial(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {materials.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No materials yet</h3>
                <p className="text-gray-500">
                  {user?.role === 'TEACHER' ? 'Add course materials for your students' : 'No materials have been added yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {materials.map((m) => (
                  <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {m.fileType === 'link' ? (
                            <LinkIcon className="w-5 h-5 text-blue-500" />
                          ) : m.fileType === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-500" />
                          ) : m.fileType === 'video' ? (
                            <ExternalLink className="w-5 h-5 text-purple-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-500" />
                          )}
                          <h3 className="font-semibold text-gray-900">{m.title}</h3>
                        </div>
                        {user?.role === 'TEACHER' && m.author?.id === user.id && (
                          <button
                            onClick={() => handleDeleteMaterial(m.id)}
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {m.fileType}
                      </span>
                    </div>
                    <div className="p-5">
                      {m.content && (
                        <p className="text-sm text-gray-600 line-clamp-3">{m.content}</p>
                      )}
                      {m.fileUrl && (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Resource
                        </a>
                      )}
                      <p className="text-xs text-gray-400 mt-3">
                        Added by {m.author?.fullName || 'Unknown'} on {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Assessments Tab */}
        {activeTab === 'assessments' && (
          <>
            {/* Teacher: Create Assessment Button */}
            {user?.role === 'TEACHER' && (
              <div className="mb-6 flex gap-3">
                <button
                  onClick={() => setShowCreateAssessment(!showCreateAssessment)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Assessment
                </button>
                <Link
                  to={`/courses/${courseId}/gradebook`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <BookOpen className="w-5 h-5" />
                  Gradebook
                </Link>
              </div>
            )}
            {user?.role === 'STUDENT' && (
              <div className="mb-6">
                <Link
                  to={`/courses/${courseId}/gradebook`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Award className="w-5 h-5" />
                  View My Grades
                </Link>
              </div>
            )}

            {/* Create Assessment Form */}
            {showCreateAssessment && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Assessment</h3>
                <form onSubmit={handleCreateAssessment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newAssessment.title}
                      onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Midterm Exam"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newAssessment.examType}
                        onChange={(e) => setNewAssessment({ ...newAssessment, examType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      >
                        <option value="QUIZ">Quiz</option>
                        <option value="MIDTERM">Midterm</option>
                        <option value="FINAL">Final</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (min)</label>
                      <input
                        type="number"
                        min="1"
                        value={newAssessment.timeLimit}
                        onChange={(e) => setNewAssessment({ ...newAssessment, timeLimit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                    <input
                      type="number"
                      min="1"
                      value={newAssessment.maxScore}
                      onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateAssessment(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Assessments List */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessments</h2>
            {assessments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
                <p className="text-gray-500">
                  {user?.role === 'TEACHER' ? 'Create your first assessment to get started' : 'Wait for your teacher to create assessments'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {assessments.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{a.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              a.examType === 'QUIZ' ? 'bg-blue-50 text-blue-700' :
                              a.examType === 'MIDTERM' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {a.examType}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                              a.isOpen ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {a.isOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              {a.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        </div>
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      {a.timeLimit && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {a.timeLimit} min
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                        <span className="font-medium">Max Score:</span> {a.maxScore || 100}
                      </div>
                    </div>

                    <div className="p-5">
                      {user?.role === 'TEACHER' && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleToggleAssessment(a.id, !a.isOpen)}
                            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                              a.isOpen 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {a.isOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            {a.isOpen ? 'Close for Students' : 'Open for Students'}
                          </button>
                          <button
                            onClick={() => handleViewSubmissions(a)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            View Submissions
                          </button>
                          <button
                            onClick={() => handleOpenGradeModal(a)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Enter Grades
                          </button>
                          <button
                            onClick={() => setSelectedAssessment(selectedAssessment?.id === a.id ? null : a)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            {selectedAssessment?.id === a.id ? 'Close' : 'Add Questions'}
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditAssessment(a)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-medium rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAssessment(a)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                      {user?.role === 'STUDENT' && (
                        (() => {
                          const existingAttempt = studentAttempts.find(att => att.assessmentId === a.id && att.status === 'SUBMITTED');
                          return existingAttempt ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">Completed</span>
                                </div>
                                {existingAttempt.score !== null && (
                                  <span className="text-sm font-bold text-green-700">
                                    Score: {existingAttempt.score}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : a.isOpen ? (
                            <button
                              onClick={() => handleStartAttempt(a.id)}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors"
                            >
                              <ListChecks className="w-4 h-4" />
                              Start Exam
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Lock className="w-4 h-4" />
                              Waiting for teacher to open
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Add Question Form */}
                    {selectedAssessment?.id === a.id && (
                      <div className="p-5 border-t border-gray-100 bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-3">Add Question</h4>
                        <form onSubmit={handleAddQuestion} className="space-y-3">
                          <div>
                            <label className="text-sm text-gray-600">Type</label>
                            <select
                              value={questionType}
                              onChange={(e) => {
                                setQuestionType(e.target.value);
                                setQuestionForm({ ...questionForm, type: e.target.value });
                              }}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg bg-white"
                        >
                          <option value="MCQ">Multiple Choice</option>
                          <option value="FITB">Fill in the Blank</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">Prompt</label>
                        <textarea
                          value={questionForm.prompt}
                          onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                          required
                          rows={2}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                          placeholder="Enter the question..."
                        />
                      </div>

                      {questionType === 'MCQ' && (
                        <div className="space-y-2">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className="flex gap-2">
                              <input
                                placeholder={`Option ${opt}`}
                                value={questionForm[`option${opt}`]}
                                onChange={(e) => setQuestionForm({ ...questionForm, [`option${opt}`]: e.target.value })}
                                required
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                              />
                            </div>
                          ))}
                          <select
                            value={questionForm.correct}
                            onChange={(e) => setQuestionForm({ ...questionForm, correct: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                          >
                            <option value="A">Correct: A</option>
                            <option value="B">Correct: B</option>
                            <option value="C">Correct: C</option>
                            <option value="D">Correct: D</option>
                          </select>
                        </div>
                      )}

                      {questionType === 'FITB' && (
                        <input
                          placeholder="Correct answer"
                          value={questionForm.correctAnswer}
                          onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        />
                      )}

                      {questionType === 'SHORT_ANSWER' && (
                        <textarea
                          placeholder="Model answer for grading reference"
                          value={questionForm.modelAnswer}
                          onChange={(e) => setQuestionForm({ ...questionForm, modelAnswer: e.target.value })}
                          required
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        />
                      )}

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={questionForm.points}
                          onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg"
                        />
                        <span className="text-gray-500 self-center">points</span>
                      </div>

                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                      >
                        Add Question
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
          </>
        )}

        {/* Students Tab (Teacher only) */}
        {activeTab === 'students' && user?.role === 'TEACHER' && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrolled Students</h2>
            {students.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
                <p className="text-gray-500">Students will appear here once they are enrolled in your class</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {student.fullName?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.className}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual Grade Entry Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enter Grades: {showGradeModal.title}</h2>
                <p className="text-sm text-gray-500 mt-1">Max Score: {showGradeModal.maxScore || 100}</p>
              </div>
              <button
                onClick={() => setShowGradeModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-auto flex-1 p-6">
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No students enrolled in this course</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feedback</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {student.fullName?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{student.fullName}</p>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={showGradeModal.maxScore || 100}
                              value={manualGrades[student.id]?.score || ''}
                              onChange={(e) => setManualGrades({
                                ...manualGrades,
                                [student.id]: {
                                  ...manualGrades[student.id],
                                  score: e.target.value
                                }
                              })}
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-center"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-sm">/ {showGradeModal.maxScore || 100}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={manualGrades[student.id]?.feedback || ''}
                            onChange={(e) => setManualGrades({
                              ...manualGrades,
                              [student.id]: {
                                ...manualGrades[student.id],
                                feedback: e.target.value
                              }
                            })}
                            className="w-full px-2 py-1 border border-gray-200 rounded"
                            placeholder="Optional feedback..."
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleSaveManualGrade(student.id)}
                            disabled={!manualGrades[student.id]?.score}
                            className="px-3 py-1 bg-primary-900 hover:bg-primary-800 disabled:bg-gray-300 text-white text-sm font-medium rounded"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setShowGradeModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAllGrades}
                className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
              >
                Save All Grades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {submissionsAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Submissions: {submissionsAssessment.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{submissions.length} submitted attempts</p>
                </div>
                <button
                  onClick={() => {
                    setSubmissionsAssessment(null);
                    setSubmissions([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {submissions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No submissions yet</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Student</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Submitted</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Score</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Face Verified</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submissions.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {attempt.student?.fullName?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{attempt.student?.fullName}</p>
                              <p className="text-xs text-gray-500">{attempt.student?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            attempt.score !== null ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {attempt.score !== null ? `${attempt.score}%` : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {attempt.faceVerification ? (
                            attempt.faceVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                <AlertCircle className="w-3 h-3" />
                                Pending Review
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 text-xs">No check</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSubmissionsAssessment(null);
                              setSubmissions([]);
                              handleOpenGrading(attempt);
                            }}
                            className="px-3 py-1 bg-primary-900 hover:bg-primary-800 text-white text-sm font-medium rounded"
                          >
                            Grade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
