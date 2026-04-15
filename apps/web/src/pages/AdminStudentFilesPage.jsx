import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { getAllStudentProfiles } from '../api';
import Layout from '../components/Layout';
import { 
  FileText, Search, Eye, Download, X, User, Filter, Grid, List
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'Elementary Completion Certificate',
  'High School Transcripts',
  'National Examination Certificates',
  'Equivalence Certificate (Secondary Education Abroad)',
  'Other Documents',
];

export default function AdminStudentFilesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [previewDocument, setPreviewDocument] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await getAllStudentProfiles(''); // Get all profiles
      setProfiles(data);
    } catch (err) {
      toast.error('Failed to load student files');
    } finally {
      setLoading(false);
    }
  };

  // Flatten all documents from all profiles
  const allDocuments = profiles.flatMap(profile => 
    (profile.documents || []).map(doc => ({
      ...doc,
      studentId: profile.user?.id,
      studentName: profile.user?.fullName || `${profile.firstName} ${profile.fatherName}`,
      studentEmail: profile.user?.email,
      profileStatus: profile.status,
      profileId: profile.id,
    }))
  );

  // Filter documents
  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = 
      doc.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      doc.studentEmail?.toLowerCase().includes(search.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(search.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesDocType = !documentTypeFilter || doc.documentType === documentTypeFilter;
    const matchesStatus = !statusFilter || doc.profileStatus === statusFilter;
    
    return matchesSearch && matchesDocType && matchesStatus;
  });

  // Group documents by student
  const documentsByStudent = profiles.reduce((acc, profile) => {
    if (profile.documents?.length > 0) {
      acc.push({
        studentId: profile.user?.id,
        studentName: profile.user?.fullName || `${profile.firstName} ${profile.fatherName}`,
        studentEmail: profile.user?.email,
        profileStatus: profile.status,
        profileImage: profile.user?.profileImage,
        documents: profile.documents,
      });
    }
    return acc;
  }, []);

  if (user?.role !== 'ADMIN') {
    return <Layout><div className="p-8 text-center">Access denied</div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Browse and manage all submitted student documents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{allDocuments.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Students with Docs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{documentsByStudent.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Profiles</p>
            <p className="text-2xl font-bold text-yellow-600">{profiles.filter(p => p.status === 'PENDING_APPROVAL').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Approved Profiles</p>
            <p className="text-2xl font-bold text-green-600">{profiles.filter(p => p.status === 'APPROVED').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, email, or document..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={documentTypeFilter}
              onChange={(e) => setDocumentTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Document Types</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Profile Status</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            No documents found
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Document Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">File Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Profile Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Uploaded</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {doc.profileImage ? (
                          <img src={doc.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{doc.studentName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{doc.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{doc.documentType}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{doc.fileName || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.profileStatus === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                        doc.profileStatus === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                        doc.profileStatus === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                      }`}>
                        {doc.profileStatus?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewDocument(doc)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-primary-600 dark:text-primary-400"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName || 'document'}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Preview */}
                <div 
                  className="h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center cursor-pointer"
                  onClick={() => setPreviewDocument(doc)}
                >
                  {doc.fileUrl?.startsWith('data:image') ? (
                    <img src={doc.fileUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{doc.documentType}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{doc.fileName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {doc.profileImage ? (
                      <img src={doc.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{doc.studentName}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.profileStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      doc.profileStatus === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {doc.profileStatus?.replace('_', ' ')}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewDocument(doc)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-primary-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName || 'document'}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-600"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document Preview Modal */}
        {previewDocument && (
          <div className="fixed inset-0 bg-black/75 z-[60] flex flex-col">
            <div className="bg-white dark:bg-gray-800 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{previewDocument.documentType}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {previewDocument.fileName} - {previewDocument.studentName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDocument.fileUrl}
                  download={previewDocument.fileName || 'document'}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {previewDocument.fileUrl?.startsWith('data:image') ? (
                <img
                  src={previewDocument.fileUrl}
                  alt={previewDocument.documentType}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : previewDocument.fileUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDocument.fileUrl}
                  className="w-full h-full rounded-lg bg-white"
                  title="Document Preview"
                />
              ) : (
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Preview not available for this file type</p>
                  <a
                    href={previewDocument.fileUrl}
                    download={previewDocument.fileName || 'document'}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
