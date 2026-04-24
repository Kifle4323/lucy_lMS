import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';
import { getTeacherQuestionReports, updateQuestionReportStatus } from '../api';
import Layout from '../components/Layout';
import { AlertCircle, CheckCircle, XCircle, Clock, Eye, X, FileQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TeacherQuestionReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (user?.role !== 'TEACHER') return;
    loadReports();
  }, [user, statusFilter]);

  async function loadReports() {
    try {
      const data = await getTeacherQuestionReports(statusFilter);
      setReports(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(reportId, status, adminNotes = '') {
    const statusLabels = {
      UNDER_REVIEW: t('questionReports.markUnderReview'),
      RESOLVED_CORRECT: t('questionReports.acceptQuestionWrong'),
      RESOLVED_INCORRECT: t('questionReports.rejectQuestionCorrect'),
      DISMISSED: t('questionReports.dismissAction'),
    };

    const confirmed = await confirm({
      title: t('questionReports.updateReportStatus'),
      message: `${t('questionReports.areYouSure')} ${statusLabels[status]}?`,
      confirmText: t('questionReports.update'),
      cancelText: t('common.cancel'),
      type: status === 'RESOLVED_CORRECT' ? 'success' : status === 'DISMISSED' ? 'danger' : 'primary',
    });

    if (!confirmed) return;

    try {
      await updateQuestionReportStatus(reportId, { status, adminNotes });
      setReports(reports.map(r => r.id === reportId ? { ...r, status, adminNotes, reviewedBy: user, reviewedAt: new Date() } : r));
      setSelectedReport(null);
      toast.success(t('questionReports.reportStatusUpdated'));
    } catch (err) {
      toast.error(err.message);
    }
  }

  function getStatusBadge(status) {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      RESOLVED_CORRECT: 'bg-green-100 text-green-800',
      RESOLVED_INCORRECT: 'bg-gray-100 text-gray-800',
      DISMISSED: 'bg-red-100 text-red-800',
    };
    const labels = {
      PENDING: t('reports.pending'),
      UNDER_REVIEW: t('reports.underReview'),
      RESOLVED_CORRECT: t('reports.accepted'),
      RESOLVED_INCORRECT: t('reports.rejected'),
      DISMISSED: t('reports.dismissed'),
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  }

  if (user?.role !== 'TEACHER') return <div className="p-8 text-center">{t('common.accessDenied')}</div>;
  if (loading) return <Layout><div className="p-8 text-center">{t('common.loading')}</div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('questionReports.title')}</h1>
            <p className="text-gray-500 mt-1">{t('questionReports.subtitle')}</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">{t('questionReports.allReports')}</option>
            <option value="PENDING">{t('reports.pending')}</option>
            <option value="UNDER_REVIEW">{t('reports.underReview')}</option>
            <option value="RESOLVED_CORRECT">{t('reports.accepted')}</option>
            <option value="RESOLVED_INCORRECT">{t('reports.rejected')}</option>
            <option value="DISMISSED">{t('reports.dismissed')}</option>
          </select>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">{t('questionReports.noReportsFound')}</h3>
            <p className="text-gray-500 mt-1">{t('questionReports.noReportsMatchFilter')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gradebook.student')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('questionReports.assessment')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('questionReports.reason')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{report.student?.fullName}</p>
                        <p className="text-sm text-gray-500">{report.student?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{report.question?.assessment?.title}</p>
                        <p className="text-sm text-gray-500">{report.question?.assessment?.course?.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 max-w-xs truncate">{report.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                        {t('common.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('questionReports.reportDetails')}</h2>
                <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">{t('common.status')}</span>
                  {getStatusBadge(selectedReport.status)}
                </div>

                {/* Student Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{t('gradebook.student')}</h3>
                  <p className="text-gray-900">{selectedReport.student?.fullName} ({selectedReport.student?.email})</p>
                </div>

                {/* Assessment Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{t('questionReports.assessment')}</h3>
                  <p className="text-gray-900">{selectedReport.question?.assessment?.title}</p>
                  <p className="text-sm text-gray-500">{selectedReport.question?.assessment?.course?.title}</p>
                </div>

                {/* Question */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{t('questionReports.question')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900">{selectedReport.question?.prompt}</p>
                    {selectedReport.question?.type === 'MCQ' && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm"><span className="font-medium">A:</span> {selectedReport.question.optionA}</p>
                        <p className="text-sm"><span className="font-medium">B:</span> {selectedReport.question.optionB}</p>
                        <p className="text-sm"><span className="font-medium">C:</span> {selectedReport.question.optionC}</p>
                        <p className="text-sm"><span className="font-medium">D:</span> {selectedReport.question.optionD}</p>
                        <p className="text-sm mt-2"><span className="font-medium text-green-600">{t('questionReports.correctAnswer')}:</span> {selectedReport.question.correct}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{t('questionReports.studentsReason')}</h3>
                  <p className="text-gray-900 bg-yellow-50 rounded-lg p-4">{selectedReport.reason}</p>
                </div>

                {/* Admin Notes */}
                {selectedReport.adminNotes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">{t('questionReports.adminNotes')}</h3>
                    <p className="text-gray-900 bg-blue-50 rounded-lg p-4">{selectedReport.adminNotes}</p>
                  </div>
                )}

                {/* Reviewer */}
                {selectedReport.reviewer && (
                  <div className="text-sm text-gray-500">
                    {t('questionReports.reviewedBy')} {selectedReport.reviewer.fullName} {t('reports.on')} {new Date(selectedReport.reviewedAt).toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                {selectedReport.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'UNDER_REVIEW')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Clock className="w-4 h-4" />
                      {t('questionReports.markUnderReview')}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'RESOLVED_CORRECT')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t('questionReports.acceptQuestionWrong')}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'RESOLVED_INCORRECT')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('questionReports.rejectQuestionCorrect')}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'DISMISSED')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {t('questionReports.dismissAction')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
