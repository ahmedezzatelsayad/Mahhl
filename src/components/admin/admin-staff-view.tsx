'use client';

/**
 * AdminStaffView — owner-only staff & permissions management.
 * - list accounts with role / status / last login
 * - create account (name / email / password / role)
 * - change role, activate / deactivate, reset password, delete
 * - live permission matrix reference
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import {
  ROLES,
  ROLE_LABELS_AR,
  MODULES,
  MODULE_LABELS_AR,
  ROLE_MATRIX,
  normalizeRole,
  type Role,
} from '@/lib/permissions';
import {
  Users, UserPlus, ShieldCheck, Trash2, KeyRound, Ban, CheckCircle2, X, Loader2,
} from 'lucide-react';

interface StaffRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function AdminStaffView() {
  const adminToken = useAppStore((s) => s.adminToken);
  const adminUser = useAppStore((s) => s.adminUser);

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [pwTarget, setPwTarget] = useState<StaffRow | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    setError('');
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  }, []);

  const load = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'فشل تحميل المستخدمين');
        setRows([]);
      } else {
        setRows(data.users || []);
        setError('');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    load();
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [load]);

  const authHeaders = () => ({ Authorization: `Bearer ${adminToken}` });

  async function patchUser(id: string, body: Record<string, unknown>, okMsg: string) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error || 'فشل التحديث');
      else {
        flash(okMsg);
        await load();
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(row: StaffRow) {
    if (!confirm(`حذف حساب «${row.name || row.email}» نهائياً؟`)) return;
    setBusyId(row.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${row.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error || 'فشل الحذف');
      else {
        flash('تم حذف الحساب');
        await load();
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setBusyId(null);
    }
  }

  if (!adminUser || normalizeRole(adminUser.role) !== 'owner') {
    return (
      <div className="p-6 max-w-md mx-auto text-center bg-background min-h-[60vh]">
        <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">قسم إدارة المستخدمين</h2>
        <p className="text-muted-foreground">
          هذا القسم متاح لمالك المتجر فقط. إن كنت المالك، سجّل الدخول بحساب المالك.
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6 bg-background min-h-[60vh]">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> المستخدمون والصلاحيات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} حساب — أنت مسجّل الدخول كـ{ROLE_LABELS_AR[normalizeRole(adminUser.role)]}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMatrix((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            {showMatrix ? 'إخفاء مصفوفة الصلاحيات' : 'مصفوفة الصلاحيات'}
          </button>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-4 h-4" />
            إضافة مستخدم
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 px-4 py-3 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* add-user form */}
      {showAdd && (
        <AddStaffForm
          onCancel={() => setShowAdd(false)}
          onCreated={async (name) => {
            setShowAdd(false);
            flash(`تم إنشاء حساب «${name}»`);
            await load();
          }}
          authHeaders={authHeaders}
          onError={setError}
        />
      )}

      {/* permission matrix */}
      {showMatrix && <PermissionMatrix />}

      {/* staff table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-muted/50 text-right">
                <th className="px-4 py-3 font-semibold">الموظف</th>
                <th className="px-4 py-3 font-semibold">الدور</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">آخر دخول</th>
                <th className="px-4 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    لا يوجد مستخدمون بعد
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelf = row.email === adminUser.email;
                  return (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleSelect
                          value={normalizeRole(row.role)}
                          disabled={busyId === row.id}
                          onChange={(role) =>
                            patchUser(
                              row.id,
                              { role },
                              `تم تغيير دور «${row.name || row.email}» إلى ${ROLE_LABELS_AR[role]}`
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        {row.isActive ? (
                          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" /> نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Ban className="w-4 h-4" /> معطّل
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {row.lastLoginAt
                          ? new Date(row.lastLoginAt).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })
                          : 'لم يدخل بعد'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            title={isSelf ? 'لا يمكنك تعطيل حسابك' : row.isActive ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                            disabled={busyId === row.id || isSelf}
                            onClick={() =>
                              patchUser(
                                row.id,
                                { isActive: !row.isActive },
                                row.isActive ? 'تم تعطيل الحساب' : 'تم تنشيط الحساب'
                              )
                            }
                            className="p-2 rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            title="إعادة تعيين كلمة المرور"
                            disabled={busyId === row.id}
                            onClick={() => setPwTarget(row)}
                            className="p-2 rounded-md border hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            title={isSelf ? 'لا يمكنك حذف حسابك' : 'حذف الحساب نهائياً'}
                            disabled={busyId === row.id || isSelf}
                            onClick={() => deleteUser(row)}
                            className="p-2 rounded-md border text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ملاحظة أمان: تغيير كلمة مرور أي مستخدم يُبطل جلساته فوراً على كل الأجهزة، وتعطيل
        الحساب يمنع وصوله خلال ثوانٍ حتى لو كان مسجّلاً بالدخول.
      </p>

      {/* reset-password dialog */}
      {pwTarget && (
        <ResetPasswordDialog
          row={pwTarget}
          busy={busyId === pwTarget.id}
          onClose={() => setPwTarget(null)}
          onSubmit={async (password) => {
            await patchUser(pwTarget.id, { password }, `تم تغيير كلمة مرور «${pwTarget.name || pwTarget.email}»`);
            setPwTarget(null);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

/* ---------------- sub-components ---------------- */

function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: Role;
  disabled?: boolean;
  onChange: (r: Role) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className="rounded-md border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS_AR[r]}
        </option>
      ))}
    </select>
  );
}

