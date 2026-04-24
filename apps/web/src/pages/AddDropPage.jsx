import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAddDropEligibility, submitAddRequest, submitDropRequest, cancelAddDropRequest } from '../api';
import Layout from '../components/Layout';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';
import { Plus, Minus, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AddDropPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await getAddDropEligibility();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRequest() {
    if (!selectedCourse) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await submitAddRequest(selectedCourse.id, reason);
      setSuccess(t('addDrop.addRequestSubmitted'));
      setShowAddModal(false);
      setSelectedCourse(null);
      setReason('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDropRequest() {
    if (!selectedCourse) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await submitDropRequest(selectedCourse.id, reason);
      setSuccess(t('addDrop.dropRequestSubmitted'));
      setShowDropModal(false);
      setSelectedCourse(null);
      setReason('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest(requestId) {
    const confirmed = await confirm({
      title: t('addDrop.cancelRequest'),
      message: t('addDrop.cancelRequestConfirm'),
      confirmText: t('addDrop.cancelRequest'),
      cancelText: t('addDrop.keep'),
      type: 'warning',
    });
    if (!confirmed) return;
    
    try {
      await cancelAddDropRequest(requestId);
      toast.success(t('addDrop.requestCancelled'));
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Layout><div className="p-8 text-center">{t('common.loading')}</div></Layout>;

  const { canAddDrop, semester, addDropStart, addDropEnd, currentEnrollments, addableCourses, existingRequests } = data || {};

  // Not in add/drop period
  if (!canAddDrop) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6">{t('nav.addDropCourses')}</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">{t('addDrop.periodNotActive')}</h2>
                {addDropStart && addDropEnd ? (
                  <p className="text-yellow-700">
                    {t('addDrop.periodFrom')} <strong>{new Date(addDropStart).toLocaleDateString()}</strong> {t('addDrop.periodTo')} <strong>{new Date(addDropEnd).toLocaleDateString()}</strong>.
                  </p>
                ) : (
                  <p className="text-yellow-700">
                    {t('addDrop.noPeriodSet')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.addDropCourses')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{semester?.name}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4" />
            {t('addDrop.periodActive')}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Existing Requests */}
        {existingRequests && existingRequests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('addDrop.yourRequests')}</h2>
            <div className="space-y-3">
              {existingRequests.map(request => (
                <div key={request.id} className={`border rounded-lg p-4 ${
                  request.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' :
                  request.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {request.type === 'ADD' ? (
                        <Plus className="w-5 h-5 text-green-600" />
                      ) : (
                        <Minus className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.type === 'ADD' ? t('addDrop.add') : t('addDrop.drop')}: {request.course?.title} ({request.course?.code})
                        </div>
                        {request.courseSection && (
                          <div className="text-sm text-gray-500">
                            {t('semesterReg.section')}: {request.courseSection.sectionCode} - {request.courseSection.teacher?.fullName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status === 'PENDING' && <Clock className="w-3 h-3 inline mr-1" />}
                        {request.status === 'APPROVED' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {request.status === 'REJECTED' && <XCircle className="w-3 h-3 inline mr-1" />}
                        {request.status}
                      </span>
                      {request.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="text-red-600 hover:bg-red-100 p-2 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {request.reason && (
                    <div className="mt-2 text-sm text-gray-600">{t('addDrop.reason')}: {request.reason}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Enrollments - Drop Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('addDrop.currentCourses')}</h2>
            <span className="text-sm text-gray-500">{currentEnrollments?.length || 0} {t('addDrop.courses')}</span>
          </div>
          
          {currentEnrollments && currentEnrollments.length > 0 ? (
            <div className="space-y-3">
              {currentEnrollments.map(enrollment => (
                <div key={enrollment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {enrollment.courseSection?.course?.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {enrollment.courseSection?.course?.code} | {t('semesterReg.section')}: {enrollment.courseSection?.sectionCode}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('course.teacher')}: {enrollment.courseSection?.teacher?.fullName}
                    </div>
                    {enrollment.grade?.gradeLetter && (
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-sm ${
                        enrollment.grade.gradeLetter === 'F' ? 'bg-red-100 text-red-700' :
                        enrollment.grade.gradeLetter.startsWith('A') ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {t('grade.grade')}: {enrollment.grade.gradeLetter}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourse(enrollment);
                      setShowDropModal(true);
                      setReason('');
                    }}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center gap-2"
                  >
                    <Minus className="w-4 h-4" />
                    {t('addDrop.drop')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">{t('addDrop.noCurrentEnrollments')}</p>
          )}
        </div>

        {/* Addable Courses - Add Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('addDrop.coursesYouCanAdd')}</h2>
            <span className="text-sm text-gray-500">{t('addDrop.coursesWithFGrade')}</span>
          </div>
          
          {addableCourses && addableCourses.length > 0 ? (
            <div className="space-y-3">
              {addableCourses.map(section => (
                <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {section.course?.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {section.course?.code} | {t('semesterReg.section')}: {section.sectionCode}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('course.teacher')}: {section.teacher?.fullName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {section.class?.name} | {t('nav.students')}: {section._count?.enrollments || 0}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourse(section);
                      setShowAddModal(true);
                      setReason('');
                    }}
                    className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('addDrop.add')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">{t('addDrop.noCoursesToAdd')}</p>
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('addDrop.addCourseRequest')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('addDrop.requestToAdd')} <strong>{selectedCourse.course?.title}</strong> ({selectedCourse.course?.code})
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('addDrop.reasonOptional')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder={t('addDrop.whyAddCourse')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddRequest}
                  disabled={submitting}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? t('addDrop.submitting') : t('addDrop.submitRequest')}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedCourse(null);
                    setReason('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drop Modal */}
        {showDropModal && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('addDrop.dropCourseRequest')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('addDrop.requestToDrop')} <strong>{selectedCourse.courseSection?.course?.title}</strong> ({selectedCourse.courseSection?.course?.code})
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('addDrop.reasonOptional')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder={t('addDrop.whyDropCourse')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDropRequest}
                  disabled={submitting}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? t('addDrop.submitting') : t('addDrop.submitRequest')}
                </button>
                <button
                  onClick={() => {
                    setShowDropModal(false);
                    setSelectedCourse(null);
                    setReason('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
