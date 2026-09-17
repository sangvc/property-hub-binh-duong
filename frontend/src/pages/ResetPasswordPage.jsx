import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Đặt lại mật khẩu thành công");
      navigate("/dang-nhap", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rise-in">
        <div className="text-center mb-6">
          <KeyRound className="w-10 h-10 text-[#E05A47] mx-auto mb-2" />
          <h1 className="text-2xl font-extrabold tracking-tight">Đặt lại mật khẩu</h1>
        </div>

        {!token ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-sm text-stone-600" data-testid="reset-no-token">
            Link không hợp lệ. Vui lòng yêu cầu link mới từ trang quên mật khẩu.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2" data-testid="reset-error">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="rp-password">Mật khẩu mới</Label>
              <Input
                id="rp-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="reset-password-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-confirm">Nhập lại mật khẩu</Label>
              <Input
                id="rp-confirm"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                data-testid="reset-confirm-input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold"
              data-testid="reset-submit-button"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Đặt lại mật khẩu
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-stone-400 mt-6">
          <Link to="/dang-nhap" className="hover:text-stone-600" data-testid="reset-back-login">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
