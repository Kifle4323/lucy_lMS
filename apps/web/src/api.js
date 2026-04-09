// Use current hostname for network access, fallback to localhost
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000/api' 
  : `http://${window.location.hostname}:4000/api`;

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
    throw new Error(body.error || `HTTP ${res.status}`);
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

export async function toggleAssessmentOpen(assessmentId, isOpen) {
  return apiFetch(`/assessments/${assessmentId}/open`, { method: 'PATCH', body: JSON.stringify({ isOpen }) });
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
export async function getGradeConfig(courseId) {
  return apiFetch(`/courses/${courseId}/grade-config`);
}

export async function updateGradeConfig(courseId, weights) {
  return apiFetch(`/courses/${courseId}/grade-config`, { method: 'PATCH', body: JSON.stringify(weights) });
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
