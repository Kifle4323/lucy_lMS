import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursePage from './pages/CoursePage';
import AdminClassesPage from './pages/AdminClassesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCoursesPage from './pages/AdminCoursesPage';
import AdminAcademicPage from './pages/AdminAcademicPage';
import MyClassesPage from './pages/MyClassesPage';
import LiveSessionsPage from './pages/LiveSessionsPage';
import LiveMeetingPage from './pages/LiveMeetingPage';
import GradebookPage from './pages/GradebookPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import AdminFaceVerificationPage from './pages/AdminFaceVerificationPage';
import SettingsPage from './pages/SettingsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import AdminStudentProfilesPage from './pages/AdminStudentProfilesPage';
import TeacherGradesPage from './pages/TeacherGradesPage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentExamsPage from './pages/StudentExamsPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  // Redirect students to complete profile if not complete
  if (user.role === 'STUDENT' && !user.isProfileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" />;
  }
  
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/my-classes"
        element={
          <PrivateRoute>
            <MyClassesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/live-sessions"
        element={
          <PrivateRoute>
            <LiveSessionsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/live-sessions/:sessionId"
        element={
          <PrivateRoute>
            <LiveMeetingPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/classes"
        element={
          <PrivateRoute>
            <AdminClassesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <AdminUsersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <PrivateRoute>
            <AdminCoursesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <PrivateRoute>
            <CoursePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/:courseId/gradebook"
        element={
          <PrivateRoute>
            <GradebookPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/complete-profile"
        element={
          <PrivateRoute>
            <CompleteProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/face-verifications"
        element={
          <PrivateRoute>
            <AdminFaceVerificationPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/student-profile"
        element={
          <PrivateRoute>
            <StudentProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/student-profiles"
        element={
          <PrivateRoute>
            <AdminStudentProfilesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/academic"
        element={
          <PrivateRoute>
            <AdminAcademicPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/grades"
        element={
          <PrivateRoute>
            <TeacherGradesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <PrivateRoute>
            <StudentResultsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/exams"
        element={
          <PrivateRoute>
            <StudentExamsPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
