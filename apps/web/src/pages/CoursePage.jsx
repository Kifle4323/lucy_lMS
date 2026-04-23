import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';
import { getCourseAssessments, createAssessment, createQuestion, updateQuestion, deleteQuestion, getAssessmentQuestions, startAttempt, getAttempt, saveAnswer, submitAttempt, gradeAttempt, getCourseMaterials, createMaterial, deleteMaterial, getCourseStudents, toggleAssessmentOpen, updateAssessment, deleteAssessment, getManualGrades, setManualGrade, createFaceVerification, getProfileStatus, getAttemptsForGrading, getStudentAttempts, reportQuestion, recordMaterialView, closeMaterialView, getCourseMaterialStats, getGradeComponents, getMaterialHtml, saveReadingProgress, getReadingProgress, API_BASE } from '../api';
import Layout from '../components/Layout';
import FaceTracker from '../components/FaceTracker';
import {
  Plus,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
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
  Upload,
  SkipForward,
  Flag,
  AlertTriangle,
  X,
  Eye,
  BookOpen as ReadIcon,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function CoursePage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [assessments, setAssessments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessments');

  // Teacher: create assessment form
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [newAssessment, setNewAssessment] = useState({ title: '', examType: 'QUIZ', deliveryMode: 'ONLINE', timeLimit: '', maxScore: '100', componentId: '' });
  const [gradeComponents, setGradeComponents] = useState([]);

  // Teacher: manual grade entry
  const [showGradeModal, setShowGradeModal] = useState(null); // assessment being graded
  const [manualGrades, setManualGrades] = useState({}); // { studentId: { score: '', feedback: '' } }

  // Teacher: create material form
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ title: '', content: '', fileUrl: '', fileType: 'text', fileName: '' });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [currentViewId, setCurrentViewId] = useState(null);
  const [materialStats, setMaterialStats] = useState(null);
  const [htmlReaderMaterial, setHtmlReaderMaterial] = useState(null); // For PPTX HTML reader
  const [htmlContent, setHtmlContent] = useState(null); // Fetched HTML content
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Teacher: add question form
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedAssessmentQuestions, setSelectedAssessmentQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [editingAssessmentData, setEditingAssessmentData] = useState({ title: '', timeLimit: '', maxScore: '' });
  const [editingAssessmentComponentId, setEditingAssessmentComponentId] = useState(null);
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
  
  // Quiz navigation state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [skippedQuestions, setSkippedQuestions] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(null); // in seconds
  const [examSubmitted, setExamSubmitted] = useState(false); // prevent double submit
  const examSubmittedRef = useRef(false); // ref to avoid stale closure in timer
  const confirmingSubmitRef = useRef(false); // true while user is confirming manual submit

  // Report question state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Report question handlers
  async function handleReportQuestion() {
    if (!reportingQuestion) return;
    if (reportReason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters)');
      return;
    }
    setSubmittingReport(true);
    try {
      await reportQuestion(reportingQuestion.id, reportReason);
      toast.success('Question reported successfully');
      setShowReportModal(false);
      setReportingQuestion(null);
      setReportReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReport(false);
    }
  }

  function openReportModal(question) {
    setReportingQuestion(question);
    setReportReason('');
    setShowReportModal(true);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCourseAssessments(courseId).then(setAssessments),
      getCourseMaterials(courseId).then(setMaterials),
      user?.role === 'TEACHER' ? getCourseStudents(courseId).then(setStudents).catch((err) => console.error('Failed to load students:', err)) : Promise.resolve(),
      user?.role === 'TEACHER' ? getCourseMaterialStats(courseId).then(setMaterialStats).catch(() => {}) : Promise.resolve(),
      user?.role === 'TEACHER' ? getGradeComponents(courseId).then(setGradeComponents).catch(() => {}) : Promise.resolve(),
      user?.role === 'STUDENT' ? getProfileStatus().then(status => setProfileImage(status.profileImage)).catch(() => {}) : Promise.resolve(),
      user?.role === 'STUDENT' ? getStudentAttempts(courseId).then(setStudentAttempts).catch(() => []) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [courseId, user?.role]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || examSubmittedRef.current || confirmingSubmitRef.current) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out (only if not already submitted and not in manual-confirm flow)
          if (activeAttempt && !examSubmittedRef.current && !confirmingSubmitRef.current) {
            handleSubmitAttempt(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    try {
      const assessment = await createAssessment(courseId, {
        title: newAssessment.title,
        examType: newAssessment.examType,
        timeLimit: newAssessment.timeLimit ? parseInt(newAssessment.timeLimit) : undefined,
        maxScore: newAssessment.maxScore ? parseInt(newAssessment.maxScore) : 100,
        componentId: newAssessment.componentId || undefined,
      });
      setAssessments([...assessments, assessment]);
      setNewAssessment({ title: '', examType: 'QUIZ', timeLimit: '', maxScore: '100', componentId: '' });
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
      const msg = err?.data?.message || err.message;
      toast.error(msg);
    }
  };

  const handleDeleteAssessment = async (assessment) => {
    const confirmed = await confirm({
      title: 'Delete Assessment',
      message: `Delete "${assessment.title}"? This will also delete all questions and student attempts. This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    
    try {
      await deleteAssessment(assessment.id);
      setAssessments(assessments.filter(a => a.id !== assessment.id));
      toast.success('Assessment deleted!');
    } catch (err) {
      toast.error('Failed to delete assessment: ' + err.message);
    }
  };

  const startEditAssessment = (assessment) => {
    setEditingAssessmentId(assessment.id);
    setEditingAssessmentData({
      title: assessment.title || '',
      timeLimit: assessment.timeLimit || '',
      maxScore: assessment.maxScore || '',
    });
    setEditingAssessmentComponentId(assessment.componentId || null);
  };

  const cancelEditAssessment = () => {
    setEditingAssessmentId(null);
    setEditingAssessmentData({ title: '', timeLimit: '', maxScore: '' });
    setEditingAssessmentComponentId(null);
  };

  const handleSaveAssessment = async (assessmentId) => {
    try {
      const payload = {
        title: editingAssessmentData.title,
        timeLimit: editingAssessmentData.timeLimit ? parseInt(editingAssessmentData.timeLimit) : null,
      };
      // Only send maxScore when the assessment is NOT linked to a grade component
      if (!editingAssessmentComponentId) {
        payload.maxScore = editingAssessmentData.maxScore ? parseInt(editingAssessmentData.maxScore) : 100;
      }

      const updated = await updateAssessment(assessmentId, payload);
      setAssessments(assessments.map(a => a.id === assessmentId ? updated : a));
      setEditingAssessmentId(null);
      setEditingAssessmentData({ title: '', timeLimit: '', maxScore: '' });
      toast.success('Assessment updated!');
    } catch (err) {
      toast.error('Failed to update assessment: ' + err.message);
    }
  };

  const resetQuestionForm = (type = 'MCQ') => {
    setQuestionType(type);
    setQuestionForm({
      type,
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
    setEditingQuestion(null);
  };

  const loadAssessmentQuestions = async (assessment) => {
    try {
      const questions = await getAssessmentQuestions(assessment.id);
      setSelectedAssessmentQuestions(questions);
      setSelectedAssessment(assessment);
      resetQuestionForm('MCQ');
    } catch (err) {
      toast.error('Failed to load questions: ' + err.message);
    }
  };

  const toggleQuestionPanel = async (assessment) => {
    if (selectedAssessment?.id === assessment.id) {
      setSelectedAssessment(null);
      setSelectedAssessmentQuestions([]);
      setEditingQuestion(null);
      return;
    }
    await loadAssessmentQuestions(assessment);
  };

  const prepareEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionType(question.type);
    setQuestionForm({
      type: question.type,
      prompt: question.prompt || '',
      optionA: question.optionA || '',
      optionB: question.optionB || '',
      optionC: question.optionC || '',
      optionD: question.optionD || '',
      correct: question.correct || 'A',
      correctAnswer: question.correctAnswer || '',
      modelAnswer: question.modelAnswer || '',
      points: question.points || 1,
    });
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!selectedAssessment) return;

    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionForm);
        toast.success('Question updated!');
      } else {
        await createQuestion(selectedAssessment.id, questionForm);
        toast.success('Question added!');
      }
      const questions = await getAssessmentQuestions(selectedAssessment.id);
      setSelectedAssessmentQuestions(questions);
      resetQuestionForm(questionForm.type);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteQuestion = async (question) => {
    const confirmed = await confirm({
      title: 'Delete Question',
      message: 'Delete this question? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteQuestion(question.id);
      setSelectedAssessmentQuestions(selectedAssessmentQuestions.filter((q) => q.id !== question.id));
      toast.success('Question deleted!');
      if (editingQuestion?.id === question.id) {
        resetQuestionForm(questionType);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancelQuestionEdit = () => {
    resetQuestionForm('MCQ');
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
    const confirmed = await confirm({
      title: 'Delete Material',
      message: 'Delete this material? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    await deleteMaterial(materialId);
    setMaterials(materials.filter(m => m.id !== materialId));
    toast.success('Material deleted!');
  };

  const handleOpenPreview = async (material) => {
    setPreviewMaterial(material);
    // Track student view
    if (user?.role === 'STUDENT') {
      try {
        const result = await recordMaterialView(material.id);
        setCurrentViewId(result.viewId);
      } catch (err) {
        console.error('Failed to record view:', err);
      }
    }
  };

  const handleClosePreview = async () => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    // Close view tracking for student
    if (user?.role === 'STUDENT' && currentViewId) {
      try {
        await closeMaterialView(currentViewId);
      } catch (err) {
        console.error('Failed to close view tracking:', err);
      }
    }
    setCurrentViewId(null);
    setPreviewMaterial(null);
  };

  // Open material with reading time tracking (all types)
  const handleOpenHtmlReader = async (material) => {
    setHtmlReaderMaterial(material);
    setHtmlLoading(true);
    try {
      // PPTX/PPT files have HTML content via conversion
      if (material.htmlContent || material.fileType === 'pptx' || material.fileType === 'ppt') {
        const content = await getMaterialHtml(material.id);
        setHtmlContent(content);
      } else {
        // For other types, we'll render them in the reader modal directly
        setHtmlContent(null);
      }
    } catch (err) {
      console.error('Failed to load content:', err);
      // Non-fatal for non-PPTX materials, they can still be viewed
      setHtmlContent(null);
    } finally {
      setHtmlLoading(false);
    }
    // Track student view
    if (user?.role === 'STUDENT') {
      try {
        const view = await recordMaterialView(material.id);
        setCurrentViewId(view.viewId);
      } catch (err) {
        console.error('Failed to record view:', err);
      }
    }
  };

  const handleCloseHtmlReader = async () => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    
    // Close view tracking for student
    if (user?.role === 'STUDENT' && currentViewId) {
      try {
        await closeMaterialView(currentViewId);
      } catch (err) {
        console.error('Failed to close view tracking:', err);
      }
    }
    setCurrentViewId(null);
    setHtmlReaderMaterial(null);
    setHtmlContent(null);
  };

  const toggleFullscreen = async () => {
    const modalElement = document.getElementById('html-reader-modal');
    if (!modalElement) return;

    try {
      if (!document.fullscreenElement) {
        await modalElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
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
      // Reset quiz navigation state
      setCurrentQuestionIdx(0);
      setSkippedQuestions(new Set());
      // Initialize timer if timeLimit is set
      if (fullAttempt.assessment?.timeLimit) {
        setTimeRemaining(fullAttempt.assessment.timeLimit * 60); // convert minutes to seconds
      } else {
        setTimeRemaining(null);
      }
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
    setCurrentQuestionIdx(0);
    setSkippedQuestions(new Set());
    setTimeRemaining(null);
    setExamSubmitted(false);
    examSubmittedRef.current = false;
  };

  const handleSelectAnswer = async (questionId, selected) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selected }));
    await saveAnswer(activeAttempt.id, questionId, { selected });
  };

  const handleTextAnswer = async (questionId, textAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: textAnswer }));
    await saveAnswer(activeAttempt.id, questionId, { textAnswer });
  };

  const handleSubmitAttempt = async (autoSubmit = false) => {
    if (examSubmittedRef.current) return; // prevent double submit
    if (!autoSubmit) {
      // mark that user is in the manual confirmation flow to avoid race with auto-submit
      confirmingSubmitRef.current = true;
      const confirmed = await confirm({
        title: 'Submit Exam',
        message: 'Are you sure you want to submit this attempt? You cannot change your answers after submission.',
        confirmText: 'Submit',
        cancelText: 'Cancel',
        type: 'info',
      });
      // leave confirmation flow
      confirmingSubmitRef.current = false;
      if (!confirmed) return;
    }
    setExamSubmitted(true);
    examSubmittedRef.current = true; // set ref immediately to block timer
    setTimeRemaining(null); // stop timer immediately
    try {
      const result = await submitAttempt(activeAttempt.id);
      // Refresh attempts list
      getStudentAttempts(courseId).then(setStudentAttempts);
      if (autoSubmit) {
        toast.success('Time is up! Your answers have been submitted automatically.');
      } else {
        toast.success('Exam submitted successfully!');
      }
    } catch (err) {
      toast.error('Failed to submit: ' + err.message);
      setExamSubmitted(false);
      examSubmittedRef.current = false; // allow retry on error
    }
    handleEndExam();
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
    const confirmed = await confirm({
      title: 'Submit Grades',
      message: 'Are you sure you want to submit these grades?',
      confirmText: 'Submit',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!confirmed) return;
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
    const currentQuestion = questions[currentQuestionIdx];
    const answeredCount = Object.keys(answers).filter(qId => answers[qId] && answers[qId].length > 0).length;
    const skippedCount = skippedQuestions.size;
    const unansweredCount = questions.length - answeredCount;
    
    return (
      <Layout>
        <FaceTracker
          active={faceTrackingActive}
          attemptId={activeAttempt.id}
          profileImage={profileImage}
          onMismatch={handleFaceMismatch}
          intervalMs={60000}
        />
        <div className="max-w-5xl mx-auto">
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
          
          {/* Header with Timer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeAttempt.assessment?.title}</h2>
                <p className="text-gray-500 text-sm">{activeAttempt.assessment?.examType}</p>
              </div>
              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-700' : 
                  timeRemaining < 600 ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="font-mono text-lg font-bold">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-6">
            {/* Question Navigator - Left Sidebar */}
            <div className="w-20 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sticky top-4">
                <p className="text-xs text-gray-500 mb-2 text-center">Questions</p>
                <div className="grid grid-cols-2 gap-1">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] && answers[q.id].length > 0;
                    const isSkipped = skippedQuestions.has(q.id);
                    const isCurrent = idx === currentQuestionIdx;
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                          isCurrent
                            ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                            : isAnswered
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : isSkipped
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded bg-green-100"></div>
                    <span className="text-gray-500">{answeredCount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded bg-yellow-100"></div>
                    <span className="text-gray-500">{skippedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Question Area */}
            <div className="flex-1">
              {currentQuestion && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded">
                        Q{currentQuestionIdx + 1} of {questions.length} - {currentQuestion.type}
                      </span>
                      <p className="mt-3 text-gray-900 font-medium text-lg">{currentQuestion.prompt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{currentQuestion.points} pts</span>
                      <button
                        onClick={() => openReportModal(currentQuestion)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                        title="Report this question"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {currentQuestion.type === 'MCQ' && (
                    <div className="space-y-2 mt-4">
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                            answers[currentQuestion.id] === opt 
                              ? 'bg-primary-50 border-2 border-primary-500' 
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            checked={answers[currentQuestion.id] === opt}
                            onChange={() => handleSelectAnswer(currentQuestion.id, opt)}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="font-medium text-gray-700">{opt}:</span>
                          <span className="text-gray-900">{currentQuestion[`option${opt}`]}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'FITB' && (
                    <input
                      type="text"
                      placeholder="Type your answer..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mt-4"
                    />
                  )}

                  {currentQuestion.type === 'SHORT_ANSWER' && (
                    <textarea
                      placeholder="Write your answer..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mt-4"
                    />
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
                      disabled={currentQuestionIdx === 0}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSkippedQuestions(prev => new Set([...prev, currentQuestion.id]));
                          if (currentQuestionIdx < questions.length - 1) {
                            setCurrentQuestionIdx(currentQuestionIdx + 1);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium rounded-lg"
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip
                      </button>

                      {currentQuestionIdx < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubmitAttempt(false)}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                        >
                          <Flag className="w-4 h-4" />
                          Submit Exam
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Section */}
              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{answeredCount}</span> answered, {' '}
                    <span className="font-medium">{skippedCount}</span> skipped, {' '}
                    <span className="font-medium">{unansweredCount}</span> remaining
                  </div>
                  <button
                    onClick={() => { 
                      setActiveAttempt(null); 
                      setAnswers({});
                      handleEndExam();
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg text-sm"
                  >
                    Exit Exam
                  </button>
                </div>
              </div>
            </div>
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
                      {user?.role === 'TEACHER' && materialStats && (() => {
                        const stat = materialStats.find(s => s.materialId === m.id);
                        if (!stat) return null;
                        return (
                          <span className="inline-block mt-2 ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            <Eye className="w-3 h-3 inline mr-1" />
                            {stat.uniqueViewers}/{stat.totalStudents} viewed
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-5">
                      {m.content && (
                        <p className="text-sm text-gray-600 line-clamp-3">{m.content}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {/* Preview button for teachers/admins only */}
                        {(m.fileUrl || m.content) && user?.role !== 'STUDENT' && (
                          <button
                            onClick={() => handleOpenPreview(m)}
                            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                        )}
                        {/* Read with Tracking button for all materials (students) */}
                        {user?.role === 'STUDENT' && (
                          <button
                            onClick={() => handleOpenHtmlReader(m)}
                            className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            <ReadIcon className="w-4 h-4" />
                            Read with Tracking
                          </button>
                        )}
                        {m.fileUrl && m.fileType === 'link' && (
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Link
                          </a>
                        )}
                      </div>
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
                        <option value="ASSIGNMENT">Assignment</option>
                        <option value="MIDTERM">Midterm</option>
                        <option value="FINAL">Final</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Component</label>
                      <select
                        value={newAssessment.componentId}
                        onChange={(e) => {
                          const compId = e.target.value;
                          const comp = gradeComponents.find(c => c.id === compId);
                          setNewAssessment({
                            ...newAssessment,
                            componentId: compId,
                            maxScore: comp ? String(comp.weight) : newAssessment.maxScore,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      >
                        <option value="">None</option>
                        {gradeComponents.filter(c => c.name !== 'Attendance').map(comp => (
                          <option key={comp.id} value={comp.id}>{comp.name} ({comp.weight}%)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Mode</label>
                      <select
                        value={newAssessment.deliveryMode}
                        onChange={(e) => setNewAssessment({ ...newAssessment, deliveryMode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      >
                        <option value="ONLINE">Online</option>
                        <option value="PAPER">Paper</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Score {newAssessment.componentId && <span className="text-gray-400">(auto-set from component weight)</span>}</label>
                    <input
                      type="number"
                      min="1"
                      value={newAssessment.maxScore}
                      onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })}
                      disabled={!!newAssessment.componentId}
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
                              a.examType === 'ASSIGNMENT' ? 'bg-emerald-50 text-emerald-700' :
                              a.examType === 'MIDTERM' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {a.examType}
                            </span>
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              a.deliveryMode === 'ONLINE' ? 'bg-purple-50 text-purple-700' :
                              'bg-orange-50 text-orange-700'
                            }`}>
                              {a.deliveryMode || 'ONLINE'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                              a.isOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {a.isOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              {a.isOpen ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      {editingAssessmentId === a.id && (
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                          <h4 className="text-sm font-semibold text-gray-900">Edit Assessment</h4>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-1">
                              <label className="block text-sm font-medium text-gray-700">Title</label>
                              <input
                                type="text"
                                value={editingAssessmentData.title}
                                onChange={(e) => setEditingAssessmentData({ ...editingAssessmentData, title: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Time Limit</label>
                              <input
                                type="number"
                                min="0"
                                value={editingAssessmentData.timeLimit}
                                onChange={(e) => setEditingAssessmentData({ ...editingAssessmentData, timeLimit: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                placeholder="Minutes"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Max Score</label>
                              <input
                                type="number"
                                min="1"
                                value={editingAssessmentData.maxScore}
                                onChange={(e) => setEditingAssessmentData({ ...editingAssessmentData, maxScore: e.target.value })}
                                disabled={!!editingAssessmentComponentId}
                                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveAssessment(a.id)}
                              className="flex-1 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={cancelEditAssessment}
                              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {a.timeLimit && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {a.timeLimit} min
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                        <span className="font-medium">Max Score:</span> {a.maxScore || 100}
                        {a.totalPoints !== undefined && a.totalPoints !== a.maxScore && (
                          <span className="ml-2 text-red-600 text-xs font-medium">
                            (Questions total: {a.totalPoints} — must equal {a.maxScore} to open)
                          </span>
                        )}
                        {a.totalPoints !== undefined && a.totalPoints === a.maxScore && (
                          <span className="ml-2 text-green-600 text-xs font-medium">
                            ✓ Points match
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {user?.role === 'TEACHER' && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleToggleAssessment(a.id, !a.isOpen)}
                            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                              a.isOpen 
                                ? 'bg-red-50 hover:bg-red-100 text-red-700' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {a.isOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            {a.isOpen ? 'Deactivate' : 'Activate'}
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
                            onClick={() => toggleQuestionPanel(a)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            {selectedAssessment?.id === a.id ? 'Close' : 'Add Questions'}
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditAssessment(a)}
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
                          const existingAttempt = studentAttempts.find(att => att.assessmentId === a.id && (att.status === 'SUBMITTED' || att.status === 'GRADED'));
                          return existingAttempt ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">Completed</span>
                                </div>
                                {existingAttempt.score !== null && (
                                  <span className="text-sm font-bold text-green-700">
                                    Score: {existingAttempt.score}{existingAttempt.assessment?.maxScore ? `/${existingAttempt.assessment.maxScore}` : ' pts'}
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
                            <div className="flex items-center gap-2 text-red-500 text-sm">
                              <Lock className="w-4 h-4" />
                              Assessment not yet activated
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Question Manager */}
                    {selectedAssessment?.id === a.id && (
                      <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">Question Manager</h4>
                            <p className="text-sm text-gray-500">Create, edit, or remove questions for this assessment.</p>
                          </div>
                          {editingQuestion && (
                            <button
                              type="button"
                              onClick={handleCancelQuestionEdit}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                            >
                              Cancel edit
                            </button>
                          )}
                        </div>

                        {selectedAssessmentQuestions.length > 0 && (
                          <div className="space-y-3">
                            {selectedAssessmentQuestions.map((question, idx) => (
                              <div key={question.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                      <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full">Q{idx + 1}</span>
                                      <span>{question.type}</span>
                                    </div>
                                    <p className="font-medium text-gray-900">{question.prompt}</p>
                                    <p className="mt-2 text-sm text-gray-500">{question.points} point{question.points === 1 ? '' : 's'}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => prepareEditQuestion(question)}
                                      className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteQuestion(question)}
                                      className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                          <h5 className="text-base font-semibold text-gray-900 mb-4">
                            {editingQuestion ? 'Edit Question' : 'Add Question'}
                          </h5>
                          <form onSubmit={handleSubmitQuestion} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                              <select
                                value={questionType}
                                onChange={(e) => {
                                  setQuestionType(e.target.value);
                                  setQuestionForm({ ...questionForm, type: e.target.value });
                                }}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                              >
                                <option value="MCQ">Multiple Choice</option>
                                <option value="FITB">Fill in the Blank</option>
                                <option value="SHORT_ANSWER">Short Answer</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                              <textarea
                                value={questionForm.prompt}
                                onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                                required
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                placeholder="Enter the question..."
                              />
                            </div>

                            {questionType === 'MCQ' && (
                              <div className="space-y-3">
                                {['A', 'B', 'C', 'D'].map((opt) => (
                                  <div key={opt} className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr] items-center">
                                    <span className="text-sm font-medium text-gray-700">Option {opt}</span>
                                    <input
                                      placeholder={`Option ${opt}`}
                                      value={questionForm[`option${opt}`]}
                                      onChange={(e) => setQuestionForm({ ...questionForm, [`option${opt}`]: e.target.value })}
                                      required
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
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
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correct answer</label>
                                <input
                                  placeholder="Correct answer"
                                  value={questionForm.correctAnswer}
                                  onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                  required
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                />
                              </div>
                            )}

                            {questionType === 'SHORT_ANSWER' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model answer</label>
                                <textarea
                                  placeholder="Model answer for grading reference"
                                  value={questionForm.modelAnswer}
                                  onChange={(e) => setQuestionForm({ ...questionForm, modelAnswer: e.target.value })}
                                  required
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                />
                              </div>
                            )}

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                              <div className="sm:flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={questionForm.points}
                                  onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full sm:w-auto px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                              >
                                {editingQuestion ? 'Update Question' : 'Add Question'}
                              </button>
                            </div>
                          </form>
                        </div>
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
                            {attempt.score !== null && submissionsAssessment?.maxScore ? `${attempt.score}/${submissionsAssessment.maxScore}` : attempt.score !== null ? `${attempt.score}` : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {attempt.faceVerification ? (
                            attempt.faceVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </span>
                            ) : attempt.faceVerification.adminReviewed && !attempt.faceVerification.adminApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                <XCircle className="w-3 h-3" />
                                Rejected
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
                          {attempt.faceVerification && !attempt.faceVerification.matchResult && (!attempt.faceVerification.adminReviewed || !attempt.faceVerification.adminApproved) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                              <AlertCircle className="w-3 h-3" />
                              {!attempt.faceVerification.adminReviewed ? 'Face mismatch - grading blocked' : 'Face rejected - grading blocked'}
                            </span>
                          ) : (
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
                          )}
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

      {/* Report Question Modal */}
      {showReportModal && reportingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Report Question</h2>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportingQuestion(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">{reportingQuestion.prompt}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you think this question is incorrect or has an issue?
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Please explain the issue with this question (at least 10 characters)..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportingQuestion(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportQuestion}
                  disabled={submittingReport || reportReason.trim().length < 10}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Preview Modal */}
      {previewMaterial && (
        <div id="preview-modal" className={`${isFullscreen ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'}`}>
          <div className={`bg-white dark:bg-gray-800 ${isFullscreen ? 'w-full h-full' : 'rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh]'} flex flex-col`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${isFullscreen ? 'hidden' : ''}`}>
              <div className="flex items-center gap-3">
                {previewMaterial.fileType === 'video' ? (
                  <ExternalLink className="w-5 h-5 text-purple-500" />
                ) : previewMaterial.fileType === 'pdf' ? (
                  <FileText className="w-5 h-5 text-red-500" />
                ) : previewMaterial.fileType === 'ppt' ? (
                  <FileText className="w-5 h-5 text-orange-500" />
                ) : previewMaterial.fileType === 'doc' ? (
                  <FileText className="w-5 h-5 text-blue-500" />
                ) : previewMaterial.fileType === 'link' ? (
                  <LinkIcon className="w-5 h-5 text-blue-500" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-500" />
                )}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{previewMaterial.title}</h2>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                  {previewMaterial.fileType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleClosePreview()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Floating fullscreen buttons */}
            {isFullscreen && (
              <div className="fixed top-4 right-4 z-[60] flex gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/90 hover:bg-white shadow-lg rounded-lg text-gray-700"
                  title="Exit Fullscreen"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleClosePreview()}
                  className="p-2 bg-white/90 hover:bg-white shadow-lg rounded-lg text-gray-700"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Text Content */}
              {previewMaterial.fileType === 'text' && previewMaterial.content && (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                    {previewMaterial.content}
                  </div>
                </div>
              )}

              {/* Video - YouTube/Vimeo embed */}
              {previewMaterial.fileType === 'video' && previewMaterial.fileUrl && (
                <div className="w-full">
                  {(() => {
                    const url = previewMaterial.fileUrl;
                    // YouTube
                    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
                    if (ytMatch) {
                      return (
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            className="absolute inset-0 w-full h-full rounded-lg"
                            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                            title={previewMaterial.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    // Vimeo
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (vimeoMatch) {
                      return (
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            className="absolute inset-0 w-full h-full rounded-lg"
                            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                            title={previewMaterial.title}
                            frameBorder="0"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    // Direct video URL (mp4, webm, etc.)
                    if (url.match(/\.(mp4|webm|ogg)$/i)) {
                      return (
                        <video controls className="w-full rounded-lg max-h-[70vh]">
                          <source src={url} />
                          Your browser does not support the video tag.
                        </video>
                      );
                    }
                    // Fallback: open in iframe
                    return (
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute inset-0 w-full h-full rounded-lg"
                          src={url}
                          title={previewMaterial.title}
                          frameBorder="0"
                          allowFullScreen
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* PDF - displayed inline via /preview endpoint */}
              {previewMaterial.fileType === 'pdf' && previewMaterial.fileUrl && (
                <div className="w-full" style={{ height: '75vh' }}>
                  <iframe
                    src={`${API_BASE}/materials/${previewMaterial.id}/preview`}
                    className="w-full h-full rounded-lg border-0"
                    title={previewMaterial.title}
                  />
                </div>
              )}

              {/* PPT / DOC / XLS - Converted to PDF and displayed inline via /preview endpoint */}
              {(previewMaterial.fileType === 'ppt' || previewMaterial.fileType === 'doc' || previewMaterial.fileType === 'xls' || previewMaterial.fileType === 'pptx' || previewMaterial.fileType === 'docx' || previewMaterial.fileType === 'xlsx') && previewMaterial.fileUrl && (
                <div className="w-full" style={{ height: '75vh' }}>
                  <iframe
                    src={`${API_BASE}/materials/${previewMaterial.id}/preview`}
                    className="w-full h-full rounded-lg border-0"
                    title={previewMaterial.title}
                  />
                </div>
              )}

              {/* External Link - embed in iframe */}
              {previewMaterial.fileType === 'link' && previewMaterial.fileUrl && (
                <div className="w-full" style={{ height: '75vh' }}>
                  <iframe
                    src={previewMaterial.fileUrl}
                    className="w-full h-full rounded-lg border-0"
                    title={previewMaterial.title}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
              )}

              {/* Fallback for content-only materials */}
              {!previewMaterial.fileUrl && previewMaterial.content && previewMaterial.fileType !== 'text' && (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                    {previewMaterial.content}
                  </div>
                </div>
              )}

              {/* No preview available */}
              {!previewMaterial.fileUrl && !previewMaterial.content && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <FileText className="w-16 h-16 text-gray-300" />
                  <p className="text-gray-500">No preview available for this material</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400">
                Added by {previewMaterial.author?.fullName || 'Unknown'} on {new Date(previewMaterial.createdAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                {previewMaterial.fileUrl && (
                  <a
                    href={previewMaterial.fileUrl.startsWith('data:')
                      ? `${API_BASE}/materials/${previewMaterial.id}/file`
                      : previewMaterial.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm inline-flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </a>
                )}
                <button
                  onClick={() => handleClosePreview()}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HTML Reader Modal - supports all material types with tracking */}
      {htmlReaderMaterial && (
        <div id="html-reader-modal" className={`${isFullscreen ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2'}`}>
          <div className={`bg-white dark:bg-gray-800 ${isFullscreen ? 'w-full h-full' : 'rounded-xl shadow-2xl w-full h-full max-w-[95vw]'} flex flex-col`}>
            {/* Header - hidden in fullscreen */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${isFullscreen ? 'hidden' : ''}`}>
              <div className="flex items-center gap-3">
                <ReadIcon className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{htmlReaderMaterial.title}</h2>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                  Tracked Reader
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleCloseHtmlReader()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Floating exit button for fullscreen */}
            {isFullscreen && (
              <div className="fixed top-4 right-4 z-[60] flex gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-white/90 hover:bg-white shadow-lg rounded-lg text-gray-700"
                  title="Exit Fullscreen"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleCloseHtmlReader()}
                  className="p-2 bg-white/90 hover:bg-white shadow-lg rounded-lg text-gray-700"
                  title="Close Reader"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content - renders based on material type */}
            <div className="flex-1 overflow-hidden bg-white">
              {htmlLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">Loading reader...</p>
                  </div>
                </div>
              ) : htmlContent ? (
                /* PPTX/PPT HTML content */
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full border-0"
                  style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}
                  title={htmlReaderMaterial.title}
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : htmlReaderMaterial.fileType === 'text' ? (
                /* Text content */
                <div className="p-6 overflow-auto" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}>
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                      {htmlReaderMaterial.content}
                    </div>
                  </div>
                </div>
              ) : htmlReaderMaterial.fileType === 'pdf' && htmlReaderMaterial.fileUrl ? (
                /* PDF via preview endpoint */
                <iframe
                  src={`${API_BASE}/materials/${htmlReaderMaterial.id}/preview`}
                  className="w-full h-full border-0"
                  style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}
                  title={htmlReaderMaterial.title}
                />
              ) : (htmlReaderMaterial.fileType === 'ppt' || htmlReaderMaterial.fileType === 'doc' || htmlReaderMaterial.fileType === 'xls' || htmlReaderMaterial.fileType === 'pptx' || htmlReaderMaterial.fileType === 'docx' || htmlReaderMaterial.fileType === 'xlsx') && htmlReaderMaterial.fileUrl ? (
                /* Office docs via preview endpoint */
                <iframe
                  src={`${API_BASE}/materials/${htmlReaderMaterial.id}/preview`}
                  className="w-full h-full border-0"
                  style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}
                  title={htmlReaderMaterial.title}
                />
              ) : htmlReaderMaterial.fileType === 'video' && htmlReaderMaterial.fileUrl ? (
                /* Video embed */
                <div className="flex items-center justify-center h-full" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}>
                  {(() => {
                    const url = htmlReaderMaterial.fileUrl;
                    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
                    if (ytMatch) {
                      return <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ytMatch[1]}`} title={htmlReaderMaterial.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
                    }
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (vimeoMatch) {
                      return <iframe className="w-full h-full" src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} title={htmlReaderMaterial.title} frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />;
                    }
                    if (url.match(/\.(mp4|webm|ogg)$/i)) {
                      return <video controls className="w-full h-full"><source src={url} />Your browser does not support the video tag.</video>;
                    }
                    return <iframe className="w-full h-full" src={url} title={htmlReaderMaterial.title} allowFullScreen />;
                  })()}
                </div>
              ) : htmlReaderMaterial.fileType === 'link' && htmlReaderMaterial.fileUrl ? (
                /* External link embed */
                <iframe
                  src={htmlReaderMaterial.fileUrl}
                  className="w-full h-full border-0"
                  style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}
                  title={htmlReaderMaterial.title}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              ) : htmlReaderMaterial.content ? (
                /* Fallback: show text content */
                <div className="p-6 overflow-auto" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 140px)' }}>
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                      {htmlReaderMaterial.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-red-500">No content available for this material.</p>
                </div>
              )}
            </div>

            {/* Footer - hidden in fullscreen */}
            <div className={`flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700 ${isFullscreen ? 'hidden' : ''}`}>
              <p className="text-xs text-gray-400">
                Reading time is being tracked
              </p>
              <button
                onClick={() => handleCloseHtmlReader()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
