import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getClasses, getTeacherSections, getMyEnrollments } from '../api';
import Layout from '../components/Layout';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  ChevronRight,
  User,
  FileText,
  Calendar,
  MapPin
} from 'lucide-react';

export default function MyClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getClasses().catch(() => []),
      user?.role === 'TEACHER' ? getTeacherSections().catch(() => []) : 
      user?.role === 'STUDENT' ? getMyEnrollments().catch(() => []) : Promise.resolve([])
    ])
      .then(([classesData, sectionsData]) => {
        setClasses(classesData);
        setSections(sectionsData);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Classes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'TEACHER' ? 'Classes and course sections you are teaching' : 'Classes you are enrolled in'}
          </p>
        </div>

        {/* Course Sections with Semester (New System) */}
        {user?.role === 'TEACHER' && sections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Course Sections (by Semester)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <div 
                  key={section.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{section.course?.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{section.course?.code}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                      {section.sectionCode}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{section.semester?.name} {section.semester?.academicYear?.year}</span>
                    </div>
                    {section.schedule && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{section.schedule}</span>
                      </div>
                    )}
                    {section.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{section.room}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{section._count?.enrollments || 0} students</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/courses/${section.courseId}`}
                      className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                    >
                      <BookOpen className="w-4 h-4" />
                      Manage Assessments
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/teacher/grades?section=${section.id}`}
                      className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:text-green-700 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Manage Grades
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Enrollments (New System) */}
        {user?.role === 'STUDENT' && sections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              My Enrolled Courses
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((enrollment) => (
                <div 
                  key={enrollment.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{enrollment.courseSection?.course?.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{enrollment.courseSection?.course?.code}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                      {enrollment.courseSection?.sectionCode}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{enrollment.courseSection?.semester?.name}</span>
                    </div>
                    {enrollment.courseSection?.schedule && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{enrollment.courseSection?.schedule}</span>
                      </div>
                    )}
                    {enrollment.courseSection?.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{enrollment.courseSection?.room}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/student/results`}
                    className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    View Results
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Old Classes System */}
        {classes.length === 0 && sections.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No classes yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {user?.role === 'TEACHER' 
                ? 'You haven\'t been assigned to any classes or course sections yet' 
                : 'You haven\'t been added to any classes yet'}
            </p>
          </div>
        ) : classes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Classes</h2>
            <div className="space-y-6">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Class Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{cls.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{cls.code}</p>
                      </div>
                      {cls.year && (
                        <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium rounded-full">
                          Year {cls.year}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Class Content */}
                  <div className="p-5">
                    {/* Stats Row */}
                    <div className="flex gap-6 mb-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{cls.teachers?.length || 0} teacher{cls.teachers?.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>{cls.students?.length || 0} student{cls.students?.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{cls.courses?.length || 0} course{cls.courses?.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Courses List */}
                    {cls.courses && cls.courses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Courses</h4>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {/* For teachers, only show courses they teach */}
                          {(user?.role === 'TEACHER' 
                            ? cls.courses.filter(cc => cc.teacherId === user.id)
                            : cls.courses
                          ).map((cc) => (
                            <div 
                              key={cc.id} 
                              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                  <span className="font-medium text-gray-900 dark:text-white">{cc.course?.title}</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{cc.course?.code}</p>
                              
                              {user?.role === 'TEACHER' && (
                                <Link
                                  to={`/courses/${cc.courseId}`}
                                  className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                                >
                                  <FileText className="w-4 h-4" />
                                  Manage Assessments
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              )}

                              {user?.role === 'STUDENT' && (
                                <Link
                                  to={`/courses/${cc.courseId}`}
                                  className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                                >
                                  <FileText className="w-4 h-4" />
                                  View Course
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              )}
                            </div>
                          ))}
                          {user?.role === 'TEACHER' && cls.courses.filter(cc => cc.teacherId === user.id).length === 0 && (
                            <p className="col-span-full text-sm text-gray-500 dark:text-gray-400 italic">You are not teaching any courses in this class.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {(!cls.courses || cls.courses.length === 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No courses assigned to this class yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
