import { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../api.js';
import Layout from '../components/Layout';
import { useToast } from '../ToastContext';
import { useConfirm } from '../ConfirmContext';
import { Building2, Edit2, Trash2, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminDepartmentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', code: '', description: '',
    pricePerCreditHour: '', totalCreditHours: '',
    minCreditHoursToGraduate: '', durationYears: '4',
  });

  useEffect(() => { loadDepts(); }, []);

  async function loadDepts() {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: '', code: '', description: '', pricePerCreditHour: '', totalCreditHours: '', minCreditHoursToGraduate: '', durationYears: '4' });
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(dept) {
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      pricePerCreditHour: dept.pricePerCreditHour.toString(),
      totalCreditHours: dept.totalCreditHours.toString(),
      minCreditHoursToGraduate: dept.minCreditHoursToGraduate.toString(),
      durationYears: dept.durationYears.toString(),
    });
    setEditing(dept);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        pricePerCreditHour: parseFloat(form.pricePerCreditHour),
        totalCreditHours: parseInt(form.totalCreditHours),
        minCreditHoursToGraduate: parseInt(form.minCreditHoursToGraduate),
        durationYears: parseInt(form.durationYears),
        description: form.description || null,
      };

      if (editing) {
        const updated = await updateDepartment(editing.id, payload);
        setDepartments(departments.map(d => d.id === updated.id ? updated : d));
        toast.success(t('admin.departmentUpdated'));
      } else {
        const created = await createDepartment(payload);
        setDepartments([...departments, created]);
        toast.success(t('admin.departmentCreated'));
      }
      resetForm();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(dept) {
    const ok = await confirm({
      title: t('admin.deleteDepartment'),
      message: `${t('admin.deleteDepartmentConfirm', { name: dept.name })}`,
      confirmText: t('common.delete'),
      type: 'danger',
    });
    if (!ok) return;
    try {
      await deleteDepartment(dept.id);
      setDepartments(departments.filter(d => d.id !== dept.id));
      toast.success(t('admin.departmentDeleted'));
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Layout><div className="p-8">{t('common.loading')}</div></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('nav.departments')}</h1>
            <p className="text-gray-500 text-sm">{t('admin.manageDepartments')}</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t('admin.addDepartment')}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{editing ? t('admin.editDepartment') : t('admin.newDepartment')}</h2>
                <button onClick={resetForm}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('admin.departmentName')} *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., Computer Science" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('admin.code')} *</label>
                  <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., CS" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('common.description')}</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('admin.pricePerCreditHour')} *</label>
                    <input type="number" step="0.01" min="0" required value={form.pricePerCreditHour}
                      onChange={e => setForm({ ...form, pricePerCreditHour: e.target.value })}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('admin.durationYears')} *</label>
                    <input type="number" min="1" max="8" required value={form.durationYears}
                      onChange={e => setForm({ ...form, durationYears: e.target.value })}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('admin.totalCreditHours')} *</label>
                    <input type="number" min="1" required value={form.totalCreditHours}
                      onChange={e => setForm({ ...form, totalCreditHours: e.target.value })}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('admin.minCreditHoursGraduate')} *</label>
                    <input type="number" min="1" required value={form.minCreditHoursToGraduate}
                      onChange={e => setForm({ ...form, minCreditHoursToGraduate: e.target.value })}
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3 text-sm">
                  <strong>{t('admin.totalProgramFee')}:</strong> ETB {((parseFloat(form.pricePerCreditHour) || 0) * (parseInt(form.totalCreditHours) || 0)).toLocaleString()}
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={resetForm} className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    {editing ? t('questionReports.update') : t('admin.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Department List */}
        {departments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('admin.noDepartmentsYet')}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {departments.map(dept => (
              <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{dept.name}</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{dept.code}</span>
                    {dept.description && <p className="text-sm text-gray-500 mt-1">{dept.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(dept)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button onClick={() => handleDelete(dept)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded p-2">
                    <div className="text-green-600 dark:text-green-400 text-xs font-medium">{t('admin.priceCreditHour')}</div>
                    <div className="font-semibold">ETB {dept.pricePerCreditHour?.toLocaleString()}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                    <div className="text-blue-600 dark:text-blue-400 text-xs font-medium">{t('admin.totalCreditHours')}</div>
                    <div className="font-semibold">{dept.totalCreditHours}</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2">
                    <div className="text-yellow-600 dark:text-yellow-400 text-xs font-medium">{t('admin.minToGraduate')}</div>
                    <div className="font-semibold">{dept.minCreditHoursToGraduate} CH</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded p-2">
                    <div className="text-purple-600 dark:text-purple-400 text-xs font-medium">{t('admin.totalProgramFee')}</div>
                    <div className="font-semibold">ETB {(dept.pricePerCreditHour * dept.totalCreditHours)?.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {t('admin.duration')}: {dept.durationYears} {t('admin.years')} | {t('admin.classes')}: {dept._count?.classes || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
