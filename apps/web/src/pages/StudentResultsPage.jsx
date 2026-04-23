import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyResults, getMyCGPA, getMyEnrollments, getStudentGraduationStatus, getStudentCertificates } from '../api.js';
import Layout from '../components/Layout';
import { GraduationCap, Award, CheckCircle, XCircle, Clock, Download, Eye } from 'lucide-react';

export default function StudentResultsPage() {
  const [currentResults, setCurrentResults] = useState(null);
  const [cgpaData, setCgpaData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportView, setReportView] = useState(true);
  const [graduationStatus, setGraduationStatus] = useState(null);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [results, cgpa, enrollData, gradStatus, certs] = await Promise.all([
        getMyResults(),
        getMyCGPA(),
        getMyEnrollments(),
        getStudentGraduationStatus().catch(() => null),
        getStudentCertificates().catch(() => []),
      ]);
      setCurrentResults(results);
      setCgpaData(cgpa);
      setEnrollments(enrollData);
      setGraduationStatus(gradStatus);
      setCertificates(certs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function viewSemesterResults(semesterId) {
    try {
      const results = await getMyResults(semesterId);
      setCurrentResults(results);
      setSelectedSemester(semesterId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

  const activeSemesterName = currentResults?.semester?.name || 'Current Semester';
  const activeAcademicYear = currentResults?.semester?.academicYear?.name;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6 print:hidden">
          <h1 className="text-2xl font-bold">My Academic Results</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => setReportView(v => !v)}
              className="px-4 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
            >
              {reportView ? 'Switch to Normal View' : 'Switch to Report View'}
            </button>
            {currentResults?.courses?.length > 0 && (
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white text-sm"
              >
                Print Report
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/* CGPA Card */}
      {cgpaData && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{cgpaData.cgpa?.toFixed(2) || '-'}</div>
              <div className="text-sm opacity-80">Cumulative GPA</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{cgpaData.totalCredits || 0}</div>
              <div className="text-sm opacity-80">Total Credits</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{cgpaData.totalCourses || 0}</div>
              <div className="text-sm opacity-80">Courses Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{cgpaData.semesters?.length || 0}</div>
              <div className="text-sm opacity-80">Semesters</div>
            </div>
          </div>
        </div>
      )}

      {/* Semester GPA History */}
      {cgpaData?.semesters?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Semester History</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {cgpaData.semesters.map(sem => (
              <button
                key={sem.semester.id}
                onClick={() => viewSemesterResults(sem.semester.id)}
                className={`p-4 rounded border text-left ${
                  selectedSemester === sem.semester.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{sem.semester.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{sem.semester.academicYear?.name}</div>
                <div className="mt-2 flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">GPA: <strong>{sem.gpa.toFixed(2)}</strong></span>
                  <span className="text-sm">Credits: {sem.credits}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current/Selected Semester Results */}
      {currentResults && (
        reportView ? (
          <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border print:border-gray-200">
            <div className="bg-blue-700 text-white px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold">{activeSemesterName}</div>
                  {activeAcademicYear && (
                    <div className="text-sm opacity-90">{activeAcademicYear}</div>
                  )}
                </div>
                <div className="text-right">
                  {currentResults.gpa !== null && (
                    <div>
                      <div className="text-xs opacity-80">Semester GPA</div>
                      <div className="text-2xl font-extrabold">{currentResults.gpa.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {currentResults.courses?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="text-left p-3 font-semibold">Course Code</th>
                      <th className="text-left p-3 font-semibold">Course Title</th>
                      <th className="text-center p-3 font-semibold">Credits</th>
                      <th className="text-center p-3 font-semibold">Total</th>
                      <th className="text-center p-3 font-semibold">Grade</th>
                      <th className="text-center p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.courses.map(course => (
                      <tr key={course.id} className="border-t">
                        <td className="p-3 align-top font-medium text-gray-900">
                          {course.course?.code || '-'}
                        </td>
                        <td className="p-3 align-top">
                          <div className="font-medium text-gray-900">{course.course?.title}</div>
                          <div className="text-xs text-gray-500">{course.sectionCode}</div>
                        </td>
                        <td className="p-3 align-top text-center">{course.creditHours}</td>
                        <td className="p-3 align-top text-center font-semibold">
                          {course.grade?.isPublished ? (course.grade?.totalScore ?? '-') : '-'}
                        </td>
                        <td className="p-3 align-top text-center">
                          {course.grade?.isPublished && course.grade?.gradeLetter ? (
                            <span className="inline-block min-w-10 px-2 py-1 rounded bg-green-700 text-white text-xs font-semibold">
                              {course.grade.gradeLetter}
                            </span>
                          ) : course.grade?.isSubmitted ? (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Pending</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">-</span>
                          )}
                        </td>
                        <td className="p-3 align-top text-center">
                          {course.grade?.isPublished ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Published</span>
                          ) : course.grade?.isSubmitted ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Submitted</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Not Graded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No courses found for this semester.</p>
            )}

            <div className="px-6 py-4 border-t">
              <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-700">
                <div>
                  <div className="font-semibold mb-1">Grading Scale</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div>A+ (90-100): 4.0</div>
                    <div>A (85-89): 4.0</div>
                    <div>A- (80-84): 3.75</div>
                    <div>B+ (75-79): 3.5</div>
                    <div>B (70-74): 3.0</div>
                    <div>B- (65-69): 2.75</div>
                    <div>C+ (60-64): 2.5</div>
                    <div>C (50-59): 2.0</div>
                    <div>C- (45-49): 1.75</div>
                    <div>D (40-44): 1.0</div>
                    <div>F (&lt;40): 0.0</div>
                  </div>
                </div>
                <div className="md:text-right">
                  {cgpaData?.cgpa !== null && (
                    <div>
                      <div className="font-semibold">Cumulative GPA</div>
                      <div className="text-lg font-extrabold text-green-700">{cgpaData.cgpa?.toFixed(2)}</div>
                    </div>
                  )}
                  <div className="mt-2 text-gray-600">Generated: {new Date().toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">{activeSemesterName}</h2>
                {activeAcademicYear && (
                  <p className="text-sm text-gray-500">{activeAcademicYear}</p>
                )}
              </div>
              {currentResults.gpa !== null && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{currentResults.gpa.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Semester GPA</div>
                </div>
              )}
            </div>

            {currentResults.courses?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Course</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Credits</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Quiz</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Midterm</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Final</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Attendance</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Total</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Grade</th>
                      <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.courses.map(course => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900 dark:text-white">{course.course?.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{course.course?.code} | {course.sectionCode}</div>
                        </td>
                        <td className="p-3 text-center">{course.creditHours}</td>
                        <td className="p-3 text-center">
                          {course.grade?.isPublished ? (course.grade?.quizScore ?? '-') : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {course.grade?.isPublished ? (course.grade?.midtermScore ?? '-') : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {course.grade?.isPublished ? (course.grade?.finalScore ?? '-') : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {course.grade?.isPublished ? (course.grade?.attendanceScore ?? '-') : '-'}
                        </td>
                        <td className="p-3 text-center font-medium">
                          {course.grade?.isPublished ? (course.grade?.totalScore ?? '-') : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {course.grade?.isPublished && course.grade?.gradeLetter ? (
                            <span className={`px-2 py-1 rounded text-white ${
                              course.grade.gradeLetter.startsWith('A') ? 'bg-green-600' :
                              course.grade.gradeLetter.startsWith('B') ? 'bg-blue-600' :
                              course.grade.gradeLetter.startsWith('C') ? 'bg-yellow-600' :
                              course.grade.gradeLetter === 'D' ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}>
                              {course.grade.gradeLetter}
                            </span>
                          ) : course.grade?.isSubmitted ? (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Pending</span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {course.grade?.isPublished ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Published</span>
                          ) : course.grade?.isSubmitted ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Submitted</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Not Graded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No courses found for this semester.</p>
            )}
          </div>
        )
      )}

      {/* My Enrollments */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">My Course Enrollments</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map(enrollment => (
            <div key={enrollment.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-700">
              <div className="font-medium text-gray-900 dark:text-white">{enrollment.courseSection?.course?.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {enrollment.courseSection?.course?.code} | {enrollment.courseSection?.sectionCode}
              </div>
              <div className="text-sm text-gray-500">
                {enrollment.courseSection?.semester?.name}
              </div>
              <div className="text-sm text-gray-500">
                Teacher: {enrollment.courseSection?.teacher?.fullName}
              </div>
              {enrollment.grade?.isPublished && (
                <div className="mt-2 flex justify-between items-center">
                  <span className={`px-2 py-1 rounded text-white text-sm ${
                    enrollment.grade.gradeLetter?.startsWith('A') ? 'bg-green-600' :
                    enrollment.grade.gradeLetter?.startsWith('B') ? 'bg-blue-600' :
                    enrollment.grade.gradeLetter?.startsWith('C') ? 'bg-yellow-600' :
                    enrollment.grade.gradeLetter === 'D' ? 'bg-orange-600' :
                    'bg-red-600'
                  }`}>
                    {enrollment.grade.gradeLetter}
                  </span>
                  <span className="text-sm">{enrollment.grade.totalScore}/100</span>
                </div>
              )}
            </div>
          ))}
          {enrollments.length === 0 && (
            <p className="text-gray-500 col-span-full">No course enrollments found.</p>
          )}
        </div>
      </div>

      {/* Graduation Status & Certificate */}
      {graduationStatus && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Graduation Status
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className={`p-4 rounded-lg border ${graduationStatus.creditHoursMet ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-sm text-gray-500">Credit Hours</div>
              <div className="text-xl font-bold">{graduationStatus.totalCreditHours} / {graduationStatus.minCreditHoursRequired}</div>
              <div className="flex items-center gap-1 mt-1">
                {graduationStatus.creditHoursMet ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span className={`text-sm ${graduationStatus.creditHoursMet ? 'text-green-600' : 'text-red-600'}`}>
                  {graduationStatus.creditHoursMet ? 'Requirement met' : 'Not yet met'}
                </span>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${graduationStatus.gradeMet ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-sm text-gray-500">CGPA</div>
              <div className="text-xl font-bold">{graduationStatus.cgpa?.toFixed(2)} / {graduationStatus.minGradeRequired?.toFixed(1)}</div>
              <div className="flex items-center gap-1 mt-1">
                {graduationStatus.gradeMet ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span className={`text-sm ${graduationStatus.gradeMet ? 'text-green-600' : 'text-red-600'}`}>
                  {graduationStatus.gradeMet ? 'Requirement met' : 'Not yet met'}
                </span>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${graduationStatus.eligible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="text-sm text-gray-500">Overall Status</div>
              <div className="text-xl font-bold">{graduationStatus.eligible ? 'Eligible' : 'In Progress'}</div>
              <div className="flex items-center gap-1 mt-1">
                {graduationStatus.eligible ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-yellow-600" />}
                <span className={`text-sm ${graduationStatus.eligible ? 'text-green-600' : 'text-yellow-600'}`}>
                  {graduationStatus.eligible ? 'Ready for certificate' : 'Keep going!'}
                </span>
              </div>
            </div>
          </div>
          {graduationStatus.department && (
            <p className="text-sm text-gray-500">Department: {graduationStatus.department.name} ({graduationStatus.department.code})</p>
          )}
          {graduationStatus.eligible && graduationStatus.certificate && (
            <div className="mt-4">
              <Link
                to={`/certificates/${graduationStatus.certificate.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                <Award className="w-4 h-4" />
                View Your Certificate
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            My Certificates
          </h2>
          <div className="space-y-4">
            {certificates.map(cert => (
              <div key={cert.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-green-800">{cert.department?.name || 'Certificate'}</div>
                    <div className="text-sm text-green-600">Certificate #: {cert.certificateNumber}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      CGPA: {cert.cgpa?.toFixed(2)} | Credit Hours: {cert.totalCreditHours}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/certificates/${cert.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Certificate
                    </Link>
                  </div>
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
