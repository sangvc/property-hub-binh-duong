import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#E05A47]" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/ctv"} replace />;
  }
  return children;
}
