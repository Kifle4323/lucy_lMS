// API base URL - uses Render backend in production, localhost:4000 in dev
export const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000/api'
  : 'https://lucy-lms-back.onrender.com/api';

function getToken() {
  return localStorage.getItem('accessToken');
}

export async function apiFetch(path, options) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || body.message || `HTTP ${res.status}`);
    // Pass through additional error properties
    if (body.missingFields) err.missingFields = body.missingFields;
    if (body.details) err.details = body.details;
    throw err;
  }

  return res.json();
}

// Auth
export async function register(data) {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function login(data) {
  const result = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);
  return result;
}

export async function getMe() {
  return apiFetch('/me');
}

// Update profile (name and picture)
export async function updateMyProfile(data) {
  return apiFetch('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

// Change password
export async function changePassword(currentPassword, newPassword) {
  return apiFetch('/me/change-password', { 
    method: 'POST', 
    body: JSON.stringify({ currentPassword, newPassword }) 
  });
}

// Admin: create user
export async function adminCreateUser(data) {
  return apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

// Admin: get pending users
export async function getPendingUsers() {
  return apiFetch('/admin/pending-users');
}

// Admin: approve user
export async function approveUser(userId) {
  return apiFetch(`/admin/users/${userId}/approve`, { method: 'POST' });
}

// Admin: reject/delete user
export async function deleteUser(userId) {
  return apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
}

// Classes
export async function getClasses() {
  return apiFetch('/classes');
}

export async function getClass(classId) {
  return apiFetch(`/classes/${classId}`);
}

export async function createClass(data) {
  return apiFetch('/classes', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateClass(classId, data) {
  return apiFetch(`/classes/${classId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteClass(classId) {
  return apiFetch(`/classes/${classId}`, { method: 'DELETE' });
}

export async function addStudentToClass(classId, studentId) {
  return apiFetch(`/classes/${classId}/students`, { method: 'POST', body: JSON.stringify({ studentId }) });
}

export async function removeStudentFromClass(classId, studentId) {
  return apiFetch(`/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
}

export async function addTeacherToClass(classId, teacherId) {
  return apiFetch(`/classes/${classId}/teachers`, { method: 'POST', body: JSON.stringify({ teacherId }) });
}

export async function removeTeacherFromClass(classId, teacherId) {
  return apiFetch(`/classes/${classId}/teachers/${teacherId}`, { method: 'DELETE' });
}

export async function assignCourseToClass(classId, courseId, teacherId) {
  return apiFetch(`/classes/${classId}/courses`, { method: 'POST', body: JSON.stringify({ courseId, teacherId }) });
}

export async function removeCourseFromClass(classId, courseId) {
  return apiFetch(`/classes/${classId}/courses/${courseId}`, { method: 'DELETE' });
}

// Courses
export async function getCourses() {
  return apiFetch('/courses');
}

export async function createCourse(data) {
  return apiFetch('/courses', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCourse(id, data) {
  return apiFetch(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteCourse(id) {
  return apiFetch(`/courses/${id}`, { method: 'DELETE' });
}

// Admin: get all users
export async function getUsers() {
  return apiFetch('/users');
}

// Teacher: get students enrolled in a course
export async function getCourseStudents(courseId) {
  return apiFetch(`/courses/${courseId}/students`);
}

// Student: get own attempts for a course
export async function getStudentAttempts(courseId) {
  return apiFetch(`/courses/${courseId}/my-attempts`);
}

// Assessments
export async function getCourseAssessments(courseId) {
  return apiFetch(`/courses/${courseId}/assessments`);
}

export async function createAssessment(courseId, data) {
  return apiFetch(`/courses/${courseId}/assessments`, { method: 'POST', body: JSON.stringify(data) });
}

export async function createQuestion(assessmentId, data) {
  return apiFetch(`/assessments/${assessmentId}/questions`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateQuestion(questionId, data) {
  return apiFetch(`/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteQuestion(questionId) {
  return apiFetch(`/questions/${questionId}`, { method: 'DELETE' });
}

export async function getAssessmentQuestions(assessmentId) {
  return apiFetch(`/assessments/${assessmentId}/questions`);
}

export async function toggleAssessmentOpen(assessmentId, isOpen) {
  return apiFetch(`/assessments/${assessmentId}/open`, { method: 'PATCH', body: JSON.stringify({ isOpen }) });
}

export async function updateAssessment(assessmentId, data) {
  return apiFetch(`/assessments/${assessmentId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteAssessment(assessmentId) {
  return apiFetch(`/assessments/${assessmentId}`, { method: 'DELETE' });
}

export async function getManualGrades(assessmentId) {
  return apiFetch(`/assessments/${assessmentId}/manual-grades`);
}

export async function setManualGrade(assessmentId, studentId, score, feedback) {
  return apiFetch(`/assessments/${assessmentId}/manual-grades/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify({ score, feedback }),
  });
}

export async function deleteManualGrade(assessmentId, studentId) {
  return apiFetch(`/assessments/${assessmentId}/manual-grades/${studentId}`, { method: 'DELETE' });
}

// Gradebook
export async function getGradeComponents(courseId) {
  return apiFetch(`/courses/${courseId}/grade-components`);
}

export async function addGradeComponent(courseId, name, weight) {
  return apiFetch(`/courses/${courseId}/grade-components`, { method: 'POST', body: JSON.stringify({ name, weight }) });
}

export async function updateGradeComponent(courseId, componentId, data) {
  return apiFetch(`/courses/${courseId}/grade-components/${componentId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteGradeComponent(courseId, componentId) {
  return apiFetch(`/courses/${courseId}/grade-components/${componentId}`, { method: 'DELETE' });
}

export async function getGradeConfig(courseId) {
  return apiFetch(`/courses/${courseId}/grade-components`);
}

export async function getAttendance(courseId) {
  return apiFetch(`/courses/${courseId}/attendance`);
}

export async function setAttendance(courseId, studentId, score, feedback) {
  return apiFetch(`/courses/${courseId}/attendance/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify({ score, feedback }),
  });
}

export async function getGradebook(courseId) {
  return apiFetch(`/courses/${courseId}/gradebook`);
}

export async function getMyGrades(courseId) {
  return apiFetch(`/courses/${courseId}/my-grades`);
}

// Face Verification
export async function updateProfile(data) {
  return apiFetch('/users/me/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function getProfileStatus() {
  return apiFetch('/users/me/profile-status');
}

export async function getStudentsProfiles() {
  return apiFetch('/admin/students-profiles');
}

export async function getPendingFaceVerifications() {
  return apiFetch('/admin/face-verifications/pending');
}

export async function getFaceVerifications(status) {
  const query = status ? `?status=${status}` : '';
  return apiFetch(`/admin/face-verifications${query}`);
}

export async function reviewFaceVerification(id, approved) {
  return apiFetch(`/admin/face-verifications/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ approved }),
  });
}

export async function getAttemptsForGrading(assessmentId) {
  return apiFetch(`/assessments/${assessmentId}/attempts-for-grading`);
}

export async function createFaceVerification(attemptId, capturedImage, matchResult) {
  return apiFetch('/face-verifications', {
    method: 'POST',
    body: JSON.stringify({ attemptId, capturedImage, matchResult }),
  });
}

export async function gradeAttempt(attemptId, answers) {
  return apiFetch(`/attempts/${attemptId}/grade`, { method: 'POST', body: JSON.stringify({ answers }) });
}

export async function startAttempt(assessmentId) {
  return apiFetch(`/assessments/${assessmentId}/attempts`, { method: 'POST' });
}

export async function getAttempt(attemptId) {
  return apiFetch(`/attempts/${attemptId}`);
}

export async function saveAnswer(attemptId, questionId, data) {
  return apiFetch(`/attempts/${attemptId}/answers`, { method: 'PATCH', body: JSON.stringify({ questionId, ...data }) });
}

export async function submitAttempt(attemptId) {
  return apiFetch(`/attempts/${attemptId}/submit`, { method: 'POST' });
}

// Materials
export async function getCourseMaterials(courseId) {
  return apiFetch(`/courses/${courseId}/materials`);
}

export async function createMaterial(courseId, data) {
  return apiFetch(`/courses/${courseId}/materials`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMaterial(materialId, data) {
  return apiFetch(`/materials/${materialId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteMaterial(materialId) {
  return apiFetch(`/materials/${materialId}`, { method: 'DELETE' });
}

export async function recordMaterialView(materialId) {
  return apiFetch(`/materials/${materialId}/view`, { method: 'POST' });
}

export async function closeMaterialView(viewId) {
  return apiFetch(`/material-views/${viewId}/close`, { method: 'PATCH' });
}

// Get PPTX material as HTML with reading time tracking
export async function getMaterialHtml(materialId) {
  const res = await fetch(`${API_BASE}/materials/${materialId}/html`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to load HTML material');
  return res.text();
}

// Save reading progress for PPTX materials
export async function saveReadingProgress(materialId, progress) {
  return apiFetch(`/materials/${materialId}/progress`, {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

// Get student's reading progress for a material
export async function getReadingProgress(materialId) {
  return apiFetch(`/materials/${materialId}/progress`);
}

// Teacher: Get all students' reading progress for a material
export async function getAllReadingProgress(materialId) {
  return apiFetch(`/materials/${materialId}/progress-all`);
}

export async function getCourseMaterialStats(courseId) {
  return apiFetch(`/courses/${courseId}/material-stats`);
}

// Live Sessions
export async function getCourseLiveSessions(courseId) {
  return apiFetch(`/courses/${courseId}/live-sessions`);
}

export async function getClassLiveSessions(classId) {
  return apiFetch(`/classes/${classId}/live-sessions`);
}

export async function getUpcomingLiveSessions() {
  return apiFetch('/live-sessions/upcoming');
}

export async function createLiveSession(courseId, data) {
  return apiFetch(`/courses/${courseId}/live-sessions`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateLiveSession(sessionId, data) {
  return apiFetch(`/live-sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteLiveSession(sessionId) {
  return apiFetch(`/live-sessions/${sessionId}`, { method: 'DELETE' });
}

export async function getLiveSession(sessionId) {
  return apiFetch(`/live-sessions/${sessionId}`);
}

// Live Session Attendance
export async function joinLiveSession(sessionId) {
  return apiFetch(`/live-sessions/${sessionId}/join`, { method: 'POST' });
}

export async function leaveLiveSession(sessionId) {
  return apiFetch(`/live-sessions/${sessionId}/leave`, { method: 'POST' });
}

export async function endLiveSession(sessionId) {
  return apiFetch(`/live-sessions/${sessionId}/end`, { method: 'POST' });
}

export async function getLiveSessionAttendance(sessionId) {
  return apiFetch(`/live-sessions/${sessionId}/attendance`);
}

// Student Profile
export async function getStudentProfile() {
  return apiFetch('/student/profile');
}

export async function updateStudentProfile(data) {
  return apiFetch('/student/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function uploadStudentDocument(documentType, fileName, fileUrl) {
  return apiFetch('/student/profile/documents', { 
    method: 'POST', 
    body: JSON.stringify({ documentType, fileName, fileUrl }) 
  });
}

export async function deleteStudentDocument(documentId) {
  return apiFetch(`/student/profile/documents/${documentId}`, { method: 'DELETE' });
}

// Admin - Student Profiles
export async function getPendingStudentProfiles() {
  return apiFetch('/admin/student-profiles/pending');
}

export async function getAllStudentProfiles(status) {
  const query = status ? `?status=${status}` : '';
  return apiFetch(`/admin/student-profiles${query}`);
}

export async function getStudentProfileById(profileId) {
  return apiFetch(`/admin/student-profiles/${profileId}`);
}

export async function approveStudentProfile(profileId) {
  return apiFetch(`/admin/student-profiles/${profileId}/approve`, { method: 'POST' });
}

export async function rejectStudentProfile(profileId, reason) {
  return apiFetch(`/admin/student-profiles/${profileId}/reject`, { 
    method: 'POST', 
    body: JSON.stringify({ reason }) 
  });
}

// Notifications
export async function getAdminNotifications() {
  return apiFetch('/admin/notifications');
}

// ==================== Academic Management ====================

// Academic Years (Admin)
export async function createAcademicYear(data) {
  return apiFetch('/admin/academic-years', { method: 'POST', body: JSON.stringify(data) });
}

export async function getAcademicYears() {
  return apiFetch('/admin/academic-years');
}

export async function updateAcademicYear(id, data) {
  return apiFetch(`/admin/academic-years/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAcademicYear(id) {
  return apiFetch(`/admin/academic-years/${id}`, { method: 'DELETE' });
}

// Semesters (Admin)
export async function createSemester(data) {
  const sanitized = { ...data };
  if (sanitized.registrationFee !== '' && sanitized.registrationFee !== undefined) {
    sanitized.registrationFee = parseFloat(sanitized.registrationFee) || null;
  } else {
    sanitized.registrationFee = null;
  }
  return apiFetch('/admin/semesters', { method: 'POST', body: JSON.stringify(sanitized) });
}

export async function getSemesters() {
  return apiFetch('/admin/semesters');
}

export async function getCurrentSemester() {
  return apiFetch('/semesters/current');
}

export async function updateSemester(id, data) {
  const sanitized = { ...data };
  if (sanitized.registrationFee !== '' && sanitized.registrationFee !== undefined) {
    sanitized.registrationFee = parseFloat(sanitized.registrationFee) || null;
  } else if (sanitized.registrationFee === '') {
    sanitized.registrationFee = null;
  }
  return apiFetch(`/admin/semesters/${id}`, { method: 'PATCH', body: JSON.stringify(sanitized) });
}

export async function deleteSemester(id) {
  return apiFetch(`/admin/semesters/${id}`, { method: 'DELETE' });
}

export async function publishSemesterGrades(semesterId) {
  return apiFetch(`/admin/semesters/${semesterId}/publish-grades`, { method: 'POST' });
}

export async function getSemesterGPAReport(semesterId) {
  return apiFetch(`/admin/semesters/${semesterId}/gpa-report`);
}

// Course Sections (Admin)
export async function createCourseSection(data) {
  return apiFetch('/admin/course-sections', { method: 'POST', body: JSON.stringify(data) });
}

export async function getCourseSections(semesterId) {
  const query = semesterId ? `?semesterId=${semesterId}` : '';
  return apiFetch(`/admin/course-sections${query}`);
}

export async function updateCourseSection(id, data) {
  return apiFetch(`/admin/course-sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteCourseSection(id) {
  const res = await fetch(`${API_BASE}/admin/course-sections/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  // 204 No Content - return success
  return { success: true };
}

// Enrollments (Admin)
export async function enrollStudent(data) {
  return apiFetch('/admin/enrollments', { method: 'POST', body: JSON.stringify(data) });
}

export async function getSectionEnrollments(sectionId) {
  return apiFetch(`/admin/course-sections/${sectionId}/enrollments`);
}

export async function removeEnrollment(enrollmentId) {
  return apiFetch(`/admin/enrollments/${enrollmentId}`, { method: 'DELETE' });
}

// Student - Course Registration
export async function getAvailableCourses() {
  return apiFetch('/student/available-courses');
}

export async function registerForSemester() {
  return apiFetch('/student/register-semester', { method: 'POST' });
}

export async function getMyEnrollments() {
  return apiFetch('/student/my-courses');
}

// Student - Results
export async function getMyResults(semesterId) {
  const query = semesterId ? `/${semesterId}` : '';
  return apiFetch(`/student/results${query}`);
}

export async function getMyCGPA() {
  return apiFetch('/student/cgpa');
}

// Teacher - Course Sections
export async function getTeacherSections() {
  return apiFetch('/teacher/my-sections');
}

export async function getSectionStudents(sectionId) {
  return apiFetch(`/teacher/sections/${sectionId}/students`);
}

// Notifications
export async function getNotifications() {
  return apiFetch('/notifications');
}

export async function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'POST' });
}

export async function enterGrade(data) {
  return apiFetch('/teacher/grades', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitSectionGrades(sectionId) {
  return apiFetch(`/teacher/sections/${sectionId}/submit-grades`, { method: 'POST' });
}

export async function syncAssessmentsToGrades(sectionId) {
  return apiFetch(`/teacher/sections/${sectionId}/sync-assessments`, { method: 'POST' });
}

export async function getLiveAttendanceStats(sectionId) {
  return apiFetch(`/course-sections/${sectionId}/live-attendance`);
}

export async function syncAttendanceToGrades(sectionId) {
  return apiFetch(`/course-sections/${sectionId}/sync-attendance`, { method: 'POST' });
}

export async function createManualAttendance(sectionId, data) {
  return apiFetch(`/course-sections/${sectionId}/manual-attendance`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getManualAttendanceSessions(sectionId) {
  return apiFetch(`/course-sections/${sectionId}/manual-attendance`);
}

export async function deleteManualAttendanceSession(sessionId) {
  return apiFetch(`/manual-attendance/${sessionId}`, { method: 'DELETE' });
}

// Teacher - Exam Schedules
export async function createExamSchedule(data) {
  return apiFetch('/teacher/exam-schedules', { method: 'POST', body: JSON.stringify(data) });
}

export async function getSectionExamSchedules(sectionId) {
  return apiFetch(`/teacher/sections/${sectionId}/exam-schedules`);
}

export async function updateExamSchedule(id, data) {
  return apiFetch(`/teacher/exam-schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteExamSchedule(id) {
  return apiFetch(`/teacher/exam-schedules/${id}`, { method: 'DELETE' });
}

export async function proposeEarlyExam(id, data) {
  return apiFetch(`/teacher/exam-schedules/${id}/propose-early`, { method: 'POST', body: JSON.stringify(data) });
}

export async function cancelEarlyExamProposal(id) {
  return apiFetch(`/teacher/exam-schedules/${id}/propose-early`, { method: 'DELETE' });
}

export async function getEarlyExamResponses(examScheduleId) {
  return apiFetch(`/teacher/exam-schedules/${examScheduleId}/early-responses`);
}

// Question Reports
export async function reportQuestion(questionId, reason) {
  return apiFetch(`/questions/${questionId}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function getMyQuestionReports() {
  return apiFetch('/my/question-reports');
}

export async function deleteMyQuestionReport(reportId) {
  return apiFetch(`/my/question-reports/${reportId}`, { method: 'DELETE' });
}

export async function getTeacherQuestionReports(status = 'ALL') {
  const query = status !== 'ALL' ? `?status=${status}` : '';
  return apiFetch(`/teacher/question-reports${query}`);
}

export async function updateQuestionReportStatus(reportId, data) {
  return apiFetch(`/teacher/question-reports/${reportId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function getTeacherQuestionReportsCount() {
  return apiFetch('/teacher/question-reports/count');
}

export async function confirmEarlyExam(examScheduleId) {
  return apiFetch(`/teacher/exam-schedules/${examScheduleId}/confirm-early`, { method: 'POST' });
}

// Student - Exam Schedules
export async function getStudentExamSchedules() {
  return apiFetch('/student/exam-schedules');
}

export async function respondToEarlyExamProposal(examScheduleId, agreed) {
  return apiFetch(`/student/exam-schedules/${examScheduleId}/respond`, { method: 'POST', body: JSON.stringify({ agreed }) });
}

// Add/Drop - Student
export async function getAddDropEligibility() {
  return apiFetch('/add-drop/eligibility');
}

export async function submitAddRequest(courseSectionId, reason) {
  return apiFetch('/add-drop/add', { method: 'POST', body: JSON.stringify({ courseSectionId, reason }) });
}

export async function submitDropRequest(enrollmentId, reason) {
  return apiFetch('/add-drop/drop', { method: 'POST', body: JSON.stringify({ enrollmentId, reason }) });
}

export async function cancelAddDropRequest(requestId) {
  return apiFetch(`/add-drop/${requestId}`, { method: 'DELETE' });
}

// Add/Drop - Admin
export async function getAdminAddDropRequests(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== '') params.append('status', filters.status);
  if (filters.type && filters.type !== '') params.append('type', filters.type);
  if (filters.semesterId && filters.semesterId !== '') params.append('semesterId', filters.semesterId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/admin/add-drop-requests${query}`);
}

export async function approveAddDropRequest(requestId, adminNotes) {
  return apiFetch(`/admin/add-drop-requests/${requestId}/approve`, { method: 'POST', body: JSON.stringify({ adminNotes }) });
}

export async function rejectAddDropRequest(requestId, adminNotes) {
  return apiFetch(`/admin/add-drop-requests/${requestId}/reject`, { method: 'POST', body: JSON.stringify({ adminNotes }) });
}

export async function getSemestersAddDrop() {
  return apiFetch('/admin/semesters/add-drop');
}

export async function updateSemesterAddDrop(semesterId, addDropStart, addDropEnd) {
  return apiFetch(`/admin/semesters/${semesterId}/add-drop`, { method: 'PATCH', body: JSON.stringify({ addDropStart, addDropEnd }) });
}

// Analytics
export async function getAdminAnalytics() {
  return apiFetch('/analytics/admin');
}

export async function getTeacherAnalytics() {
  return apiFetch('/analytics/teacher');
}

export async function getStudentAnalytics() {
  return apiFetch('/analytics/student');
}

// ==================== PAYMENT (Chapa) ====================

export async function initializePayment(semesterId) {
  return apiFetch('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify({ semesterId }),
  });
}

export async function verifyPayment(txRef) {
  return apiFetch(`/payments/verify/${txRef}`);
}

export async function getMyPayments() {
  return apiFetch('/payments/my');
}

export async function getPaymentStatus(semesterId) {
  return apiFetch(`/payments/semester/${semesterId}/status`);
}

export async function getSemesterPayments(semesterId) {
  return apiFetch(`/admin/payments/semester/${semesterId}`);
}

export async function setRegistrationFee(semesterId, registrationFee) {
  return apiFetch(`/admin/semesters/${semesterId}/fee`, {
    method: 'PATCH',
    body: JSON.stringify({ registrationFee }),
  });
}

// ==================== DEPARTMENTS ====================

export async function getDepartments() {
  return apiFetch('/departments');
}

export async function getDepartment(id) {
  return apiFetch(`/departments/${id}`);
}

export async function createDepartment(data) {
  return apiFetch('/admin/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDepartment(id, data) {
  return apiFetch(`/admin/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDepartment(id) {
  return apiFetch(`/admin/departments/${id}`, { method: 'DELETE' });
}

// ==================== CERTIFICATES ====================

export async function getStudentGraduationStatus() {
  return apiFetch('/student/graduation-status');
}

export async function getStudentCertificates() {
  return apiFetch('/student/certificates');
}

export async function generateCertificate(studentId) {
  return apiFetch('/admin/certificates/generate', {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
}

export async function getAdminCertificates() {
  return apiFetch('/admin/certificates');
}

export async function getStudentRegistrationFee() {
  return apiFetch('/student/registration-fee');
}
