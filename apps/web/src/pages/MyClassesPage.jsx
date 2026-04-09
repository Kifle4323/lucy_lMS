import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getClasses } from '../api';
import Layout from '../components/Layout';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  ChevronRight,
  User,
  FileText
} from 'lucide-react';

export default function MyClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getClasses()
      .then(setClasses)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'TEACHER' ? 'Classes you are teaching' : 'Classes you are enrolled in'}
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-500">
              {user?.role === 'TEACHER' 
                ? 'You haven\'t been assigned to any classes yet' 
                : 'You haven\'t been added to any classes yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Class Header */}
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.code}</p>
                    </div>
                    {cls.year && (
                      <span className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-medium rounded-full">
                        Year {cls.year}
                      </span>
                    )}
                  </div>
                </div>

                {/* Class Content */}
                <div className="p-5">
                  {/* Stats Row */}
                  <div className="flex gap-6 mb-4 text-sm text-gray-600">
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
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Courses</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {/* For teachers, only show courses they teach */}
                        {(user?.role === 'TEACHER' 
                          ? cls.courses.filter(cc => cc.teacherId === user.id)
                          : cls.courses
                        ).map((cc) => (
                          <div 
                            key={cc.id} 
                            className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary-600" />
                                <span className="font-medium text-gray-900">{cc.course?.title}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">{cc.course?.code}</p>
                            
                            {user?.role === 'TEACHER' && (
                              <Link
                                to={`/courses/${cc.courseId}`}
                                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                Manage Assessments
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            )}

                            {user?.role === 'STUDENT' && (
                              <Link
                                to={`/courses/${cc.courseId}`}
                                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                View Course
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        ))}
                        {user?.role === 'TEACHER' && cls.courses.filter(cc => cc.teacherId === user.id).length === 0 && (
                          <p className="col-span-full text-sm text-gray-500 italic">You are not teaching any courses in this class.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {(!cls.courses || cls.courses.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No courses assigned to this class yet.</p>
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
