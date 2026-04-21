import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAvailableCourses, registerForSemester, getStudentProfile, initializePayment, verifyPayment, getPaymentStatus } from '../api.js';
import Layout from '../components/Layout';
import { AlertCircle, FileText, CreditCard, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';

export default function StudentRegistrationPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // { isPaid, status, payment }
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Handle payment return redirect
  useEffect(() => {
    const txRef = searchParams.get('txRef');
    if (txRef) {
      handlePaymentReturn(txRef);
    }
  }, [searchParams]);

  async function loadData() {
    try {
      const [result, profile] = await Promise.all([
        getAvailableCourses(),
        getStudentProfile().catch(() => null)
      ]);
      setData(result);
      setProfileStatus(profile?.status || null);

      // Check payment status if semester has a fee
      if (result?.semester?.registrationFee > 0) {
        try {
          const payment = await getPaymentStatus(result.semester.id);
          setPaymentStatus(payment);
        } catch (err) {
          console.error('Failed to check payment status:', err);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentReturn(txRef) {
    setVerifyingPayment(true);
    try {
      // Retry verification up to 3 times with delay (Chapa may take a moment)
      let result = null;
      for (let i = 0; i < 3; i++) {
        try {
          result = await verifyPayment(txRef);
          if (result.payment?.status === 'COMPLETED') break;
          if (i < 2) await new Promise(r => setTimeout(r, 2000)); // wait 2s between retries
        } catch (err) {
          if (i < 2) await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (result?.payment?.status === 'COMPLETED') {
        toast.success('Payment completed successfully!');
        setPaymentStatus({ isPaid: true, status: 'COMPLETED', payment: result.payment });
      } else if (result?.payment?.status === 'FAILED') {
        toast.error('Payment failed. Please try again.');
        setPaymentStatus({ isPaid: false, status: 'FAILED', payment: result.payment });
      } else {
        toast.info('Payment is still being processed. Click "Verify Payment" to check again.');
        setPaymentStatus({ isPaid: false, status: 'PENDING', payment: result?.payment || null });
      }
      // Reload data
      await loadData();
    } catch (err) {
      toast.error('Failed to verify payment: ' + (err.message || 'Unknown error'));
    } finally {
      setVerifyingPayment(false);
    }
  }

  async function handlePayNow() {
    if (!data?.semester) return;
    setPaymentLoading(true);
    try {
      const result = await initializePayment(data.semester.id);
      if (result.checkoutUrl) {
        // Redirect to Chapa checkout
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      toast.error('Failed to initialize payment: ' + err.message);
    } finally {
      setPaymentLoading(false);
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
      loadData();
    } catch (err) {
      if (err.message?.includes('Payment required') || err.requiresPayment) {
        toast.error('Payment is required before registration');
        setPaymentStatus({ isPaid: false, status: 'NONE', payment: null });
      } else {
        toast.error(err.message);
      }
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

        {/* Registration Fee & Payment Status */}
        {semester.registrationFee > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Registration Fee</p>
                <p className="text-2xl font-bold text-gray-900">ETB {semester.registrationFee?.toLocaleString()}</p>
              </div>
              <div>
                {paymentStatus?.isPaid ? (
                  <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                    <CheckCircle className="w-5 h-5" />
                    Paid
                  </span>
                ) : paymentStatus?.status === 'PENDING' ? (
                  <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium">
                    <Clock className="w-5 h-5" />
                    Payment Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
                    <CreditCard className="w-5 h-5" />
                    Unpaid
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
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

      {/* Payment & Registration Steps */}
      {!allEnrolled && courses.length > 0 && (
        <div className="space-y-4">
          {/* Step 1: Payment (if fee is set) */}
          {semester.registrationFee > 0 && !paymentStatus?.isPaid && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <CreditCard className="w-8 h-8 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-800 mb-1">Step 1: Pay Registration Fee</h3>
                  <p className="text-orange-700 text-sm mb-3">
                    You must pay the registration fee of <strong>ETB {semester.registrationFee?.toLocaleString()}</strong> before you can register for courses.
                  </p>
                  {verifyingPayment ? (
                    <div className="flex items-center gap-2 text-orange-600">
                      <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                      Verifying payment...
                    </div>
                  ) : paymentStatus?.status === 'PENDING' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
                        You have a pending payment. If you already completed payment, click verify below.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => paymentStatus?.payment?.checkoutUrl && (window.location.href = paymentStatus.payment.checkoutUrl)}
                          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Resume Payment
                        </button>
                        <button
                          onClick={() => handlePaymentReturn(paymentStatus?.payment?.txRef)}
                          disabled={verifyingPayment}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm"
                        >
                          Verify Payment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handlePayNow}
                      disabled={paymentLoading}
                      className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-400"
                    >
                      {paymentLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pay ETB {semester.registrationFee?.toLocaleString()} with Chapa
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Register (only if paid or no fee) */}
          {(!semester.registrationFee || semester.registrationFee <= 0 || paymentStatus?.isPaid) && (
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

          {/* Payment completed message */}
          {semester.registrationFee > 0 && paymentStatus?.isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-green-700 font-medium">Payment confirmed! You can now register for courses.</p>
                {paymentStatus?.payment?.paidAt && (
                  <p className="text-green-600 text-sm">Paid on {new Date(paymentStatus.payment.paidAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}
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
