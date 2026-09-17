import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rise-in">
        <h1 className="text-2xl font-extrabold tracking-tight text-center mb-2">Quên mật khẩu</h1>
        <p className="text-sm text-stone-500 text-center mb-6">Nhập email tài khoản để nhận link đặt lại mật khẩu</p>

        {sent ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center" data-testid="forgot-success">
            <MailCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-stone-700">
              Nếu email đã đăng ký, link đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2" data-testid="forgot-error">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                data-testid="forgot-email-input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold"
              data-testid="forgot-submit-button"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Gửi link đặt lại
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-stone-400 mt-6">
          <Link to="/dang-nhap" className="hover:text-stone-600" data-testid="forgot-back-login">
            ← Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
