import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import Header from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

const EMPTY = { name: "", email: "", phone: "", password: "" };

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    api.get("/admin/users").then((r) => setUsers(r.data)).catch(() => setUsers([]));
  };

  useEffect(load, []);

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/users", { name: form.name, email: form.email, password: form.password, phone: form.phone || null });
      toast.success(`Đã tạo tài khoản CTV: ${form.email}`);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/users/${deleteTarget}`);
      toast.success("Đã xóa cộng tác viên");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 rise-in">
        <button onClick={() => navigate("/admin")} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800 mb-4" data-testid="back-to-admin">
          <ChevronLeft className="w-4 h-4" /> Quản trị tin đăng
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Cộng tác viên</h1>
        <p className="text-sm text-stone-500 mb-6">Tạo và quản lý tài khoản đăng tin</p>

        <form onSubmit={createUser} className="bg-white rounded-2xl border border-stone-200 p-5 mb-8">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#E05A47]" /> Thêm cộng tác viên mới
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Họ tên *</Label>
              <Input id="u-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="ctv-name-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="ctv-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-phone">Số điện thoại</Label>
              <Input id="u-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="ctv-phone-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-pass">Mật khẩu * (tối thiểu 6 ký tự)</Label>
              <Input id="u-pass" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="ctv-password-input" />
            </div>
          </div>
          <Button type="submit" disabled={creating} className="mt-4 rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold" data-testid="ctv-create-button">
            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Tạo tài khoản
          </Button>
        </form>

        {users === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-300 text-stone-500" data-testid="ctv-empty">
            Chưa có cộng tác viên nào
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="ctv-list">
            {users.map((u) => (
              <div key={u.id} data-testid={`ctv-row-${u.id}`} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF1EE] text-[#C94635] flex items-center justify-center font-black">
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm">{u.name}</p>
                  <p className="text-xs text-stone-500 truncate">
                    {u.email} {u.phone && `· ${u.phone}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(u.id)} data-testid={`ctv-delete-${u.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cộng tác viên?</AlertDialogTitle>
            <AlertDialogDescription>Tài khoản sẽ không đăng nhập được nữa. Tin đã đăng của họ vẫn được giữ lại.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="ctv-delete-cancel">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" data-testid="ctv-delete-confirm">
              Xóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
