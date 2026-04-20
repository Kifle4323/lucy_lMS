import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getClasses, getAdminAnalytics, getTeacherAnalytics, getStudentAnalytics } from '../api';
import Layout from '../components/Layout';
import {
  GraduationCap, BookOpen, Users, Calendar, ChevronRight, Clock, User,
  ClipboardList, Award, FileText, CalendarClock, TrendingUp, Activity,
  BarChart3, Eye, CheckCircle, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatCard({ icon: Icon, iconBg, iconColor, value, label, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function AdminAnalytics({ data }) {
  if (!data) return null;
  const { users, content, activity, grades, attendance } = data;

  const roleData = [
    { name: 'Students', value: users.students },
    { name: 'Teachers', value: users.teachers },
    { name: 'Admins', value: users.admins },
  ].filter(d => d.value > 0);

  const gradeData = Object.entries(grades.distribution || {}).map(([letter, count]) => ({
    letter, count
  }));

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} iconBg="bg-primary-100" iconColor="text-primary-600" value={users.total} label="Total Users" sub={`${users.recentRegistrations} new (30d)`} />
        <StatCard icon={GraduationCap} iconBg="bg-blue-100" iconColor="text-blue-600" value={users.students} label="Students" />
        <StatCard icon={BookOpen} iconBg="bg-green-100" iconColor="text-green-600" value={content.courses} label="Courses" />
        <StatCard icon={Activity} iconBg="bg-purple-100" iconColor="text-purple-600" value={content.classes} label="Classes" />
        <StatCard icon={FileText} iconBg="bg-orange-100" iconColor="text-orange-600" value={content.materials} label="Materials" />
        <StatCard icon={ClipboardList} iconBg="bg-red-100" iconColor="text-red-600" value={content.assessments} label="Assessments" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No user data yet</p>}
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradeData}>
                <XAxis dataKey="letter" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No grade data yet</p>}
        </div>
      </div>

      {/* Activity & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Enrollments</span>
              <span className="font-semibold text-gray-900">{activity.enrollments}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Assessment Attempts</span>
              <span className="font-semibold text-gray-900">{activity.attempts}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Material Views</span>
              <span className="font-semibold text-gray-900">{activity.materialViews}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Live Sessions</span>
              <span className="font-semibold text-gray-900">{activity.liveSessions}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Active Sessions</span>
              <span className="font-semibold text-green-600">{activity.activeSessions}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Average GPA</span>
              <span className="font-semibold text-gray-900">{grades.averageGPA || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Avg Attendance</span>
              <span className="font-semibold text-gray-900">{attendance.averageScore}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Attendance Records</span>
              <span className="font-semibold text-gray-900">{attendance.totalRecords}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h3>
          <div className="space-y-3">
            {users.pendingProfiles > 0 && (
              <Link to="/admin/users" className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">{users.pendingProfiles} pending approvals</p>
                  <p className="text-xs text-yellow-600">Student profiles awaiting review</p>
                </div>
              </Link>
            )}
            {activity.activeSessions > 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{activity.activeSessions} active live session{activity.activeSessions !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-green-600">Currently in progress</p>
                </div>
              </div>
            )}
            {users.pendingProfiles === 0 && activity.activeSessions === 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                <p className="text-gray-500">No pending alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TeacherAnalytics({ data }) {
  if (!data) return null;
  const { totalCourses, totalStudents, avgGrade, avgAttendance, liveSessions, activeSessions, materialViews, sections } = data;

  const sectionChartData = (sections || []).map(s => ({
    name: s.courseCode || s.courseTitle?.substring(0, 8),
    students: s.students,
    avg: s.avgScore,
  }));

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={BookOpen} iconBg="bg-green-100" iconColor="text-green-600" value={totalCourses} label="Courses" />
        <StatCard icon={GraduationCap} iconBg="bg-blue-100" iconColor="text-blue-600" value={totalStudents} label="Students" />
        <StatCard icon={TrendingUp} iconBg="bg-purple-100" iconColor="text-purple-600" value={avgGrade} label="Avg Grade" />
        <StatCard icon={CheckCircle} iconBg="bg-teal-100" iconColor="text-teal-600" value={`${avgAttendance}%`} label="Avg Attendance" />
        <StatCard icon={Activity} iconBg="bg-orange-100" iconColor="text-orange-600" value={liveSessions} label="Live Sessions" />
        <StatCard icon={Eye} iconBg="bg-indigo-100" iconColor="text-indigo-600" value={materialViews} label="Material Views" />
      </div>

      {/* Course Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Students per Course</h3>
          {sectionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sectionChartData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="students" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No courses yet</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Sections</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(sections || []).map(s => (
              <div key={s.sectionId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{s.courseTitle}</p>
                  <p className="text-xs text-gray-500">{s.semester} - {s.className}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{s.avgScore}</p>
                  <p className="text-xs text-gray-500">{s.students} students</p>
                </div>
              </div>
            ))}
            {(!sections || sections.length === 0) && <p className="text-gray-400 text-center py-8">No sections yet</p>}
          </div>
        </div>
      </div>

      {activeSessions > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <Activity className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">{activeSessions} active live session{activeSessions !== 1 ? 's' : ''} in progress</p>
        </div>
      )}
    </>
  );
}

function StudentAnalytics({ data }) {
  if (!data) return null;
  const { totalCourses, gpa, avgAttendance, avgAssessmentScore, readingProgress, totalAttempts, courses, upcomingExams } = data;

  const courseGradeData = (courses || []).filter(c => c.grade !== null).map(c => ({
    name: c.courseCode || c.courseTitle?.substring(0, 8),
    score: c.grade,
  }));

  const readPct = readingProgress?.total > 0 ? Math.round(readingProgress.completed / readingProgress.total * 100) : 0;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={BookOpen} iconBg="bg-green-100" iconColor="text-green-600" value={totalCourses} label="Courses" />
        <StatCard icon={Award} iconBg="bg-blue-100" iconColor="text-blue-600" value={gpa} label="GPA" />
        <StatCard icon={CheckCircle} iconBg="bg-teal-100" iconColor="text-teal-600" value={`${avgAttendance}%`} label="Attendance" />
        <StatCard icon={BarChart3} iconBg="bg-purple-100" iconColor="text-purple-600" value={`${avgAssessmentScore}%`} label="Avg Assessment" />
        <StatCard icon={FileText} iconBg="bg-orange-100" iconColor="text-orange-600" value={totalAttempts} label="Attempts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Course Grades */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Course Grades</h3>
          {courseGradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={courseGradeData}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No grades published yet</p>}
        </div>

        {/* Reading Progress & Upcoming */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Reading Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div className="bg-primary-600 h-4 rounded-full transition-all" style={{ width: `${readPct}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{readPct}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{readingProgress?.completed || 0} of {readingProgress?.total || 0} materials completed</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Exams</h3>
            {(upcomingExams || []).length > 0 ? (
              <div className="space-y-2">
                {upcomingExams.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{e.title}</p>
                      <p className="text-xs text-gray-500">{e.type} Exam</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{e.date ? new Date(e.date).toLocaleDateString() : 'TBD'}</p>
                      {e.location && <p className="text-xs text-gray-500">{e.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-center py-4">No upcoming exams</p>}
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(courses || []).map((c, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{c.courseTitle}</p>
                <p className="text-xs text-gray-500">{c.teacher} - {c.semester}</p>
              </div>
              <div className="text-right">
                {c.isPublished ? (
                  <>
                    <p className="font-bold text-gray-900">{c.grade}</p>
                    <p className={`text-xs font-medium ${c.gradeLetter?.startsWith('A') || c.gradeLetter?.startsWith('B') ? 'text-green-600' : c.gradeLetter?.startsWith('C') ? 'text-yellow-600' : 'text-red-600'}`}>{c.gradeLetter}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Not published</p>
                )}
              </div>
            </div>
          ))}
          {(!courses || courses.length === 0) && <p className="text-gray-400 text-center py-4 col-span-2">No enrollments yet</p>}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getClasses().catch(() => []),
      user?.role === 'ADMIN' ? getAdminAnalytics().catch(() => null) :
      user?.role === 'TEACHER' ? getTeacherAnalytics().catch(() => null) :
      user?.role === 'STUDENT' ? getStudentAnalytics().catch(() => null) :
      Promise.resolve(null),
    ])
      .then(([classesData, analyticsData]) => {
        setClasses(classesData);
        setAnalytics(analyticsData);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

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
            {user?.role === 'ADMIN' ? 'Platform analytics & management' :
             user?.role === 'TEACHER' ? 'Your teaching overview' :
             'Your learning dashboard'}
          </p>
        </div>

        {/* Analytics by Role */}
        {user?.role === 'ADMIN' && <AdminAnalytics data={analytics} />}
        {user?.role === 'TEACHER' && <TeacherAnalytics data={analytics} />}
        {user?.role === 'STUDENT' && <StudentAnalytics data={analytics} />}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.role === 'ADMIN' && (
              <Link to="/admin/academic" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
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
              <Link to="/teacher/grades" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
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
              <Link to="/student/registration" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
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
              <Link to="/student/exams" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
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
              <Link to="/student/results" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
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

            <Link to={user?.role === 'ADMIN' ? '/admin/courses' : '/my-classes'} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user?.role === 'ADMIN' ? 'Manage Courses' : 'My Courses'}</p>
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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{cls.teachers?.length || 0} teacher{cls.teachers?.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4" />
                    <span>{cls.students?.length || 0} student{cls.students?.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {user?.role === 'TEACHER'
                        ? (cls.courses?.filter(cc => cc.teacherId === user.id).length || 0)
                        : (cls.courses?.length || 0)
                      } course{cls.courses?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
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
