import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { getMyQuestionReports, deleteMyQuestionReport } from '../api';
import Layout from '../components/Layout';
import { FileQuestion, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';

export default function StudentMyReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'STUDENT') return;
    loadReports();
  }, [user]);

  async function loadReports() {
    try {
      const data = await getMyQuestionReports();
      setReports(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reportId) {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteMyQuestionReport(reportId);
      setReports(reports.filter(r => r.id !== reportId));
      toast.success('Report deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function getStatusBadge(status) {
    const styles = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      RESOLVED_CORRECT: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      RESOLVED_INCORRECT: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
      DISMISSED: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
    };
    const labels = {
      PENDING: 'Pending',
      UNDER_REVIEW: 'Under Review',
      RESOLVED_CORRECT: 'Accepted',
      RESOLVED_INCORRECT: 'Rejected',
      DISMISSED: 'Dismissed',
    };
    const style = styles[status];
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {labels[status]}
      </span>
    );
  }

  if (user?.role !== 'STUDENT') return <div className="p-8 text-center">Access denied</div>;
  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Question Reports</h1>
          <p className="text-gray-500 mt-1">Track the status of your question reports</p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No reports yet</h3>
            <p className="text-gray-500 mt-1">You haven't reported any questions. If you find a mistaken question during an assessment, you can report it.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{report.question?.assessment?.title}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{report.question?.assessment?.course?.title}</p>
                    
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700 line-clamp-2">{report.question?.prompt}</p>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Your reason:</p>
                      <p className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">{report.reason}</p>
                    </div>

                    {report.adminNotes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Admin response:</p>
                        <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">{report.adminNotes}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Reported on {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {report.status === 'PENDING' && (
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete report"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
