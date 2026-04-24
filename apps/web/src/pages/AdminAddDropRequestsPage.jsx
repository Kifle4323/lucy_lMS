import { useState, useEffect } from 'react';
import { getAdminAddDropRequests, approveAddDropRequest, rejectAddDropRequest, getSemestersAddDrop, updateSemesterAddDrop } from '../api';
import Layout from '../components/Layout';
import { Plus, Minus, Clock, CheckCircle, XCircle, Filter, Calendar, Settings, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminAddDropRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({ status: 'PENDING', type: '', semesterId: '' });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [addDropStart, setAddDropStart] = useState('');
  const [addDropEnd, setAddDropEnd] = useState('');
  const [showActionModal, setShowActionModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    try {
      const [requestsData, semestersData] = await Promise.all([
        getAdminAddDropRequests(filters),
        getSemestersAddDrop()
      ]);
      setRequests(requestsData);
      setSemesters(semestersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId) {
    setSubmitting(true);
    setError('');
    try {
      await approveAddDropRequest(requestId, adminNotes);
      setSuccess(t('admin.requestApproved'));
      setShowActionModal(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(requestId) {
    setSubmitting(true);
    setError('');
    try {
      await rejectAddDropRequest(requestId, adminNotes);
      setSuccess(t('admin.requestRejected'));
      setShowActionModal(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateAddDropPeriod() {
    if (!selectedSemester) return;
    
    setSubmitting(true);
    setError('');
    try {
      await updateSemesterAddDrop(selectedSemester.id, addDropStart || null, addDropEnd || null);
      setSuccess(t('admin.addDropPeriodUpdated'));
      setShowSettingsModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openSettingsModal(semester) {
    setSelectedSemester(semester);
    setAddDropStart(semester.addDropStart ? new Date(semester.addDropStart).toISOString().slice(0, 16) : '');
    setAddDropEnd(semester.addDropEnd ? new Date(semester.addDropEnd).toISOString().slice(0, 16) : '');
    setShowSettingsModal(true);
  }

  if (loading) return <Layout><div className="p-8 text-center">{t('common.loading')}</div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.addDropRequests')}</h1>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
          >
            <Settings className="w-4 h-4" />
            {t('settings.settings')}
          </button>
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

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.allStatus')}</option>
              <option value="PENDING">{t('reports.pending')}</option>
              <option value="APPROVED">{t('studentProfile.approved')}</option>
              <option value="REJECTED">{t('reports.rejected')}</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.allTypes')}</option>
              <option value="ADD">{t('addDrop.add')}</option>
              <option value="DROP">{t('addDrop.drop')}</option>
            </select>
            <select
              value={filters.semesterId}
              onChange={(e) => setFilters({ ...filters, semesterId: e.target.value })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.allSemesters')}</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          {requests.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {requests.map(request => (
                <div key={request.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        request.type === 'ADD' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {request.type === 'ADD' ? (
                          <Plus className="w-5 h-5 text-green-600" />
                        ) : (
                          <Minus className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {request.type === 'ADD' ? t('addDrop.add') : t('addDrop.drop')}: {request.course?.title} ({request.course?.code})
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {t('gradebook.student')}: {request.student?.fullName} ({request.student?.studentId || request.student?.email})
                        </div>
                        {request.courseSection && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('admin.section')}: {request.courseSection.sectionCode} | {t('admin.teacher')}: {request.courseSection.teacher?.fullName}
                            {request.courseSection.class && ` | ${t('admin.class')}: ${request.courseSection.class.name}`}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('admin.semester')}: {request.semester?.name}
                        </div>
                        {request.reason && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            {t('questionReports.reason')}: {request.reason}
                          </div>
                        )}
                        {request.adminNotes && (
                          <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                            {t('questionReports.adminNotes')}: {request.adminNotes}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {t('admin.submitted')}: {new Date(request.createdAt).toLocaleString()}
                        </div>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowActionModal({ id: request.id, action: 'approve' });
                              setAdminNotes('');
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            {t('faceVerification.approve')}
                          </button>
                          <button
                            onClick={() => {
                              setShowActionModal({ id: request.id, action: 'reject' });
                              setAdminNotes('');
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                          >
                            {t('reports.rejected')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('admin.noRequestsFound')}</p>
          )}
        </div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('admin.addDropPeriodSettings')}</h3>
              
              <div className="space-y-4">
                {semesters.map(semester => (
                  <div key={semester.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{semester.name}</span>
                        {semester.isCurrent && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{t('admin.current')}</span>
                        )}
                        <span className="ml-2 text-sm text-gray-500">
                          {semester._count?.addDropRequests || 0} {t('admin.requests')}
                        </span>
                      </div>
                      <button
                        onClick={() => openSettingsModal(semester)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm"
                      >
                        {t('admin.configure')}
                      </button>
                    </div>
                    {semester.addDropStart && semester.addDropEnd && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(semester.addDropStart).toLocaleDateString()} - {new Date(semester.addDropEnd).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Configure Semester Modal */}
        {selectedSemester && showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('admin.configureAddDropFor')} {selectedSemester.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.startDateTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={addDropStart}
                    onChange={(e) => setAddDropStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.endDateTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={addDropEnd}
                    onChange={(e) => setAddDropEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateAddDropPeriod}
                  disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? t('admin.saving') : t('gradebook.saveChanges')}
                </button>
                <button
                  onClick={() => setSelectedSemester(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Modal */}
        {showActionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {showActionModal.action === 'approve' ? t('faceVerification.approve') : t('reports.rejected')} {t('admin.request')}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('questionReports.adminNotes')} ({t('common.optional')})
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder={t('admin.addNotesPlaceholder')}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => showActionModal.action === 'approve' 
                    ? handleApprove(showActionModal.id) 
                    : handleReject(showActionModal.id)
                  }
                  disabled={submitting}
                  className={`flex-1 py-2 text-white rounded-lg disabled:opacity-50 ${
                    showActionModal.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? t('admin.processing') : showActionModal.action === 'approve' ? t('faceVerification.approve') : t('reports.rejected')}
                </button>
                <button
                  onClick={() => {
                    setShowActionModal(null);
                    setAdminNotes('');
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
