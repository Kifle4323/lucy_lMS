import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getClasses } from '../api';
import Layout from '../components/Layout';
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  ChevronRight,
  Clock,
  User,
  ClipboardList,
  Award,
  FileText,
  CalendarClock
} from 'lucide-react';

export default function DashboardPage() {
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
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'ADMIN' ? 'Manage your learning platform' :
             user?.role === 'TEACHER' ? 'View your teaching schedule' :
             'Continue your learning journey'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
                <p className="text-sm text-gray-500">Classes</p>
              </div>
            </div>
          </div>

          {user?.role === 'TEACHER' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Students</p>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'TEACHER' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {classes.reduce((sum, c) => sum + (c.courses?.filter(cc => cc.teacherId === user.id).length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Courses Teaching</p>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'STUDENT' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {classes.reduce((sum, c) => sum + (c.courses?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Courses</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin/academic"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Academic Management</p>
                    <p className="text-sm text-gray-500">Years & Semesters</p>
                  </div>
                </div>
              </Link>
            )}

            {user?.role === 'TEACHER' && (
              <Link
                to="/teacher/grades"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Grade Management</p>
                    <p className="text-sm text-gray-500">Enter student grades</p>
                  </div>
                </div>
              </Link>
            )}

            {user?.role === 'STUDENT' && (
              <Link
                to="/student/registration"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Semester Registration</p>
                    <p className="text-sm text-gray-500">Register for courses</p>
                  </div>
                </div>
              </Link>
            )}

            {user?.role === 'STUDENT' && (
              <Link
                to="/student/exams"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <CalendarClock className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Exam Schedule</p>
                    <p className="text-sm text-gray-500">Midterm & Final</p>
                  </div>
                </div>
              </Link>
            )}

            {user?.role === 'STUDENT' && (
              <Link
                to="/student/results"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">My Results</p>
                    <p className="text-sm text-gray-500">GPA & Grades</p>
                  </div>
                </div>
              </Link>
            )}

            <Link
              to={user?.role === 'ADMIN' ? '/admin/courses' : '/my-classes'}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user?.role === 'ADMIN' ? 'Manage Courses' : 'My Courses'}
                  </p>
                  <p className="text-sm text-gray-500">View all courses</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Classes List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Classes</h2>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-500">
              {user?.role === 'ADMIN' 
                ? 'Create classes and assign students and teachers'
                : 'You haven\'t been added to any classes yet'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.code}</p>
                    </div>
                    {cls.year && (
                      <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded">
                        Year {cls.year}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {/* Teachers */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>
                      {cls.teachers?.length || 0} teacher{cls.teachers?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Students */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4" />
                    <span>
                      {cls.students?.length || 0} student{cls.students?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Courses */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {user?.role === 'TEACHER'
                        ? (cls.courses?.filter(cc => cc.teacherId === user.id).length || 0)
                        : (cls.courses?.length || 0)
                      } course{cls.courses?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* View Button */}
                  <Link
                    to={user?.role === 'ADMIN' ? `/admin/classes` : `/my-classes`}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium rounded-lg transition-colors"
                  >
                    {user?.role === 'ADMIN' ? 'Manage Classes' : 'View My Classes'}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
