import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { getStudentProfile, updateStudentProfile, uploadStudentDocument, deleteStudentDocument, updateMyProfile } from '../api';
import Layout from '../components/Layout';
import { 
  User, MapPin, FileText, GraduationCap, Upload, Trash2, Save, Send, 
  CheckCircle, AlertCircle, Clock, X, ChevronDown, ChevronUp, Camera
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'Elementary Completion Certificate',
  'High School Transcripts',
  'National Examination Certificates',
  'Equivalence Certificate (Secondary Education Abroad)',
  'Other Documents',
];

const GENDERS = ['Male', 'Female', 'Other'];
const HEALTH_STATUSES = ['Normal', 'Disabled', 'Chronic Illness'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const ECONOMICAL_STATUSES = ['Low', 'Medium', 'High'];
const AREA_TYPES = ['Pastoral', 'Non Pastoral'];
const STREAMS = ['Natural Science', 'Social Science'];
const SPONSOR_CATEGORIES = ['Govt', 'Private', 'NGO', 'Self'];

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const profileImageInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('personal');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [profile, setProfile] = useState({
    status: 'DRAFT',
    // Basic Information
    firstName: '',
    fatherName: '',
    grandFatherName: '',
    firstNameLocal: '',
    fatherNameLocal: '',
    grandFatherNameLocal: '',
    dateOfBirthGC: '',
    gender: '',
    placeOfBirth: '',
    motherTongue: '',
    healthStatus: '',
    maritalStatus: '',
    nationalIdFan: '',
    // Location and Address
    citizenship: '',
    country: '',
    city: '',
    subCity: '',
    kebele: '',
    woreda: '',
    houseNumber: '',
    phone: '',
    email: '',
    pobox: '',
    // Others
    economicalStatus: '',
    areaType: '',
    tinNumber: '',
    accountNumber: '',
    // Educational - Campus Related
    stream: '',
    entryYear: '',
    sponsorCategory: '',
    sponsoredBy: '',
    nationalExamYearEC: '',
    examinationId: '',
    admissionDate: '',
    checkedInDate: '',
    nationalExamResultTotal: '',
    // National Exam Results
    examEnglish: '',
    examPhysics: '',
    examCivics: '',
    examNaturalMath: '',
    examChemistry: '',
    examBiology: '',
    examAptitude: '',
    // Documents
    documents: [],
  });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const data = await getStudentProfile();
      setProfile({
        ...profile,
        ...data,
        dateOfBirthGC: data.dateOfBirthGC ? data.dateOfBirthGC.split('T')[0] : '',
        admissionDate: data.admissionDate ? data.admissionDate.split('T')[0] : '',
        checkedInDate: data.checkedInDate ? data.checkedInDate.split('T')[0] : '',
        documents: data.documents || [],
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setProfileImage(base64);
      try {
        await updateMyProfile({ profileImage: base64 });
        await refreshUser();
        setSuccess('Profile picture updated!');
      } catch (err) {
        setError('Failed to update profile picture');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (submitForApproval = false) => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const data = {
        ...profile,
        submitForApproval,
      };
      const updated = await updateStudentProfile(data);
      setProfile(prev => ({
        ...prev,
        ...updated,
        dateOfBirthGC: updated.dateOfBirthGC ? updated.dateOfBirthGC.split('T')[0] : '',
        admissionDate: updated.admissionDate ? updated.admissionDate.split('T')[0] : '',
        checkedInDate: updated.checkedInDate ? updated.checkedInDate.split('T')[0] : '',
        documents: updated.documents || [],
      }));
      setSuccess(submitForApproval ? 'Profile submitted for approval!' : 'Profile saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(documentType);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        const doc = await uploadStudentDocument(documentType, file.name, base64);
        setProfile(prev => {
          const existingIndex = prev.documents.findIndex(d => d.documentType === documentType);
          if (existingIndex >= 0) {
            const newDocs = [...prev.documents];
            newDocs[existingIndex] = doc;
            return { ...prev, documents: newDocs };
          }
          return { ...prev, documents: [...prev.documents, doc] };
        });
        setSuccess('Document uploaded successfully!');
        setUploadingDoc(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload document');
      setUploadingDoc(null);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await deleteStudentDocument(documentId);
      setProfile(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d.id !== documentId),
      }));
      setSuccess('Document removed successfully!');
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const getDocumentStatus = (docType) => {
    const doc = profile.documents.find(d => d.documentType === docType);
    return doc;
  };

  const getStatusBadge = () => {
    switch (profile.status) {
      case 'DRAFT':
        return <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">Draft</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium flex items-center gap-1"><Clock className="w-4 h-4" /> Pending Approval</span>;
      case 'APPROVED':
        return <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full text-sm font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Approved</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Complete your profile information</p>
          </div>
          {getStatusBadge()}
        </div>

        {profile.status === 'REJECTED' && profile.rejectionReason && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-medium">Rejection Reason:</p>
            <p className="text-red-600 dark:text-red-300">{profile.rejectionReason}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'personal', label: 'Personal', icon: User },
            { id: 'location', label: 'Location & Address', icon: MapPin },
            { id: 'educational', label: 'Educational', icon: GraduationCap },
            { id: 'documents', label: 'Documents', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSection === tab.id
                  ? 'bg-primary-900 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Sections */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Personal - Basic Information */}
          {activeSection === 'personal' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h2>

              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary-900 dark:border-primary-700"
                  />
                ) : (
                  <div className="w-24 h-24 bg-primary-900 dark:bg-primary-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {profile.firstName?.charAt(0)?.toUpperCase() || user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Upload Photo
                    <input
                      type="file"
                      ref={profileImageInputRef}
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </label>
                  {profileImage && (
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileImage(null);
                        try {
                          await updateMyProfile({ profileImage: null });
                          await refreshUser();
                        } catch (err) {
                          setError('Failed to remove profile picture');
                        }
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                  <input type="text" value={profile.firstName} onChange={(e) => handleChange('firstName', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Father Name</label>
                  <input type="text" value={profile.fatherName} onChange={(e) => handleChange('fatherName', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grandfather Name</label>
                  <input type="text" value={profile.grandFatherName} onChange={(e) => handleChange('grandFatherName', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name (Amharic)</label>
                  <input type="text" value={profile.firstNameLocal} onChange={(e) => handleChange('firstNameLocal', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Father Name (Amharic)</label>
                  <input type="text" value={profile.fatherNameLocal} onChange={(e) => handleChange('fatherNameLocal', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grandfather Name (Amharic)</label>
                  <input type="text" value={profile.grandFatherNameLocal} onChange={(e) => handleChange('grandFatherNameLocal', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth (GC)</label>
                  <input type="date" value={profile.dateOfBirthGC} onChange={(e) => handleChange('dateOfBirthGC', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                  <select value={profile.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Place of Birth</label>
                  <input type="text" value={profile.placeOfBirth} onChange={(e) => handleChange('placeOfBirth', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mother Tongue</label>
                  <input type="text" value={profile.motherTongue} onChange={(e) => handleChange('motherTongue', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Health Status</label>
                  <select value={profile.healthStatus} onChange={(e) => handleChange('healthStatus', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Marital Status</label>
                  <select value={profile.maritalStatus} onChange={(e) => handleChange('maritalStatus', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National ID (FAN)</label>
                  <input type="text" value={profile.nationalIdFan} onChange={(e) => handleChange('nationalIdFan', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Unspecified" />
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <h3 className="text-md font-semibold text-gray-900 dark:text-white">Others</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Economical Status</label>
                  <select value={profile.economicalStatus} onChange={(e) => handleChange('economicalStatus', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {ECONOMICAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Area Type</label>
                  <select value={profile.areaType} onChange={(e) => handleChange('areaType', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TIN Number</label>
                  <input type="text" value={profile.tinNumber} onChange={(e) => handleChange('tinNumber', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Unspecified" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
                  <input type="text" value={profile.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
          )}

          {/* Location and Address */}
          {activeSection === 'location' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location and Address
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Citizenship</label>
                  <input type="text" value={profile.citizenship} onChange={(e) => handleChange('citizenship', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Ethiopian" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                  <input type="text" value={profile.country} onChange={(e) => handleChange('country', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Ethiopia" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                  <input type="text" value={profile.city} onChange={(e) => handleChange('city', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Addis Ababa" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sub City</label>
                  <input type="text" value={profile.subCity} onChange={(e) => handleChange('subCity', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kebele</label>
                  <input type="text" value={profile.kebele} onChange={(e) => handleChange('kebele', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Woreda</label>
                  <input type="text" value={profile.woreda} onChange={(e) => handleChange('woreda', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">House Number</label>
                  <input type="text" value={profile.houseNumber} onChange={(e) => handleChange('houseNumber', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">P.O. Box</label>
                  <input type="text" value={profile.pobox} onChange={(e) => handleChange('pobox', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Unspecified" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input type="tel" value={profile.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input type="email" value={profile.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
          )}

          {/* Educational */}
          {activeSection === 'educational' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Campus Related Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stream</label>
                  <select value={profile.stream} onChange={(e) => handleChange('stream', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entry Year</label>
                  <input type="number" value={profile.entryYear} onChange={(e) => handleChange('entryYear', parseInt(e.target.value))} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sponsor Category</label>
                  <select value={profile.sponsorCategory} onChange={(e) => handleChange('sponsorCategory', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select</option>
                    {SPONSOR_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sponsored By</label>
                  <input type="text" value={profile.sponsoredBy} onChange={(e) => handleChange('sponsoredBy', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Unspecified" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National Exam Year (EC)</label>
                  <input type="number" value={profile.nationalExamYearEC} onChange={(e) => handleChange('nationalExamYearEC', parseInt(e.target.value))} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Examination ID</label>
                  <input type="text" value={profile.examinationId} onChange={(e) => handleChange('examinationId', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Admission Date</label>
                  <input type="date" value={profile.admissionDate} onChange={(e) => handleChange('admissionDate', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checked In Date</label>
                  <input type="date" value={profile.checkedInDate} onChange={(e) => handleChange('checkedInDate', e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National Exam Result Total</label>
                <input type="number" value={profile.nationalExamResultTotal} onChange={(e) => handleChange('nationalExamResultTotal', parseInt(e.target.value))} className="w-full max-w-xs px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <h3 className="text-md font-semibold text-gray-900 dark:text-white">National Exam Subject Level Result</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { field: 'examEnglish', label: 'English' },
                  { field: 'examPhysics', label: 'Physics' },
                  { field: 'examCivics', label: 'Civics' },
                  { field: 'examNaturalMath', label: 'Natural Math' },
                  { field: 'examChemistry', label: 'Chemistry' },
                  { field: 'examBiology', label: 'Biology' },
                  { field: 'examAptitude', label: 'Aptitude' },
                ].map(item => (
                  <div key={item.field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{item.label}</label>
                    <input type="number" value={profile[item.field]} onChange={(e) => handleChange(item.field, parseInt(e.target.value))} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Required Documents
              </h2>

              <div className="space-y-4">
                {DOCUMENT_TYPES.map(docType => {
                  const doc = getDocumentStatus(docType);
                  return (
                    <div key={docType} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          {doc ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> : <FileText className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{docType}</p>
                          {doc && <p className="text-sm text-gray-500 dark:text-gray-400">{doc.fileName}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc && (
                          <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        <label className={`px-4 py-2 rounded-lg cursor-pointer font-medium transition-colors ${uploadingDoc === docType ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-primary-900 hover:bg-primary-800 text-white'}`}>
                          {uploadingDoc === docType ? 'Uploading...' : doc ? 'Replace' : 'Upload'}
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, docType)} disabled={uploadingDoc === docType} />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => handleSave(false)} disabled={saving || profile.status === 'APPROVED'} className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              Save Draft
            </button>
            {profile.status !== 'APPROVED' && (
              <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 py-3 px-4 bg-primary-900 hover:bg-primary-800 dark:bg-primary-700 dark:hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <Send className="w-5 h-5" />
                Submit for Approval
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
