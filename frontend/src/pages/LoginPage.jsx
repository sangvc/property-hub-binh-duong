import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      toast.success(`Xin chào ${user.name || user.email}`);
      const from = location.state?.from;
      navigate(from || (user.role === "admin" ? "/admin" : "/ctv"), { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rise-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4" data-testid="login-brand-link">
            <span className="w-11 h-11 rounded-2xl bg-[#E05A47] flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">Đăng nhập Pool Local</h1>
          <p className="text-sm text-stone-500 mt-1">Dành cho Admin & Cộng tác viên</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2" data-testid="login-error">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              data-testid="login-email-input"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
              <Link to="/quen-mat-khau" className="text-xs font-semibold text-[#0068FF] hover:underline" data-testid="forgot-password-link">
                Quên mật khẩu?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="login-password-input"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#E05A47] hover:bg-[#C94635] text-white font-bold"
            data-testid="login-submit-button"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Đăng nhập
          </Button>
        </form>

        <p className="text-center text-xs text-stone-400 mt-6">
          <Link to="/" className="hover:text-stone-600" data-testid="login-back-home">
            ← Về trang xem tin
          </Link>
        </p>
      </div>
    </div>
  );
}
