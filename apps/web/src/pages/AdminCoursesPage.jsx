import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { getCourses, createCourse, getSemesters, getCourseSections } from '../api';
import Layout from '../components/Layout';
import { Plus, BookOpen, X, FileText, Filter, Users, ChevronDown, ChevronRight } from 'lucide-react';

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [courseSections, setCourseSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState({});
  const [newCourse, setNewCourse] = useState({
    title: '',
    code: '',
    description: '',
    creditHours: 3,
    ectsCredits: 5
  });

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    Promise.all([
      getCourses().then(setCourses),
      getSemesters().then(data => {
        setSemesters(data);
        // Auto-select current semester
        const current = data.find(s => s.isCurrent);
        if (current) {
          setSelectedSemester(current.id);
        } else if (data.length > 0) {
          setSelectedSemester(data[0].id);
        }
      })
    ]).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (selectedSemester) {
      getCourseSections(selectedSemester).then(setCourseSections);
    }
  }, [selectedSemester]);

  // Group course sections by class
  const sectionsByClass = courseSections.reduce((acc, section) => {
    const classKey = section.classId || 'no-class';
    const className = section.class?.name || 'Unassigned';
    if (!acc[classKey]) {
      acc[classKey] = {
        id: classKey,
        name: className,
        code: section.class?.code,
        sections: []
      };
    }
    acc[classKey].sections.push(section);
    return acc;
  }, {});

  const toggleClass = (classId) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !prev[classId]
    }));
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const created = await createCourse(newCourse);
      setCourses([created, ...courses]);
      setShowCreateModal(false);
      setNewCourse({
        title: '',
        code: '',
        description: '',
        creditHours: 3,
        ectsCredits: 5
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      UPCOMING: 'bg-gray-100 text-gray-700',
      REGISTRATION_OPEN: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-green-100 text-green-700',
      GRADING: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (user?.role !== 'ADMIN') return <div className="p-8 text-center">Access denied</div>;
  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  const selectedSemesterData = semesters.find(s => s.id === selectedSemester);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage courses by semester and class</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Course
          </button>
        </div>

        {/* Semester Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Filter by Semester:</span>
            </div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="flex-1 sm:max-w-xs px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Semester</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type}) {s.isCurrent ? ' - Current' : ''}
                </option>
              ))}
            </select>
            {selectedSemesterData && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedSemesterData.status)}`}>
                {selectedSemesterData.status?.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Course Sections by Class */}
        {selectedSemester ? (
          Object.keys(sectionsByClass).length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No course sections for this semester</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Create course sections in the Academic page first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(sectionsByClass).map(classGroup => (
                <div key={classGroup.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Class Header */}
                  <button
                    onClick={() => toggleClass(classGroup.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary-600" />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{classGroup.name}</h3>
                        {classGroup.code && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{classGroup.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-sm rounded">
                        {classGroup.sections.length} course{classGroup.sections.length !== 1 ? 's' : ''}
                      </span>
                      {expandedClasses[classGroup.id] ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Course Sections */}
                  {expandedClasses[classGroup.id] && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {classGroup.sections.map(section => (
                        <div key={section.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{section.course?.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{section.sectionCode}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs rounded">
                                    {section.course?.creditHours || 0} Credits
                                  </span>
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded">
                                    {section.course?.ectsCredits || 0} ECTS
                                  </span>
                                  {section.schedule && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded">
                                      {section.schedule}
                                    </span>
                                  )}
                                  {section.room && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded">
                                      {section.room}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{section.teacher?.fullName || 'No Teacher'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{section._count?.enrollments || 0} students</p>
                              {section.isPublished ? (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded">Published</span>
                              ) : (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded">Draft</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a semester</h3>
            <p className="text-gray-500 dark:text-gray-400">Choose a semester to view courses organized by class</p>
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Course</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Title</label>
                <input
                  type="text"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Code</label>
                <input
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., CS101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Brief description of the course..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credit Hours</label>
                  <input
                    type="number"
                    value={newCourse.creditHours}
                    onChange={(e) => setNewCourse({ ...newCourse, creditHours: parseInt(e.target.value) || 0 })}
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 3"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">US Credit Hours</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ECTS Credits</label>
                  <input
                    type="number"
                    value={newCourse.ectsCredits}
                    onChange={(e) => setNewCourse({ ...newCourse, ectsCredits: parseInt(e.target.value) || 0 })}
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 5"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">European Credits</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
