import { useState, useEffect } from 'react';
import { getPendingFaceVerifications, getFaceVerifications, reviewFaceVerification } from '../api';
import Layout from '../components/Layout';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  FileText,
  Clock,
  Filter,
  Eye,
  Check,
  X,
  Camera,
} from 'lucide-react';

export default function AdminFaceVerificationPage() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadVerifications();
  }, [filter]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const data = await getFaceVerifications(filter === 'all' ? '' : filter);
      setVerifications(data);
    } catch (err) {
      console.error('Failed to load verifications:', err);
    }
    setLoading(false);
  };

  const handleReview = async (id, approved) => {
    setProcessing(true);
    try {
      await reviewFaceVerification(id, approved);
      await loadVerifications();
      setSelectedVerification(null);
    } catch (err) {
      alert('Failed to review: ' + err.message);
    }
    setProcessing(false);
  };

  const getStatusBadge = (v) => {
    if (v.matchResult) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle className="w-3 h-3" />
          Matched
        </span>
      );
    }
    if (!v.adminReviewed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    return v.adminApproved ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
        <CheckCircle className="w-3 h-3" />
        Approved
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
        <XCircle className="w-3 h-3" />
        Rejected
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Face Verification Review</h1>
            <p className="text-gray-500">Review and approve face mismatches during exams</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="all">All</option>
              <option value="matched">Matched</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : verifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Verifications Found
            </h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'No face verifications recorded yet' : 'Try changing the filter'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {verifications.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Student Info */}
                    <div className="flex items-center gap-3">
                      {v.student.profileImage ? (
                        <img
                          src={v.student.profileImage}
                          alt={v.student.fullName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{v.student.fullName}</p>
                        <p className="text-sm text-gray-500">{v.student.email}</p>
                      </div>
                    </div>

                    {/* Exam Info */}
                    <div className="border-l border-gray-200 pl-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>{v.attempt.assessment.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {v.attempt.assessment.course.title} - {v.attempt.assessment.examType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(v)}
                    {!v.adminReviewed && (
                      <button
                        onClick={() => setSelectedVerification(v)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        Review
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Captured: {new Date(v.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        {selectedVerification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Review Face Verification</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Compare the profile image with the captured exam image
                </p>
              </div>

              <div className="p-6">
                {/* Student Info */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <User className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedVerification.student.fullName}</p>
                    <p className="text-sm text-gray-500">{selectedVerification.student.email}</p>
                  </div>
                  <div className="ml-auto text-sm text-gray-600">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {selectedVerification.attempt.assessment.title}
                  </div>
                </div>

                {/* Image Comparison */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Profile Image */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Profile Image (Stored)
                    </h3>
                    {selectedVerification.student.profileImage ? (
                      <img
                        src={selectedVerification.student.profileImage}
                        alt="Profile"
                        className="w-full h-80 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">No profile image</p>
                      </div>
                    )}
                  </div>

                  {/* Captured Image */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Captured During Exam
                    </h3>
                    <img
                      src={selectedVerification.capturedImage}
                      alt="Captured"
                      className="w-full h-80 object-cover rounded-lg border-2 border-yellow-400"
                    />
                  </div>
                </div>

                {/* Warning */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Face Mismatch Detected</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The system detected that the face captured during the exam does not match
                      the stored profile image. Please verify if this is the same student.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => setSelectedVerification(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview(selectedVerification.id, false)}
                    disabled={processing}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium rounded-lg"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(selectedVerification.id, true)}
                    disabled={processing}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium rounded-lg"
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