function AddStaffForm({
  onCancel,
  onCreated,
  authHeaders,
  onError,
}: {
  onCancel: () => void;
  onCreated: (name: string) => Promise<void>;
  authHeaders: () => Record<string, string>;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('manager');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    onError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) onError(data?.error || 'فشل إنشاء الحساب');
      else await onCreated(name || email);
    } catch {
      onError('تعذر الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  }

  const valid = name.trim().length >= 2 && /.+@.+\..+/.test(email) && password.length >= 8;

  return (
    <div className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">إضافة مستخدم جديد</h2>
        <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-muted" aria-label="إلغاء">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">الاسم</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: سارة أحمد"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">البريد الإلكتروني</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@mahhal.shop"
            dir="ltr"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">كلمة المرور (8 أحرف على الأقل)</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="text"
            dir="ltr"
            placeholder="مؤقتة — سيغيّرها الموظف لاحقاً"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">الدور</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS_AR[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        onClick={submit}
        disabled={saving || !valid}
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        إنشاء الحساب
      </button>
    </div>
  );
}

function ResetPasswordDialog({
  row,
  busy,
  onClose,
  onSubmit,
  onError,
}: {
  row: StaffRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-card border p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg">
          إعادة تعيين كلمة المرور
          <div className="text-sm font-normal text-muted-foreground">
            {row.name || row.email}
          </div>
        </h2>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="text"
          dir="ltr"
          placeholder="كلمة المرور الجديدة (8 أحرف+)"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          ستُبطل هذه العملية كل جلسات المستخدم الحالية فوراً.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            إلغاء
          </button>
          <button
            onClick={() => {
              if (password.length < 8) {
                onError('كلمة المرور 8 أحرف على الأقل');
                return;
              }
              onSubmit(password);
            }}
            disabled={busy || password.length < 8}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تغيير'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionMatrix() {
  return (
    <div className="rounded-xl border bg-card p-4 md:p-6">
      <h2 className="font-bold text-lg mb-3">مصفوفة الصلاحيات حسب الدور</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-right font-semibold">القسم</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-2 font-semibold">
                  {ROLE_LABELS_AR[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m} className="border-t">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{MODULE_LABELS_AR[m]}</td>
                {ROLES.map((r) => {
                  const a = ROLE_MATRIX[r][m];
                  return (
                    <td key={r} className="px-3 py-2 text-center">
                      {a === 'manage' ? (
                        <span className="text-green-700 dark:text-green-400 font-bold">إدارة</span>
                      ) : a === 'view' ? (
                        <span className="text-amber-700 dark:text-amber-400">عرض</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
