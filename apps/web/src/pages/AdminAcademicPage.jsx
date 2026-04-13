import { useState, useEffect } from 'react';
import {
  getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear,
  getSemesters, createSemester, updateSemester, deleteSemester, publishSemesterGrades,
  getCourses, getUsers, getCourseSections, createCourseSection, updateCourseSection, deleteCourseSection,
  getClasses
} from '../api.js';
import Layout from '../components/Layout';

export default function AdminAcademicPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courseSections, setCourseSections] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [activeTab, setActiveTab] = useState('years');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '' });
  const [semesterForm, setSemesterForm] = useState({
    academicYearId: '', type: 'FALL', name: '', startDate: '', endDate: '',
    registrationStart: '', registrationEnd: '', addDropStart: '', addDropEnd: '',
    midtermExamDate: '', finalExamDate: '', gradingDeadline: ''
  });
  const [courseSectionRows, setCourseSectionRows] = useState([
    { courseId: '', teacherId: '', classId: '', sectionCode: '' }
  ]);
  const [editingYear, setEditingYear] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingCourseSection, setEditingCourseSection] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [yearsData, semestersData, coursesData, usersData, classesData] = await Promise.all([
        getAcademicYears(),
        getSemesters(),
        getCourses(),
        getUsers(),
        getClasses()
      ]);
      setAcademicYears(yearsData);
      setSemesters(semestersData);
      setCourses(coursesData);
      setTeachers(usersData.filter(u => u.role === 'TEACHER'));
      setClasses(classesData);
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
        registrationStart: '', registrationEnd: '', addDropStart: '', addDropEnd: '',
        midtermExamDate: '', finalExamDate: '', gradingDeadline: ''
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
        registrationStart: '', registrationEnd: '', addDropStart: '', addDropEnd: '',
        midtermExamDate: '', finalExamDate: '', gradingDeadline: ''
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

  async function handleChangeSemesterStatus(semesterId, newStatus) {
    const statusLabels = {
      'REGISTRATION_OPEN': 'open registration',
      'IN_PROGRESS': 'start the semester',
      'GRADING': 'start grading period',
      'COMPLETED': 'complete the semester'
    };
    if (!confirm(`Are you sure you want to ${statusLabels[newStatus]}?`)) return;
    try {
      await updateSemester(semesterId, { status: newStatus });
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
      addDropStart: sem.addDropStart?.split('T')[0] || '',
      addDropEnd: sem.addDropEnd?.split('T')[0] || '',
      midtermExamDate: sem.midtermExamDate?.split('T')[0] || '',
      finalExamDate: sem.finalExamDate?.split('T')[0] || '',
      gradingDeadline: sem.gradingDeadline?.split('T')[0] || ''
    });
  }

  // Course Section handlers
  async function loadCourseSections(semesterId) {
    setSelectedSemester(semesterId);
    try {
      const data = await getCourseSections(semesterId);
      setCourseSections(data);
    } catch (err) {
      setError(err.message);
    }
  }

  function addCourseSectionRow() {
    setCourseSectionRows([...courseSectionRows, { courseId: '', teacherId: '', classId: '', sectionCode: '' }]);
  }

  function removeCourseSectionRow(index) {
    if (courseSectionRows.length > 1) {
      setCourseSectionRows(courseSectionRows.filter((_, i) => i !== index));
    }
  }

  function updateCourseSectionRow(index, field, value) {
    const updated = [...courseSectionRows];
    updated[index][field] = value;
    setCourseSectionRows(updated);
  }

  async function handleCreateCourseSections(e) {
    e.preventDefault();
    try {
      // Create all course sections
      const createdSections = [];
      for (const row of courseSectionRows) {
        if (!row.courseId || !row.teacherId || !row.sectionCode) continue;

        const data = {
          courseId: row.courseId,
          semesterId: selectedSemester,
          teacherId: row.teacherId,
          classId: row.classId || null,
          sectionCode: row.sectionCode
        };
        const newSection = await createCourseSection(data);
        createdSections.push(newSection);
      }

      setCourseSections([...courseSections, ...createdSections]);
      setCourseSectionRows([{ courseId: '', teacherId: '', classId: '', sectionCode: '' }]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateCourseSection(e) {
    e.preventDefault();
    try {
      const updated = await updateCourseSection(editingCourseSection.id, {
        teacherId: editingCourseSection.teacherId,
        classId: editingCourseSection.classId || null,
        sectionCode: editingCourseSection.sectionCode,
        schedule: editingCourseSection.schedule,
        room: editingCourseSection.room
      });
      setCourseSections(courseSections.map(s => s.id === updated.id ? updated : s));
      setEditingCourseSection(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteCourseSection(id) {
    if (!confirm('Delete this course section?')) return;
    try {
      await deleteCourseSection(id);
      setCourseSections(courseSections.filter(s => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditCourseSection(section) {
    setEditingCourseSection(section);
    setCourseSectionForm({
      courseId: section.courseId,
      semesterId: section.semesterId,
      teacherId: section.teacherId,
      classId: section.classId || '',
      sectionCode: section.sectionCode || ''
    });
  }

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Academic Management</h1>

      {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded mb-4">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('years')}
          className={`pb-2 px-4 ${activeTab === 'years' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
        >
          Academic Years
        </button>
        <button
          onClick={() => setActiveTab('semesters')}
          className={`pb-2 px-4 ${activeTab === 'semesters' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
        >
          Semesters
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`pb-2 px-4 ${activeTab === 'sections' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
        >
          Course Sections
        </button>
      </div>

      {/* Academic Years Tab */}
      {activeTab === 'years' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
            </h2>
            <form onSubmit={editingYear ? handleUpdateYear : handleCreateYear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name (e.g., 2024-2025)</label>
                <input
                  type="text"
                  value={yearForm.name}
                  onChange={e => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
                <input
                  type="date"
                  value={yearForm.startDate}
                  onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
                <input
                  type="date"
                  value={yearForm.endDate}
                  onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editingYear ? 'Update' : 'Create'}
                </button>
                {editingYear && (
                  <button type="button" onClick={() => { setEditingYear(null); setYearForm({ name: '', startDate: '', endDate: '' }); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Academic Years</h2>
            <div className="space-y-3">
              {academicYears.map(year => (
                <div key={year.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{year.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                    </div>
                    {year.isActive && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">Active</span>}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingSemester ? 'Edit Semester' : 'Create Semester'}
            </h2>
            <form onSubmit={editingSemester ? handleUpdateSemester : handleCreateSemester} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Academic Year</label>
                  <select
                    value={semesterForm.academicYearId}
                    onChange={e => setSemesterForm({ ...semesterForm, academicYearId: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Year</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Type</label>
                  <select
                    value={semesterForm.type}
                    onChange={e => setSemesterForm({ ...semesterForm, type: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="FALL">Fall</option>
                    <option value="SPRING">Spring</option>
                    <option value="SUMMER">Summer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name (e.g., Fall 2024)</label>
                <input
                  type="text"
                  value={semesterForm.name}
                  onChange={e => setSemesterForm({ ...semesterForm, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    type="date"
                    value={semesterForm.startDate}
                    onChange={e => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    type="date"
                    value={semesterForm.endDate}
                    onChange={e => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Registration Start</label>
                  <input
                    type="date"
                    value={semesterForm.registrationStart}
                    onChange={e => setSemesterForm({ ...semesterForm, registrationStart: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Registration End</label>
                  <input
                    type="date"
                    value={semesterForm.registrationEnd}
                    onChange={e => setSemesterForm({ ...semesterForm, registrationEnd: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-300 mb-1">Add/Drop Period</div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Students can add courses they failed or drop courses during this period.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Add/Drop Start</label>
                  <input
                    type="date"
                    value={semesterForm.addDropStart}
                    onChange={e => setSemesterForm({ ...semesterForm, addDropStart: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Add/Drop End</label>
                  <input
                    type="date"
                    value={semesterForm.addDropEnd}
                    onChange={e => setSemesterForm({ ...semesterForm, addDropEnd: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Midterm Exam Date</label>
                  <input
                    type="date"
                    value={semesterForm.midtermExamDate}
                    onChange={e => setSemesterForm({ ...semesterForm, midtermExamDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Final Exam Date</label>
                  <input
                    type="date"
                    value={semesterForm.finalExamDate}
                    onChange={e => setSemesterForm({ ...semesterForm, finalExamDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm">
                <div className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Official Exam Dates</div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  These are the official Midterm and Final exam dates for all courses. Teachers can propose early exams if all students agree.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Grading Deadline</label>
                <input
                  type="date"
                  value={semesterForm.gradingDeadline}
                  onChange={e => setSemesterForm({ ...semesterForm, gradingDeadline: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editingSemester ? 'Update' : 'Create'}
                </button>
                {editingSemester && (
                  <button type="button" onClick={() => { setEditingSemester(null); setSemesterForm({ academicYearId: '', type: 'FALL', name: '', startDate: '', endDate: '', registrationStart: '', registrationEnd: '', addDropStart: '', addDropEnd: '', midtermExamDate: '', finalExamDate: '', gradingDeadline: '' }); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Semesters</h2>
            <div className="space-y-4">
              {semesters.map(sem => (
                <div key={sem.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-lg text-gray-900 dark:text-white">{sem.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {sem.academicYear?.name} | {sem.type}
                      </div>

                      {/* Timeline */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Semester Period</div>
                          <div className="text-gray-700 dark:text-gray-300">
                            {new Date(sem.startDate).toLocaleDateString()} - {new Date(sem.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded p-2">
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">Registration</div>
                          <div className="text-gray-700 dark:text-gray-300">
                            {sem.registrationStart && sem.registrationEnd
                              ? `${new Date(sem.registrationStart).toLocaleDateString()} - ${new Date(sem.registrationEnd).toLocaleDateString()}`
                              : 'Not set'}
                          </div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2">
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Midterm Exam</div>
                          <div className="text-gray-700 dark:text-gray-300">
                            {sem.midtermExamDate
                              ? new Date(sem.midtermExamDate).toLocaleDateString()
                              : 'Not set'}
                          </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 rounded p-2">
                          <div className="text-xs text-red-600 dark:text-red-400 font-medium">Final Exam</div>
                          <div className="text-gray-700 dark:text-gray-300">
                            {sem.finalExamDate
                              ? new Date(sem.finalExamDate).toLocaleDateString()
                              : 'Not set'}
                          </div>
                        </div>
                      </div>

                      {/* Grading Deadline */}
                      {sem.gradingDeadline && (
                        <div className="mt-2 text-sm text-purple-600 dark:text-purple-400">
                          Grading Deadline: {new Date(sem.gradingDeadline).toLocaleDateString()}
                        </div>
                      )}

                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded ${
                          sem.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300' :
                          sem.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          sem.status === 'REGISTRATION_OPEN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          sem.status === 'GRADING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                          {sem.status.replace('_', ' ')}
                        </span>
                        {sem.isCurrent && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded">Current</span>}
                      </div>

                      {/* Status Change Buttons */}
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {sem.status === 'UPCOMING' && (
                          <button
                            onClick={() => handleChangeSemesterStatus(sem.id, 'REGISTRATION_OPEN')}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Open Registration
                          </button>
                        )}
                        {sem.status === 'REGISTRATION_OPEN' && (
                          <button
                            onClick={() => handleChangeSemesterStatus(sem.id, 'IN_PROGRESS')}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          >
                            Start Semester
                          </button>
                        )}
                        {sem.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleChangeSemesterStatus(sem.id, 'GRADING')}
                            className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                          >
                            Start Grading
                          </button>
                        )}
                        {sem.status === 'GRADING' && (
                          <button
                            onClick={() => handlePublishGrades(sem.id)}
                            className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                          >
                            Publish & Complete
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditSemester(sem)} className="text-blue-600 hover:underline text-sm">Edit</button>
                      <button onClick={() => handleDeleteSemester(sem.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {semesters.length === 0 && <p className="text-gray-500 dark:text-gray-400">No semesters yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Course Sections Tab */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          {/* Semester Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Select Semester</h2>
            <select
              value={selectedSemester}
              onChange={e => loadCourseSections(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">-- Select a Semester --</option>
              {semesters.map(sem => (
                <option key={sem.id} value={sem.id}>
                  {sem.name} ({sem.academicYear?.name})
                </option>
              ))}
            </select>
          </div>

          {selectedSemester && (
            <div className="space-y-6">
              {/* Batch Course Section Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Course Sections</h2>
                  <button
                    type="button"
                    onClick={addCourseSectionRow}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    + Add Another Course
                  </button>
                </div>

                <form onSubmit={handleCreateCourseSections} className="space-y-4">
                  {/* Class selector for all courses */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Assign to Class (optional - applies to all courses)</label>
                    <select
                      value={courseSectionRows[0]?.classId || ''}
                      onChange={e => {
                        const updated = courseSectionRows.map(row => ({ ...row, classId: e.target.value }));
                        setCourseSectionRows(updated);
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">-- No Class (Individual Enrollment) --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}) - {c.year ? `Year ${c.year}` : ''} {c.section || ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All courses will be assigned to this class</p>
                  </div>

                  {/* Course rows */}
                  {courseSectionRows.map((row, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Course #{index + 1}</span>
                        {courseSectionRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCourseSectionRow(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Course</label>
                          <select
                            value={row.courseId}
                            onChange={e => updateCourseSectionRow(index, 'courseId', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          >
                            <option value="">-- Select --</option>
                            {courses.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.code} - {c.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Teacher</label>
                          <select
                            value={row.teacherId}
                            onChange={e => updateCourseSectionRow(index, 'teacherId', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          >
                            <option value="">-- Select --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Section Code</label>
                          <input
                            type="text"
                            value={row.sectionCode}
                            onChange={e => updateCourseSectionRow(index, 'sectionCode', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g., CS101-A"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                    >
                      Create All Course Sections
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseSectionRows([{ courseId: '', teacherId: '', classId: '', sectionCode: '' }])}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit Course Section Form */}
              {editingCourseSection && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-6 border border-yellow-200 dark:border-yellow-800">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Course Section</h2>
                  <form onSubmit={handleUpdateCourseSection} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Course</label>
                        <input
                          type="text"
                          value={editingCourseSection.course?.title || ''}
                          disabled
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Teacher</label>
                        <select
                          value={editingCourseSection.teacherId}
                          onChange={e => setEditingCourseSection({ ...editingCourseSection, teacherId: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.fullName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Section Code</label>
                        <input
                          type="text"
                          value={editingCourseSection.sectionCode || ''}
                          onChange={e => setEditingCourseSection({ ...editingCourseSection, sectionCode: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Class (optional)</label>
                        <select
                          value={editingCourseSection.classId || ''}
                          onChange={e => setEditingCourseSection({ ...editingCourseSection, classId: e.target.value || null })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">No Class</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Schedule</label>
                        <input
                          type="text"
                          value={editingCourseSection.schedule || ''}
                          onChange={e => setEditingCourseSection({ ...editingCourseSection, schedule: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="e.g., Mon/Wed 9:00-10:30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Room</label>
                        <input
                          type="text"
                          value={editingCourseSection.room || ''}
                          onChange={e => setEditingCourseSection({ ...editingCourseSection, room: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="e.g., Room 101"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCourseSection(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Course Sections List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Course Sections</h2>
                <div className="space-y-3">
                  {courseSections.map(section => (
                    <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{section.course?.code} - {section.course?.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Teacher: {section.teacher?.fullName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Section: {section.sectionCode}
                          </p>
                          {section.class && (
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              Class: {section.class.name} ({section.class.code})
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {section._count?.enrollments || 0} students enrolled
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditCourseSection(section)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCourseSection(section.id)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {courseSections.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No course sections added yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </Layout>
  );
}
