import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableCourses, registerForSemester, getStudentProfile } from '../api.js';
import Layout from '../components/Layout';
import { AlertCircle, FileText } from 'lucide-react';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';

export default function StudentRegistrationPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [result, profile] = await Promise.all([
        getAvailableCourses(),
        getStudentProfile().catch(() => null)
      ]);
      setData(result);
      setProfileStatus(profile?.status || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    const confirmed = await confirm({
      title: 'Register for Courses',
      message: 'Register for all courses assigned to your class?',
      confirmText: 'Register',
      cancelText: 'Cancel',
      type: 'info',
    });
    if (!confirmed) return;
    
    setRegistering(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await registerForSemester();
      toast.success(result.message);
      loadAvailableCourses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegistering(false);
    }
  }

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

  const { semester, class: studentClass, courses, message } = data || {};

  // Profile not submitted - must complete profile first
  if (!profileStatus || profileStatus === 'DRAFT') {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Semester Registration</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">Complete Your Profile First</h2>
                <p className="text-yellow-700 mb-4">
                  You must complete and submit your profile information before you can register for a semester.
                </p>
                <Link
                  to="/student-profile"
                  className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Profile pending approval
  if (profileStatus === 'PENDING_APPROVAL') {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Semester Registration</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-blue-800 mb-2">Profile Pending Approval</h2>
                <p className="text-blue-700">
                  Your profile has been submitted and is waiting for admin approval. You will be able to register for semesters once your profile is approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Profile rejected
  if (profileStatus === 'REJECTED') {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Semester Registration</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-red-800 mb-2">Profile Rejected</h2>
                <p className="text-red-700 mb-4">
                  Your profile was rejected. Please review and update your information.
                </p>
                <Link
                  to="/student-profile"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Update Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // No semester open for registration
  if (!semester) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Semester Registration</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">No semester is currently open for registration.</p>
            <p className="text-sm text-yellow-600 mt-2">Please check back later or contact the registrar.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Student not assigned to a class
  if (message || !studentClass) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Semester Registration</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">{semester.name}</h2>
            <p className="text-blue-700">{message || 'You are not assigned to a class yet.'}</p>
            <p className="text-sm text-blue-600 mt-2">Please contact the registrar to be assigned to a class.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const allEnrolled = courses.every(c => c.isEnrolled);
  const someEnrolled = courses.some(c => c.isEnrolled);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Semester Registration</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      {/* Semester Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{semester.name}</h2>
            <p className="text-gray-500">{semester.academicYear?.name}</p>
          </div>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm">
            Registration Open
          </span>
        </div>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
            <div className="text-gray-500 dark:text-gray-400">Registration Period</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {semester.registrationStart && semester.registrationEnd
                ? `${new Date(semester.registrationStart).toLocaleDateString()} - ${new Date(semester.registrationEnd).toLocaleDateString()}`
                : 'Not specified'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
            <div className="text-gray-500 dark:text-gray-400">Your Class</div>
            <div className="font-medium text-gray-900 dark:text-white">{studentClass.name} ({studentClass.code})</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-3">
            <div className="text-yellow-600 dark:text-yellow-400">Midterm Exam</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {semester.midtermExamDate
                ? new Date(semester.midtermExamDate).toLocaleDateString()
                : 'Not set'}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded p-3">
            <div className="text-red-600 dark:text-red-400">Final Exam</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {semester.finalExamDate
                ? new Date(semester.finalExamDate).toLocaleDateString()
                : 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Courses Assigned to Class */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Courses Assigned to Your Class</h3>
        
        {courses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No courses assigned to your class yet.</p>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className={`border rounded p-4 ${course.isEnrolled ? 'bg-green-50 border-green-200' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{course.course?.code} - {course.course?.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Teacher: {course.teacher?.fullName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Section: {course.sectionCode}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Credit Hours: {course.course?.creditHours || 3}
                    </p>
                  </div>
                  {course.isEnrolled && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      Enrolled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <strong>Total Courses:</strong> {courses.length} | 
          <strong className="ml-2">Total Credit Hours:</strong> {courses.reduce((sum, c) => sum + (c.course?.creditHours || 3), 0)}
        </div>
      </div>

      {/* Registration Button */}
      {!allEnrolled && courses.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleRegister}
            disabled={registering}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg font-medium"
          >
            {registering ? 'Registering...' : someEnrolled ? 'Complete Registration' : 'Register for Semester'}
          </button>
        </div>
      )}

      {allEnrolled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-700 font-medium">You are registered for all courses this semester!</p>
        </div>
      )}
      </div>
    </Layout>
  );
}
