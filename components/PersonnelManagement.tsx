import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit, Calendar, DollarSign, UserCheck, AlertTriangle, Save, X, Phone, Mail, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { Employee, Attendance, SalaryPayment, CompanySettings } from '../types';
import Header from './Header';
import { dbService } from '../db';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency } from '../services/currencyService';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';

// Simple mock for t
const translate = (key: string, language: string) => {
    const translations: any = {
        'fr': {
            personnel: 'Personnel',
            addEmployee: 'Ajouter Employé',
            addAttendance: 'Ajouter Pointage',
            addPayment: 'Ajouter Paiement',
            pointage: 'Pointage',
            paiement: 'Paiements',
            search: 'Chercher...',
            name: 'Nom',
            role: 'Rôle',
            contact: 'Contact',
            salary: 'Salaire',
            actions: 'Actions',
            noData: 'Aucune donnée trouvée',
            save: 'Enregistrer',
            cancel: 'Annuler',
            firstName: 'Prénom',
            lastName: 'Nom',
            dailyRate: 'Tarif Journalier',
            monthlySalary: 'Salaire Mensuel',
            paymentType: 'Type de paiement',
            joinDate: 'Date d\'embauche',
            date: 'Date',
            status: 'Statut',
            present: 'Présent',
            absent: 'Absent',
            halfDay: 'Demi-journée',
            leave: 'Congé',
            amount: 'Montant',
            period: 'Période',
            note: 'Note',
            employee: 'Employé',
            selectEmployee: 'Sélectionner un employé',
            deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cet employé ?',
            deleteAttendanceConfirm: 'Êtes-vous sûr de vouloir supprimer ce pointage ?',
            deletePaymentConfirm: 'Êtes-vous sûr de vouloir supprimer ce paiement ?'
        },
        'ar': {
            personnel: 'الموظفين',
            addEmployee: 'إضافة موظف',
            addAttendance: 'تسجيل الحضور',
            addPayment: 'إضافة دفعة',
            pointage: 'تسجيل الحضور',
            paiement: 'المدفوعات',
            search: 'بحث...',
            name: 'الاسم',
            role: 'الدور',
            contact: 'اتصال',
            salary: 'الراتب',
            actions: 'إجراءات',
            noData: 'لا توجد بيانات',
            save: 'حفظ',
            cancel: 'إلغاء',
            firstName: 'الاسم الأول',
            lastName: 'الاسم العائلي',
            dailyRate: 'السعر اليومي',
            monthlySalary: 'الراتب الشهري',
            paymentType: 'نوع الدفع',
            joinDate: 'تاريخ الانضمام',
            date: 'التاريخ',
            status: 'الحالة',
            present: 'حاضر',
            absent: 'غائب',
            halfDay: 'نصف يوم',
            leave: 'إجازة',
            amount: 'المبلغ',
            period: 'الفترة',
            note: 'ملاحظة',
            employee: 'موظف',
            selectEmployee: 'اختر الموظف',
            deleteConfirm: 'هل أنت متأكد من حذف هذا الموظف؟',
            deleteAttendanceConfirm: 'هل أنت متأكد من حذف هذا الحضور؟',
            deletePaymentConfirm: 'هل أنت متأكد من حذف هذه الدفعة؟'
        }
    };
    return translations[language]?.[key] || translations['fr'][key] || key;
};

