import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { getGradeConfig, updateGradeConfig, getGradebook, getAttendance, setAttendance, getMyGrades } from '../api';
import Layout from '../components/Layout';
import {
  ChevronLeft,
  Settings,
  Users,
  Calculator,
  Save,
  Award,
  BookOpen,
  Clock,
  UserCheck,
  TrendingUp
} from 'lucide-react';

export default function GradebookPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [gradebook, setGradebook] = useState(null);
  const [myGrades, setMyGrades] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [activeView, setActiveView] = useState('gradebook');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (user?.role === 'TEACHER') {
      Promise.all([
        getGradeConfig(courseId).then(setConfig),
        getGradebook(courseId).then(data => {
          setGradebook(data);
          // Initialize attendance state
          const attMap = {};
          data.gradebook.forEach(g => {
            attMap[g.student.id] = g.attendanceScore;
          });
          setAttendance(attMap);
        }),
      ]).finally(() => setLoading(false));
    } else if (user?.role === 'STUDENT') {
      getMyGrades(courseId).then(setMyGrades).finally(() => setLoading(false));
    }
  }, [courseId, user?.role]);

  const handleConfigChange = (field, value) => {
    setConfig({ ...config, [field]: parseInt(value) || 0 });
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const updated = await updateGradeConfig(courseId, {
        quizWeight: config.quizWeight,
        midtermWeight: config.midtermWeight,
        finalWeight: config.finalWeight,
        attendanceWeight: config.attendanceWeight,
      });
      setConfig(updated);
      toast.success('Grade weights saved!');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const handleAttendanceChange = (studentId, value) => {
    setAttendance({ ...attendance, [studentId]: parseInt(value) || 0 });
  };

  const handleSaveAttendance = async (studentId) => {
    try {
      await setAttendance(courseId, studentId, attendance[studentId]);
      toast.success('Attendance saved!');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    }
  };

  const handleSaveAllAttendance = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(attendance).map(([studentId, score]) =>
        setAttendance(courseId, studentId, score)
      );
      await Promise.all(promises);
      toast.success('All attendance saved!');
    } catch (err) {
      toast.error('Failed to save some: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  // Student view
  if (user?.role === 'STUDENT' && myGrades) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Link to={`/course/${courseId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ChevronLeft className="w-5 h-5" />
            Back to Course
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Grades</h1>
            <p className="text-gray-500">Your overall performance in this course</p>
          </div>

          {/* Total Grade Card */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-8 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">Total Grade</p>
                <p className="text-5xl font-bold mt-2">{myGrades.totalGrade}%</p>
              </div>
              <Award className="w-16 h-16 text-primary-200" />
            </div>
          </div>

          {/* Grade Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quiz */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quiz Average</h3>
                  <p className="text-sm text-gray-500">{myGrades.config.quizWeight}% weight</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{myGrades.quizAverage}%</p>
              {myGrades.quizDetails.length > 0 && (
                <div className="mt-4 space-y-2">
                  {myGrades.quizDetails.map((q, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{q.title}</span>
                      <span className="font-medium">{q.score}/{q.maxScore} ({q.percent}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Midterm */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Midterm</h3>
                  <p className="text-sm text-gray-500">{myGrades.config.midtermWeight}% weight</p>
                </div>
              </div>
              {myGrades.midtermDetail ? (
                <>
                  <p className="text-3xl font-bold text-gray-900">{myGrades.midtermScore}%</p>
                  <p className="text-sm text-gray-600 mt-2">{myGrades.midtermDetail.score}/{myGrades.midtermDetail.maxScore}</p>
                </>
              ) : (
                <p className="text-gray-500">Not yet taken</p>
              )}
            </div>

            {/* Final */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Final Exam</h3>
                  <p className="text-sm text-gray-500">{myGrades.config.finalWeight}% weight</p>
                </div>
              </div>
              {myGrades.finalDetail ? (
                <>
                  <p className="text-3xl font-bold text-gray-900">{myGrades.finalScore}%</p>
                  <p className="text-sm text-gray-600 mt-2">{myGrades.finalDetail.score}/{myGrades.finalDetail.maxScore}</p>
                </>
              ) : (
                <p className="text-gray-500">Not yet taken</p>
              )}
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Attendance</h3>
                  <p className="text-sm text-gray-500">{myGrades.config.attendanceWeight}% weight</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{myGrades.attendanceScore}%</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Teacher view
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Link to={`/course/${courseId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ChevronLeft className="w-5 h-5" />
          Back to Course
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
            <p className="text-gray-500">Manage grades and attendance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('gradebook')}
              className={`px-4 py-2 font-medium rounded-lg ${activeView === 'gradebook' ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <Calculator className="w-4 h-4 inline mr-2" />
              Gradebook
            </button>
            <button
              onClick={() => setActiveView('config')}
              className={`px-4 py-2 font-medium rounded-lg ${activeView === 'config' ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Weights
            </button>
            <button
              onClick={() => setActiveView('attendance')}
              className={`px-4 py-2 font-medium rounded-lg ${activeView === 'attendance' ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <UserCheck className="w-4 h-4 inline mr-2" />
              Attendance
            </button>
            {user?.role === 'TEACHER' && (
              <Link
                to={`/teacher/grades?course=${courseId}`}
                className="px-4 py-2 font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Semester Grades
              </Link>
            )}
          </div>
        </div>

        {/* Weight Configuration */}
        {activeView === 'config' && config && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Weights</h2>
            <p className="text-sm text-gray-500 mb-6">Configure how each component contributes to the total grade. Weights must sum to 100%.</p>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Weight (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.quizWeight}
                  onChange={(e) => handleConfigChange('quizWeight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Midterm Weight (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.midtermWeight}
                  onChange={(e) => handleConfigChange('midtermWeight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Weight (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.finalWeight}
                  onChange={(e) => handleConfigChange('finalWeight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Weight (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.attendanceWeight}
                  onChange={(e) => handleConfigChange('attendanceWeight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Total: <span className={`font-bold ${config.quizWeight + config.midtermWeight + config.finalWeight + config.attendanceWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {config.quizWeight + config.midtermWeight + config.finalWeight + config.attendanceWeight}%
                </span>
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="mt-6 px-6 py-2 bg-primary-900 hover:bg-primary-800 disabled:bg-gray-300 text-white font-medium rounded-lg"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Save Weights
            </button>
          </div>
        )}

        {/* Attendance Entry - Grouped by Class */}
        {activeView === 'attendance' && gradebook && (() => {
          // Group students by class
          const classGroups = {};
          gradebook.gradebook.forEach(g => {
            const cls = g.student.className || 'Unassigned';
            if (!classGroups[cls]) classGroups[cls] = [];
            classGroups[cls].push(g);
          });
          const classNames = Object.keys(classGroups).sort();

          return (
            <div className="space-y-6">
              {classNames.map(cls => (
                <div key={cls} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{cls}</h3>
                          <p className="text-xs text-gray-500">{classGroups[cls].length} student{classGroups[cls].length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const promises = classGroups[cls].map(g =>
                            setAttendance(courseId, g.student.id, attendance[g.student.id] || 0)
                          );
                          Promise.all(promises).then(() => toast.success(`Attendance saved for ${cls}`)).catch(() => toast.error('Failed to save'));
                        }}
                        disabled={saving}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg inline-flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Class
                      </button>
                    </div>
                  </div>

                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {classGroups[cls].map((g) => (
                        <tr key={g.student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-700 font-medium text-sm">
                                  {g.student.fullName?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{g.student.fullName}</p>
                                <p className="text-xs text-gray-500">{g.student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={gradebook.config.attendanceWeight}
                                step="0.1"
                                value={attendance[g.student.id] || 0}
                                onChange={(e) => handleAttendanceChange(g.student.id, e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-200 rounded text-center"
                              />
                              <span className="text-gray-500">/{gradebook.config.attendanceWeight}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleSaveAttendance(g.student.id)}
                              className="px-3 py-1 bg-primary-900 hover:bg-primary-800 text-white text-sm font-medium rounded"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAllAttendance}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium rounded-lg inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save All Attendance
                </button>
              </div>
            </div>
          );
        })()}

        {/* Gradebook View - Grouped by Class */}
        {activeView === 'gradebook' && gradebook && (() => {
          // Group students by class
          const classGroups = {};
          gradebook.gradebook.forEach(g => {
            const cls = g.student.className || 'Unassigned';
            if (!classGroups[cls]) classGroups[cls] = [];
            classGroups[cls].push(g);
          });
          const classNames = Object.keys(classGroups).sort();

          return (
            <div className="space-y-6">
              {classNames.map(cls => (
                <div key={cls} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{cls}</h3>
                        <p className="text-xs text-gray-500">{classGroups[cls].length} student{classGroups[cls].length !== 1 ? 's' : ''} | Quiz: {gradebook.config.quizWeight}% | Midterm: {gradebook.config.midtermWeight}% | Final: {gradebook.config.finalWeight}% | Attendance: {gradebook.config.attendanceWeight}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quiz<br/><span className="text-gray-400">/{gradebook.config.quizWeight}</span></th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Midterm<br/><span className="text-gray-400">/{gradebook.config.midtermWeight}</span></th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Final<br/><span className="text-gray-400">/{gradebook.config.finalWeight}</span></th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance<br/><span className="text-gray-400">/{gradebook.config.attendanceWeight}</span></th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-primary-50">Total<br/><span className="text-gray-400">/100</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {classGroups[cls].map((g) => (
                          <tr key={g.student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <span className="text-primary-700 font-medium text-sm">
                                    {g.student.fullName?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{g.student.fullName}</p>
                                  <p className="text-xs text-gray-500">{g.student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`font-medium ${g.quizMark > 0 ? (g.quizAverage >= 60 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                {g.quizMark > 0 ? g.quizMark : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`font-medium ${g.midtermMark > 0 ? (g.midtermScore >= 60 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                {g.midtermMark > 0 ? g.midtermMark : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`font-medium ${g.finalMark > 0 ? (g.finalScore >= 60 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                {g.finalMark > 0 ? g.finalMark : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="font-medium text-gray-900">{g.attendanceMark > 0 ? g.attendanceMark : '-'}</span>
                            </td>
                            <td className="px-4 py-4 text-center bg-primary-50">
                              <span className={`font-bold text-lg ${g.totalGrade >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                {g.totalGrade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </Layout>
  );
}
