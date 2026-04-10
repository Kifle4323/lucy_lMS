import { useState, useEffect } from 'react';
import {
  getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear,
  getSemesters, createSemester, updateSemester, deleteSemester, publishSemesterGrades,
  getCourses, getUsers
} from '../api.js';

export default function AdminAcademicPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activeTab, setActiveTab] = useState('years');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '' });
  const [semesterForm, setSemesterForm] = useState({
    academicYearId: '', type: 'FALL', name: '', startDate: '', endDate: '',
    registrationStart: '', registrationEnd: '', examPeriodStart: '', examPeriodEnd: '', gradingDeadline: ''
  });
  const [editingYear, setEditingYear] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [yearsData, semestersData, coursesData, usersData] = await Promise.all([
        getAcademicYears(),
        getSemesters(),
        getCourses(),
        getUsers()
      ]);
      setAcademicYears(yearsData);
      setSemesters(semestersData);
      setCourses(coursesData);
      setTeachers(usersData.filter(u => u.role === 'TEACHER'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Academic Year handlers
  async function handleCreateYear(e) {
    e.preventDefault();
    try {
      const newYear = await createAcademicYear(yearForm);
      setAcademicYears([...academicYears, newYear]);
      setYearForm({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateYear(e) {
    e.preventDefault();
    try {
      const updated = await updateAcademicYear(editingYear.id, yearForm);
      setAcademicYears(academicYears.map(y => y.id === updated.id ? updated : y));
      setEditingYear(null);
      setYearForm({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteYear(id) {
    if (!confirm('Delete this academic year?')) return;
    try {
      await deleteAcademicYear(id);
      setAcademicYears(academicYears.filter(y => y.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditYear(year) {
    setEditingYear(year);
    setYearForm({
      name: year.name,
      startDate: year.startDate.split('T')[0],
      endDate: year.endDate.split('T')[0]
    });
  }

  // Semester handlers
  async function handleCreateSemester(e) {
    e.preventDefault();
    try {
      const newSem = await createSemester(semesterForm);
      setSemesters([...semesters, newSem]);
      setSemesterForm({
        academicYearId: '', type: 'FALL', name: '', startDate: '', endDate: '',
        registrationStart: '', registrationEnd: '', examPeriodStart: '', examPeriodEnd: '', gradingDeadline: ''
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateSemester(e) {
    e.preventDefault();
    try {
      const updated = await updateSemester(editingSemester.id, semesterForm);
      setSemesters(semesters.map(s => s.id === updated.id ? updated : s));
      setEditingSemester(null);
      setSemesterForm({
        academicYearId: '', type: 'FALL', name: '', startDate: '', endDate: '',
        registrationStart: '', registrationEnd: '', examPeriodStart: '', examPeriodEnd: '', gradingDeadline: ''
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSemester(id) {
    if (!confirm('Delete this semester?')) return;
    try {
      await deleteSemester(id);
      setSemesters(semesters.filter(s => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePublishGrades(semesterId) {
    if (!confirm('Publish all submitted grades for this semester?')) return;
    try {
      await publishSemesterGrades(semesterId);
      alert('Grades published successfully!');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditSemester(sem) {
    setEditingSemester(sem);
    setSemesterForm({
      academicYearId: sem.academicYearId,
      type: sem.type,
      name: sem.name,
      startDate: sem.startDate.split('T')[0],
      endDate: sem.endDate.split('T')[0],
      registrationStart: sem.registrationStart?.split('T')[0] || '',
      registrationEnd: sem.registrationEnd?.split('T')[0] || '',
      examPeriodStart: sem.examPeriodStart?.split('T')[0] || '',
      examPeriodEnd: sem.examPeriodEnd?.split('T')[0] || '',
      gradingDeadline: sem.gradingDeadline?.split('T')[0] || ''
    });
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Academic Management</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('years')}
          className={`pb-2 px-4 ${activeTab === 'years' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Academic Years
        </button>
        <button
          onClick={() => setActiveTab('semesters')}
          className={`pb-2 px-4 ${activeTab === 'semesters' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Semesters
        </button>
      </div>

      {/* Academic Years Tab */}
      {activeTab === 'years' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
            </h2>
            <form onSubmit={editingYear ? handleUpdateYear : handleCreateYear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name (e.g., 2024-2025)</label>
                <input
                  type="text"
                  value={yearForm.name}
                  onChange={e => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={yearForm.startDate}
                  onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={yearForm.endDate}
                  onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editingYear ? 'Update' : 'Create'}
                </button>
                {editingYear && (
                  <button type="button" onClick={() => { setEditingYear(null); setYearForm({ name: '', startDate: '', endDate: '' }); }} className="px-4 py-2 border rounded">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Academic Years</h2>
            <div className="space-y-3">
              {academicYears.map(year => (
                <div key={year.id} className="border rounded p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{year.name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                    </div>
                    {year.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditYear(year)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteYear(year.id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
              {academicYears.length === 0 && <p className="text-gray-500">No academic years yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Semesters Tab */}
      {activeTab === 'semesters' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingSemester ? 'Edit Semester' : 'Create Semester'}
            </h2>
            <form onSubmit={editingSemester ? handleUpdateSemester : handleCreateSemester} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Academic Year</label>
                  <select
                    value={semesterForm.academicYearId}
                    onChange={e => setSemesterForm({ ...semesterForm, academicYearId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select Year</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={semesterForm.type}
                    onChange={e => setSemesterForm({ ...semesterForm, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="FALL">Fall</option>
                    <option value="SPRING">Spring</option>
                    <option value="SUMMER">Summer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name (e.g., Fall 2024)</label>
                <input
                  type="text"
                  value={semesterForm.name}
                  onChange={e => setSemesterForm({ ...semesterForm, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={semesterForm.startDate}
                    onChange={e => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={semesterForm.endDate}
                    onChange={e => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Registration Start</label>
                  <input
                    type="date"
                    value={semesterForm.registrationStart}
                    onChange={e => setSemesterForm({ ...semesterForm, registrationStart: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Registration End</label>
                  <input
                    type="date"
                    value={semesterForm.registrationEnd}
                    onChange={e => setSemesterForm({ ...semesterForm, registrationEnd: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Exam Period Start</label>
                  <input
                    type="date"
                    value={semesterForm.examPeriodStart}
                    onChange={e => setSemesterForm({ ...semesterForm, examPeriodStart: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exam Period End</label>
                  <input
                    type="date"
                    value={semesterForm.examPeriodEnd}
                    onChange={e => setSemesterForm({ ...semesterForm, examPeriodEnd: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                <div className="font-medium text-yellow-800 mb-1">Exam Period includes:</div>
                <div className="flex gap-3 text-yellow-700">
                  <span>Midterm Exam</span>
                  <span>Final Exam</span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  Teachers will schedule their Midterm and Final exams within this period. Students will be notified.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grading Deadline</label>
                <input
                  type="date"
                  value={semesterForm.gradingDeadline}
                  onChange={e => setSemesterForm({ ...semesterForm, gradingDeadline: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editingSemester ? 'Update' : 'Create'}
                </button>
                {editingSemester && (
                  <button type="button" onClick={() => { setEditingSemester(null); setSemesterForm({ academicYearId: '', type: 'FALL', name: '', startDate: '', endDate: '', registrationStart: '', registrationEnd: '', examPeriodStart: '', examPeriodEnd: '', gradingDeadline: '' }); }} className="px-4 py-2 border rounded">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Semesters</h2>
            <div className="space-y-4">
              {semesters.map(sem => (
                <div key={sem.id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{sem.name}</div>
                      <div className="text-sm text-gray-500">
                        {sem.academicYear?.name} | {sem.type}
                      </div>

                      {/* Timeline */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-blue-50 rounded p-2">
                          <div className="text-xs text-blue-600 font-medium">Semester Period</div>
                          <div className="text-gray-700">
                            {new Date(sem.startDate).toLocaleDateString()} - {new Date(sem.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="text-xs text-green-600 font-medium">Registration</div>
                          <div className="text-gray-700">
                            {sem.registrationStart && sem.registrationEnd
                              ? `${new Date(sem.registrationStart).toLocaleDateString()} - ${new Date(sem.registrationEnd).toLocaleDateString()}`
                              : 'Not set'}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded p-2">
                          <div className="text-xs text-red-600 font-medium">Exam Period</div>
                          <div className="text-gray-700">
                            {sem.examPeriodStart && sem.examPeriodEnd
                              ? `${new Date(sem.examPeriodStart).toLocaleDateString()} - ${new Date(sem.examPeriodEnd).toLocaleDateString()}`
                              : 'Not set'}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded p-2">
                          <div className="text-xs text-purple-600 font-medium">Grading Deadline</div>
                          <div className="text-gray-700">
                            {sem.gradingDeadline
                              ? new Date(sem.gradingDeadline).toLocaleDateString()
                              : 'Not set'}
                          </div>
                        </div>
                      </div>

                      {/* Exam Types Reminder */}
                      {sem.examPeriodStart && sem.examPeriodEnd && (
                        <div className="mt-3 flex gap-2">
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Midterm Exam
                          </span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Final Exam
                          </span>
                          <span className="text-xs text-gray-500">
                            Teachers will schedule these within the exam period
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded ${
                          sem.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                          sem.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' :
                          sem.status === 'REGISTRATION_OPEN' ? 'bg-blue-100 text-blue-700' :
                          sem.status === 'GRADING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {sem.status.replace('_', ' ')}
                        </span>
                        {sem.isCurrent && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Current</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditSemester(sem)} className="text-blue-600 hover:underline text-sm">Edit</button>
                      <button onClick={() => handleDeleteSemester(sem.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                    </div>
                  </div>
                  {sem.status === 'GRADING' && (
                    <button
                      onClick={() => handlePublishGrades(sem.id)}
                      className="mt-3 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Publish Grades
                    </button>
                  )}
                </div>
              ))}
              {semesters.length === 0 && <p className="text-gray-500">No semesters yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