// Employee Form Component
interface EmployeeFormProps {
    employee?: Employee | null;
    onSave: (e: Employee) => void;
    onCancel: () => void;
    t: (key: string) => string;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSave, onCancel, t }) => {
    const [formData, setFormData] = useState<Partial<Employee>>(employee || {
        firstName: '', lastName: '', role: '', phone: '', email: '', 
        dailyRate: 0, monthlySalary: 0, paymentType: 'Monthly', 
        joinDate: new Date().toISOString().split('T')[0], isActive: true
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: employee?.id || crypto.randomUUID(),
        } as Employee);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-emerald-600" />
                        {employee ? t('edit') : t('addEmployee')}
                    </h2>
                    <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="employeeForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('firstName')} *</label>
                                <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('lastName')} *</label>
                                <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('role')} *</label>
                                <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('joinDate')} *</label>
                                <input required type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('paymentType')} *</label>
                                <select value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value as any})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                    <option value="Monthly">Mensuel</option>
                                    <option value="Daily">Journalier</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    {formData.paymentType === 'Monthly' ? t('monthlySalary') : t('dailyRate')} *
                                </label>
                                <input required type="number" step="1" min="0" value={formData.paymentType === 'Monthly' ? formData.monthlySalary : formData.dailyRate} onChange={e => {
                                    if (formData.paymentType === 'Monthly') setFormData({...formData, monthlySalary: parseFloat(e.target.value)});
                                    else setFormData({...formData, dailyRate: parseFloat(e.target.value)});
                                }} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        {t('cancel')}
                    </button>
                    <button form="employeeForm" type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                        {t('save')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Attendance Form Component
interface AttendanceFormProps {
    attendance?: Attendance | null;
    onSave: (a: Attendance | Attendance[]) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
    employeesList: Employee[];
    t: (key: string) => string;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ attendance, onSave, onCancel, onDelete, employeesList, t }) => {
    const [formData, setFormData] = useState<Partial<Attendance>>(attendance || {
        employeeId: employeesList.length > 0 ? employeesList[0].id : '',
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        note: ''
    });
    const [endDate, setEndDate] = useState(formData.date || new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!attendance && (formData.status === 'Absent' || formData.status === 'Leave') && formData.date && endDate && new Date(formData.date) <= new Date(endDate)) {
            // Generate range
            const records: Attendance[] = [];
            let current = new Date(formData.date);
            const end = new Date(endDate);
            while (current <= end) {
                records.push({
                    ...formData,
                    id: crypto.randomUUID(),
                    date: current.toISOString().split('T')[0]
                } as Attendance);
                current.setDate(current.getDate() + 1);
            }
            onSave(records);
        } else {
            onSave({
                ...formData,
                id: attendance?.id || crypto.randomUUID(),
            } as Attendance);
        }
    };

    const isRange = !attendance && (formData.status === 'Absent' || formData.status === 'Leave');

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-emerald-600" />
                        {attendance ? t('edit') : t('addAttendance')}
                    </h2>
                    <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="attendanceForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('employee')} *</label>
                            <select required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" disabled={!!attendance}>
                                <option value="" disabled>{t('selectEmployee')}</option>
                                {employeesList.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className={`grid ${isRange ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'} gap-4`}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('status')} *</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                    <option value="Present">{t('present')}</option>
                                    <option value="Absent">{t('absent')}</option>
                                    <option value="Half-day">{t('halfDay')}</option>
                                    <option value="Leave">{t('leave')}</option>
                                </select>
                            </div>
                            {isRange ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">De *</label>
                                        <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Jusqu'à *</label>
                                        <input required type="date" value={endDate} min={formData.date} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">{t('date')} *</label>
                                    <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('note')}</label>
                            <textarea value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} rows={3} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"></textarea>
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3 rounded-b-2xl">
                    {attendance && onDelete ? (
                        <button type="button" onClick={() => onDelete(attendance.id)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors rounded-lg flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            {t('delete')}
                        </button>
                    ) : (
                        <div></div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            {t('cancel')}
                        </button>
                        <button form="attendanceForm" type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                            {t('save')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Payment Form Component
interface PaymentFormProps {
    payment?: SalaryPayment | null;
    onSave: (p: SalaryPayment) => void;
    onCancel: () => void;
    employeesList: Employee[];
    t: (key: string) => string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ payment, onSave, onCancel, employeesList, t }) => {
    const [formData, setFormData] = useState<Partial<SalaryPayment>>(payment || {
        employeeId: employeesList.length > 0 ? employeesList[0].id : '',
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        status: 'Paid',
        type: 'Salary',
        note: ''
    });

    // When employee changes, update default amount
    useEffect(() => {
        if (!payment && formData.employeeId && formData.type === 'Salary') {
            const emp = employeesList.find(e => e.id === formData.employeeId);
            if (emp) {
                setFormData(prev => ({ ...prev, amount: emp.monthlySalary || 0 }));
            }
        }
    }, [formData.employeeId, formData.type, employeesList, payment]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: payment?.id || crypto.randomUUID(),
        } as SalaryPayment);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                        {payment ? t('edit') : 'Nouveau paiement'}
                    </h2>
                    <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="paymentForm" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('employee')} *</label>
                            <select required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                <option value="" disabled>{t('selectEmployee')}</option>
                                {employeesList.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Type de paiement *</label>
                                <select required value={formData.type as string} onChange={e => setFormData({...formData, type: e.target.value as any})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                    <option value="Salary">Salaire</option>
                                    <option value="Advance">Avance</option>
                                    <option value="Bonus">Prime / Bonus</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('amount')} *</label>
                                <input required type="number" step="0.01" min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Date de paiement *</label>
                            <input required type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Période du</label>
                                <input required type="date" value={formData.periodStart} onChange={e => setFormData({...formData, periodStart: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Période au</label>
                                <input required type="date" value={formData.periodEnd} onChange={e => setFormData({...formData, periodEnd: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Statut *</label>
                                <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                    <option value="Paid">Payé</option>
                                    <option value="Pending">En attente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Référence</label>
                                <input type="text" value={formData.reference || ''} onChange={e => setFormData({...formData, reference: e.target.value})} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">{t('note')}</label>
                            <textarea value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} rows={2} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"></textarea>
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        {t('cancel')}
                    </button>
                    <button form="paymentForm" type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                        {t('save')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

interface PersonnelManagementProps {
    companySettings?: CompanySettings | null;
    onAddExpense?: (expense: Omit<any, 'id'>) => Promise<void>;
    initialEmployees?: Employee[];
    initialAttendances?: Attendance[];
    initialPayments?: SalaryPayment[];
}

const PersonnelManagement: React.FC<PersonnelManagementProps> = ({ companySettings, onAddExpense, initialEmployees = [], initialAttendances = [], initialPayments = [] }) => {
    const { language, isRTL } = useLanguage();
    const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payments'>('employees');
    
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [attendances, setAttendances] = useState<Attendance[]>(initialAttendances);
    const [payments, setPayments] = useState<SalaryPayment[]>(initialPayments);

    useEffect(() => {
        setEmployees(initialEmployees);
        setAttendances(initialAttendances);
        setPayments(initialPayments);
    }, [initialEmployees, initialAttendances, initialPayments]);

    const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

    const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);
    const [attendanceToEdit, setAttendanceToEdit] = useState<Attendance | null>(null);
    const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
    const [attendanceToDelete, setAttendanceToDelete] = useState<string | null>(null);
    const [paymentToEdit, setPaymentToEdit] = useState<SalaryPayment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

    // Attendance Filters
    const [attendanceFilterEmployeeId, setAttendanceFilterEmployeeId] = useState<string>('all');
    const [attendanceFilterMonth, setAttendanceFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7));

    const filteredAttendances = attendances.filter(att => {
        const matchEmployee = attendanceFilterEmployeeId === 'all' || att.employeeId === attendanceFilterEmployeeId;
        const matchMonth = attendanceFilterMonth === 'all' || att.date.startsWith(attendanceFilterMonth);
        return matchEmployee && matchMonth;
    });

    const totalPresent = filteredAttendances.filter(a => a.status === 'Present').length;
    const totalAbsent = filteredAttendances.filter(a => a.status === 'Absent').length;
    const totalHalfDay = filteredAttendances.filter(a => a.status === 'Half-day').length;
    const totalLeave = filteredAttendances.filter(a => a.status === 'Leave').length;

    // Payment Filters
    const [paymentFilterEmployeeId, setPaymentFilterEmployeeId] = useState<string>('all');
    const [paymentFilterMonth, setPaymentFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7));

    const filteredPayments = payments.filter(pay => {
        const matchEmployee = paymentFilterEmployeeId === 'all' || pay.employeeId === paymentFilterEmployeeId;
        const matchMonth = paymentFilterMonth === 'all' || pay.paymentDate.startsWith(paymentFilterMonth);
        return matchEmployee && matchMonth;
    });

    const totalPaidAmount = filteredPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPendingAmount = filteredPayments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const loadData = async () => {
        try {
            const emps = await dbService.employees.getAll();
            const atts = await dbService.attendances.getAll();
            const pays = await dbService.salaryPayments.getAll();
            setEmployees(emps);
            setAttendances(atts);
            setPayments(pays);
        } catch (err) {
            console.error("Failed to load personnel data", err);
        }
    };

    const t = (key: string) => translate(key, language);

    // Employee Handlers
    const handleSaveEmployee = async (emp: Employee) => {
        try {
            if (employeeToEdit) {
                const updated = await dbService.employees.update(emp);
                setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e));
            } else {
                const added = await dbService.employees.add(emp);
                setEmployees(prev => [...prev, added]);
            }
            window.dispatchEvent(new CustomEvent('refreshAppData'));
            setIsAddEmployeeModalOpen(false);
            setEmployeeToEdit(null);
        } catch (err: any) {
            console.error("Failed to save employee", err);
            alert(err.message || t('Error saving employee'));
        }
    };

    const handleDeleteEmployee = (id: string) => {
        setEmployeeToDelete(id);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = async () => {
        try {
            if (employeeToDelete) {
                await dbService.employees.delete(employeeToDelete);
                setEmployees(prev => prev.filter(e => e.id !== employeeToDelete));
                window.dispatchEvent(new CustomEvent('refreshAppData'));
            } else if (attendanceToDelete) {
                await dbService.attendances.delete(attendanceToDelete);
                setAttendances(prev => prev.filter(a => a.id !== attendanceToDelete));
                window.dispatchEvent(new CustomEvent('refreshAppData'));
            } else if (paymentToDelete) {
                await dbService.salaryPayments.delete(paymentToDelete);
                setPayments(prev => prev.filter(p => p.id !== paymentToDelete));
                window.dispatchEvent(new CustomEvent('refreshAppData'));
            }
            // setIsConfirmOpen(false); // Modal now handles closing after await
        } catch (err: any) {
            console.error("Failed to delete", err);
            alert(err.message || 'Error occurred');
        }
    };

    // Attendance Handlers
    const handleSaveAttendance = async (attData: Attendance | Attendance[]) => {
        try {
            if (attendanceToEdit && !Array.isArray(attData)) {
                const updated = await dbService.attendances.update(attData);
                setAttendances(prev => prev.map(a => a.id === updated.id ? updated : a));
            } else if (Array.isArray(attData)) {
                await dbService.bulkAdd('attendances', attData);
                // For bulk add, reload is safer to ensure all records match DB exactly, 
                // but we can also merge them if they all have IDs
                setAttendances(prev => [...prev, ...attData]);
            } else {
                const added = await dbService.attendances.add(attData);
                setAttendances(prev => [...prev, added]);
            }
            window.dispatchEvent(new CustomEvent('refreshAppData'));
            setIsAddAttendanceModalOpen(false);
            setAttendanceToEdit(null);
        } catch (err: any) {
            console.error("Failed to save attendance", err);
            alert(err.message || t('Error saving attendance'));
        }
    };

    const handleDeleteAttendance = (id: string) => {
        setAttendanceToDelete(id);
        setIsConfirmOpen(true);
    };

    // Payment Handlers
    const handleSavePayment = async (pay: SalaryPayment) => {
        try {
            if (paymentToEdit) {
                const updated = await dbService.salaryPayments.update(pay);
                setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
            } else {
                const added = await dbService.salaryPayments.add(pay);
                setPayments(prev => [...prev, added]);
            }
            window.dispatchEvent(new CustomEvent('refreshAppData'));
            setIsAddPaymentModalOpen(false);
            setPaymentToEdit(null);
        } catch (err: any) {
            console.error("Failed to save payment", err);
            alert(err.message || t('Error saving payment'));
        }
    };

    const handleDeletePayment = (id: string) => {
        setPaymentToDelete(id);
        setIsConfirmOpen(true);
    };

    const renderCalendar = () => {
        if (!attendanceFilterMonth || attendanceFilterEmployeeId === 'all') return (
            <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">Sélectionnez un employé pour voir son calendrier</h3>
            </div>
        );

        const [yearStr, monthStr] = attendanceFilterMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // Sunday = 0
        const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Make Monday = 0
        
        const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
        
        const getStatusColor = (status: string) => {
            switch(status) {
                case 'Present': return 'bg-emerald-50 text-emerald-700';
                case 'Absent': return 'bg-red-50 text-red-700';
                case 'Half-day': return 'bg-amber-50 text-amber-700';
                case 'Leave': return 'bg-blue-50 text-blue-700';
                default: return 'bg-slate-50 text-slate-700';
            }
        };
        const getStatusText = (status: string) => {
            switch(status) {
                case 'Present': return t('present');
                case 'Absent': return t('absent');
                case 'Half-day': return t('halfDay');
                case 'Leave': return t('leave');
                default: return status;
            }
        };

        return (
            <div className="p-4 sm:p-6 bg-slate-50/50">
                <div className="grid grid-cols-7 gap-px rounded-xl bg-slate-200 overflow-hidden border border-slate-200 shadow-sm">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                        <div key={d} className="bg-white py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
                    ))}
                    {Array.from({length: startOffset}).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px]" />
                    ))}
                    {days.map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayAttendances = filteredAttendances.filter(a => a.date === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        return (
                            <div key={day} className={`bg-white min-h-[100px] p-2 hover:bg-slate-50 transition-colors flex flex-col group relative ${isToday ? 'ring-2 ring-inset ring-emerald-500' : ''}`}>
                                <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>{day}</span>
                                <div className="flex-1 flex flex-col gap-1">
                                    {dayAttendances.map(att => (
                                        <div key={att.id} onClick={(e) => { e.stopPropagation(); setAttendanceToEdit(att); setIsAddAttendanceModalOpen(true); }} className={`cursor-pointer px-2 py-1 rounded text-[11px] font-bold leading-tight truncate ${getStatusColor(att.status)}`} title={att.note}>
                                            {getStatusText(att.status)}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => {
                                    setAttendanceToEdit(null);
                                    setIsAddAttendanceModalOpen(true);
                                }} className="absolute top-1 right-1 p-1 bg-white shadow-sm border border-slate-100 rounded text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Header title={t('personnel')}>
                 {activeTab === 'employees' && (
                 <button
                    type="button"
                    onClick={() => { setEmployeeToEdit(null); setIsAddEmployeeModalOpen(true); }}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('addEmployee')}</span>
                </button>
                 )}
                 {activeTab === 'attendance' && (
                 <button
                    type="button"
                    onClick={() => { setAttendanceToEdit(null); setIsAddAttendanceModalOpen(true); }}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('addAttendance')}</span>
                </button>
                 )}
                 {activeTab === 'payments' && (
                 <button
                    type="button"
                    onClick={() => { setPaymentToEdit(null); setIsAddPaymentModalOpen(true); }}
                    className="btn-primary px-3.5 py-2.5"
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('addPayment')}</span>
                </button>
                 )}
            </Header>

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Tabs */}
                <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 w-fit rtl:space-x-reverse mb-6">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`flex items-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-all ${
                            activeTab === 'employees' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        {t('personnel')}
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`flex items-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-all ${
                            activeTab === 'attendance' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        {t('pointage')}
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`flex items-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-all ${
                            activeTab === 'payments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        {t('paiement')}
                    </button>
                </div>

                {/* Tab content */}
                <div className="card-base overflow-hidden min-h-[400px]">
                    {activeTab === 'employees' && (
                        <div>
                            {employees.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <UserCheck className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">{t('noData')}</h3>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50/70">
                                        <tr>
                                            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('name')}</th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('role')}</th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('contact')}</th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('salary')}</th>
                                            <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {employees.map(emp => (
                                            <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center border border-emerald-100">
                                                            <span>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</span>
                                                        </div>
                                                        <div className="ml-4 rtl:ml-0 rtl:mr-4">
                                                            <div className="text-sm font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                                                            <div className="text-xs text-slate-400">{new Date(emp.joinDate).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span className="badge-info">
                                                        {emp.role}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                    <div className="flex flex-col gap-1">
                                                        {emp.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400"/> {emp.phone}</div>}
                                                        {emp.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400"/> {emp.email}</div>}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                    <div className="font-bold text-slate-900">{formatCurrency(emp.paymentType === 'Monthly' ? emp.monthlySalary : emp.dailyRate, companySettings)}</div>
                                                    <div className="text-xs text-slate-400">{emp.paymentType === 'Monthly' ? '/ mois' : '/ jour'}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button 
                                                            onClick={() => { setEmployeeToEdit(emp); setIsAddEmployeeModalOpen(true); }} 
                                                            className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteEmployee(emp.id)} 
                                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'attendance' && (
                        <div className="flex flex-col h-full">
                            <div className="p-4 sm:p-6 border-b border-slate-100 bg-white">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 xl:gap-6 w-full">
                                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
                                        <select
                                            value={attendanceFilterEmployeeId}
                                            onChange={(e) => setAttendanceFilterEmployeeId(e.target.value)}
                                            className="block w-full sm:w-64 h-[42px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="all">Tous les employés</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="month"
                                            value={attendanceFilterMonth}
                                            onChange={(e) => setAttendanceFilterMonth(e.target.value)}
                                            className="block w-full sm:w-48 h-[42px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
                                        />
                                        {(attendanceFilterEmployeeId !== 'all' || attendanceFilterMonth !== '') && (
                                            <button 
                                                onClick={() => { setAttendanceFilterEmployeeId('all'); setAttendanceFilterMonth(''); }} 
                                                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap self-start sm:self-center"
                                            >
                                                Effacer les filtres
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:flex lg:flex-nowrap gap-2 sm:gap-3 text-sm font-medium w-full xl:w-auto mt-2 xl:mt-0">
                                        <div className="flex flex-col items-center justify-center py-2 px-2 sm:px-4 bg-emerald-50 text-emerald-800 rounded-xl lg:min-w-[90px] border border-emerald-100/50 text-center">
                                            <span className="text-xl font-bold">{totalPresent}</span>
                                            <span className="text-[10px] sm:text-xs mt-0.5 opacity-80 uppercase tracking-wider font-semibold truncate max-w-full">Présences</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center py-2 px-2 sm:px-4 bg-amber-50 text-amber-800 rounded-xl lg:min-w-[90px] border border-amber-100/50 text-center">
                                            <span className="text-xl font-bold">{totalHalfDay}</span>
                                            <span className="text-[10px] sm:text-xs mt-0.5 opacity-80 uppercase tracking-wider font-semibold truncate max-w-full">Demi-journées</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center py-2 px-2 sm:px-4 bg-red-50 text-red-800 rounded-xl lg:min-w-[90px] border border-red-100/50 text-center">
                                            <span className="text-xl font-bold">{totalAbsent}</span>
                                            <span className="text-[10px] sm:text-xs mt-0.5 opacity-80 uppercase tracking-wider font-semibold truncate max-w-full">Absences</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center py-2 px-2 sm:px-4 bg-blue-50 text-blue-800 rounded-xl lg:min-w-[90px] border border-blue-100/50 text-center">
                                            <span className="text-xl font-bold">{totalLeave}</span>
                                            <span className="text-[10px] sm:text-xs mt-0.5 opacity-80 uppercase tracking-wider font-semibold truncate max-w-full">Congés</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {renderCalendar()}
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="flex flex-col h-full">
                            <div className="p-4 sm:p-6 border-b border-slate-100 bg-white">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 xl:gap-6 w-full">
                                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
                                        <select
                                            value={paymentFilterEmployeeId}
                                            onChange={(e) => setPaymentFilterEmployeeId(e.target.value)}
                                            className="block w-full sm:w-64 h-[42px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="all">Tous les employés</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="month"
                                            value={paymentFilterMonth}
                                            onChange={(e) => setPaymentFilterMonth(e.target.value)}
                                            className="block w-full sm:w-48 h-[42px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
                                        />
                                        {(paymentFilterEmployeeId !== 'all' || paymentFilterMonth !== '') && (
                                            <button 
                                                onClick={() => { setPaymentFilterEmployeeId('all'); setPaymentFilterMonth(''); }} 
                                                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap self-start sm:self-center"
                                            >
                                                Effacer les filtres
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 lg:gap-6 text-sm font-medium w-full xl:w-auto justify-between sm:justify-start xl:justify-end border-t xl:border-t-0 pt-4 xl:pt-0 mt-2 xl:mt-0">
                                        <div className="flex flex-col rtl:text-right">
                                            <span className="text-slate-500 text-xs text-center sm:text-left">Total Payé ({paymentFilterMonth === 'all' || paymentFilterMonth === '' ? 'Tout' : paymentFilterMonth})</span>
                                            <span className="text-lg sm:text-xl font-bold text-emerald-600 text-center sm:text-left">{formatCurrency(totalPaidAmount, companySettings)}</span>
                                        </div>
                                        <div className="w-px bg-slate-200 hidden sm:block"></div>
                                        <div className="flex flex-col rtl:text-right">
                                            <span className="text-slate-500 text-xs text-center sm:text-left">Total En attente</span>
                                            <span className="text-lg sm:text-xl font-bold text-amber-600 text-center sm:text-left">{formatCurrency(totalPendingAmount, companySettings)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {filteredPayments.length === 0 ? (
                                 <div className="text-center py-16">
                                     <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                         <DollarSign className="h-6 w-6 text-slate-400" />
                                     </div>
                                     <h3 className="text-sm font-bold text-slate-800">{t('noData')}</h3>
                                 </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/70">
                                            <tr>
                                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('date')}</th>
                                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('employee')}</th>
                                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">Type</th>
                                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('amount')}</th>
                                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 rtl:text-right">{t('status')}</th>
                                                <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filteredPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map(pay => {
                                                const emp = employees.find(e => e.id === pay.employeeId);
                                                return (
                                                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors group">
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 font-bold">
                                                            {new Date(pay.paymentDate).toLocaleDateString()}
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4">
                                                            <div className="flex items-center">
                                                                {emp ? (
                                                                    <>
                                                                        <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100">
                                                                            <span>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</span>
                                                                        </div>
                                                                        <div className="ml-3 rtl:ml-0 rtl:mr-3">
                                                                            <div className="text-sm font-bold text-slate-900">{emp.firstName} {emp.lastName}</div>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-sm text-slate-400">Employé inconnu</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4">
                                                            <span className="badge-neutral">
                                                                {pay.type === 'Salary' ? 'Salaire' : pay.type === 'Advance' ? 'Avance' : 'Prime / Bonus'}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-extrabold text-slate-900">
                                                            {formatCurrency(pay.amount, companySettings)}
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4">
                                                            <span className={pay.status === 'Paid' ? 'badge-success' : 'badge-warning'}>
                                                                {pay.status === 'Paid' ? 'Payé' : 'En attente'}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button 
                                                                    onClick={() => { setPaymentToEdit(pay); setIsAddPaymentModalOpen(true); }} 
                                                                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeletePayment(pay.id)} 
                                                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isAddEmployeeModalOpen && (
                <EmployeeForm employee={employeeToEdit} onSave={handleSaveEmployee} onCancel={() => { setIsAddEmployeeModalOpen(false); setEmployeeToEdit(null); }} t={t} />
            )}

            {isAddAttendanceModalOpen && (
                <AttendanceForm 
                    attendance={attendanceToEdit} 
                    onSave={handleSaveAttendance} 
                    onCancel={() => { setIsAddAttendanceModalOpen(false); setAttendanceToEdit(null); }} 
                    onDelete={(id) => {
                        setIsAddAttendanceModalOpen(false);
                        handleDeleteAttendance(id);
                    }}
                    employeesList={employees} 
                    t={t}
                />
            )}

            {isAddPaymentModalOpen && (
                <PaymentForm payment={paymentToEdit} onSave={handleSavePayment} onCancel={() => { setIsAddPaymentModalOpen(false); setPaymentToEdit(null); }} employeesList={employees} t={t} />
            )}

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => { 
                    setIsConfirmOpen(false); 
                    setEmployeeToDelete(null); 
                    setAttendanceToDelete(null); 
                    setPaymentToDelete(null);
                }}
                onConfirm={confirmDeletion}
                title={language === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression'}
                message={
                    employeeToDelete ? t('deleteConfirm') : 
                    attendanceToDelete ? t('deleteAttendanceConfirm') : 
                    t('deletePaymentConfirm')
                }
            />
        </div>
    );
};

export default PersonnelManagement;
