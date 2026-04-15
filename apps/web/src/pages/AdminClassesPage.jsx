import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';
import { getClasses, createClass, updateClass, deleteClass, getUsers, addStudentToClass, addTeacherToClass, removeStudentFromClass, removeTeacherFromClass, getCourses, assignCourseToClass, removeCourseFromClass } from '../api';
import Layout from '../components/Layout';
import { 
  Plus, 
  Users, 
  UserPlus, 
  BookOpen, 
  MoreVertical,
  X,
  Trash2,
  Edit,
  GraduationCap,
  UserCircle,
  ChevronRight
} from 'lucide-react';

export default function AdminClassesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClass, setNewClass] = useState({ name: '', code: '', year: '', section: '' });
  const [editingClass, setEditingClass] = useState(null);
  const [addModal, setAddModal] = useState({ type: null, classId: null });

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    Promise.all([getClasses(), getUsers(), getCourses()])
      .then(([classesData, usersData, coursesData]) => {
        setClasses(classesData);
        setUsers(usersData);
        setCourses(coursesData);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const students = users.filter(u => u.role === 'STUDENT');
  const teachers = users.filter(u => u.role === 'TEACHER');

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const created = await createClass({
        name: newClass.name,
        code: newClass.code,
        year: newClass.year ? parseInt(newClass.year) : undefined,
        section: newClass.section || undefined,
      });
      setClasses([created, ...classes]);
      setShowCreateModal(false);
      setNewClass({ name: '', code: '', year: '', section: '' });
      toast.success('Class created!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateClass(editingClass.id, {
        name: editingClass.name,
        code: editingClass.code,
        year: editingClass.year ? parseInt(editingClass.year) : null,
        section: editingClass.section || null,
      });
      setClasses(classes.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setEditingClass(null);
      toast.success('Class updated!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteClass = async (classId) => {
    const confirmed = await confirm({
      title: 'Delete Class',
      message: 'Are you sure you want to delete this class? This will remove all students, teachers, and course assignments.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteClass(classId);
      setClasses(classes.filter(c => c.id !== classId));
      toast.success('Class deleted!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddStudent = async (studentId) => {
    try {
      const result = await addStudentToClass(addModal.classId, studentId);
      setClasses(classes.map(c => 
        c.id === addModal.classId 
          ? { ...c, students: [...c.students, result] }
          : c
      ));
      toast.success('Student added to class!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveStudent = async (classId, studentId) => {
    const confirmed = await confirm({
      title: 'Remove Student',
      message: 'Remove this student from class?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeStudentFromClass(classId, studentId);
      setClasses(classes.map(c => 
        c.id === classId 
          ? { ...c, students: c.students.filter(s => s.studentId !== studentId) }
          : c
      ));
      toast.success('Student removed from class!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddTeacher = async (teacherId) => {
    try {
      const result = await addTeacherToClass(addModal.classId, teacherId);
      setClasses(classes.map(c => 
        c.id === addModal.classId 
          ? { ...c, teachers: [...c.teachers, result] }
          : c
      ));
      toast.success('Teacher added to class!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveTeacher = async (classId, teacherId) => {
    const confirmed = await confirm({
      title: 'Remove Teacher',
      message: 'Remove this teacher from class?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeTeacherFromClass(classId, teacherId);
      setClasses(classes.map(c => 
        c.id === classId 
          ? { ...c, teachers: c.teachers.filter(t => t.teacherId !== teacherId) }
          : c
      ));
      toast.success('Teacher removed from class!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssignCourse = async (courseId, teacherId) => {
    try {
      const result = await assignCourseToClass(addModal.classId, courseId, teacherId);
      setClasses(classes.map(c => 
        c.id === addModal.classId 
          ? { ...c, courses: [...c.courses, result] }
          : c
      ));
      toast.success('Course assigned to class!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveCourse = async (classId, courseId) => {
    const confirmed = await confirm({
      title: 'Remove Course',
      message: 'Remove this course from class?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeCourseFromClass(classId, courseId);
      setClasses(classes.map(c => 
        c.id === classId 
          ? { ...c, courses: c.courses.filter(c => c.courseId !== courseId) }
          : c
      ));
      toast.success('Course removed from class!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (user?.role !== 'ADMIN') return <div className="p-8 text-center">Access denied</div>;
  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-500 mt-1">Manage classes, students, and teachers</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Class
          </button>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-500 mb-4">Create your first class to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Class
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded">
                        {cls.year ? `Year ${cls.year}` : 'No Year'}
                      </span>
                      <button
                        onClick={() => setEditingClass(cls)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary-600"
                        title="Edit class"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                        title="Delete class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Students */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Students ({cls.students?.length || 0})</span>
                      <button
                        onClick={() => setAddModal({ type: 'student', classId: cls.id })}
                        className="p-1 hover:bg-gray-100 rounded text-primary-600"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cls.students?.slice(0, 3).map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {s.student.fullName}
                          <button onClick={() => handleRemoveStudent(cls.id, s.studentId)} className="hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {cls.students?.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                          +{cls.students.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teachers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Teachers ({cls.teachers?.length || 0})</span>
                      <button
                        onClick={() => setAddModal({ type: 'teacher', classId: cls.id })}
                        className="p-1 hover:bg-gray-100 rounded text-primary-600"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cls.teachers?.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {t.teacher.fullName}
                          <button onClick={() => handleRemoveTeacher(cls.id, t.teacherId)} className="hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Courses */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Courses ({cls.courses?.length || 0})</span>
                      <button
                        onClick={() => setAddModal({ type: 'course', classId: cls.id })}
                        className="p-1 hover:bg-gray-100 rounded text-primary-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {cls.courses?.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-green-50 rounded text-xs">
                          <div>
                            <span className="font-medium text-green-800">{c.course.title}</span>
                            {c.teacher && <span className="text-green-600 ml-1">({c.teacher.fullName})</span>}
                          </div>
                          <button onClick={() => handleRemoveCourse(cls.id, c.courseId)} className="text-red-500 hover:text-red-700">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Class</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Computer Science 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Code</label>
                <input
                  type="text"
                  value={newClass.code}
                  onChange={(e) => setNewClass({ ...newClass, code: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., CS2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={newClass.year}
                    onChange={(e) => setNewClass({ ...newClass, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., A"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Class</h2>
              <button onClick={() => setEditingClass(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input
                  type="text"
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Code</label>
                <input
                  type="text"
                  value={editingClass.code}
                  onChange={(e) => setEditingClass({ ...editingClass, code: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={editingClass.year || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={editingClass.section || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, section: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-medium rounded-lg"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student/Teacher Modal */}
      {addModal.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Add {addModal.type === 'student' ? 'Student' : addModal.type === 'teacher' ? 'Teacher' : 'Course'}
              </h2>
              <button onClick={() => setAddModal({ type: null, classId: null })} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addModal.type === 'student' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { handleAddStudent(s.id); setAddModal({ type: null, classId: null }); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold">{s.fullName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{s.fullName}</p>
                      <p className="text-sm text-gray-500">{s.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {addModal.type === 'teacher' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {teachers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { handleAddTeacher(t.id); setAddModal({ type: null, classId: null }); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-semibold">{t.fullName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t.fullName}</p>
                      <p className="text-sm text-gray-500">{t.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {addModal.type === 'course' && (
              <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {courses.map((c) => (
                    <div key={c.id} className="p-3 border border-gray-200 rounded-lg">
                      <p className="font-medium text-gray-900">{c.title}</p>
                      <p className="text-sm text-gray-500">{c.code}</p>
                      <select
                        className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignCourse(c.id, e.target.value);
                            setAddModal({ type: null, classId: null });
                          }
                        }}
                      >
                        <option value="">Select Teacher (optional)</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.fullName}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { handleAssignCourse(c.id, null); setAddModal({ type: null, classId: null }); }}
                        className="mt-2 w-full py-2 bg-primary-900 hover:bg-primary-800 text-white text-sm font-medium rounded-lg"
                      >
                        Assign without teacher
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
