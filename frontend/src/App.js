import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomePage from "@/pages/HomePage";
import ListingDetailPage from "@/pages/ListingDetailPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import MyListingsPage from "@/pages/ctv/MyListingsPage";
import ListingFormPage from "@/pages/ctv/ListingFormPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tin/:id" element={<ListingDetailPage />} />
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
          <Route path="/dat-lai-mat-khau" element={<ResetPasswordPage />} />
          <Route
            path="/ctv"
            element={
              <ProtectedRoute roles={["ctv", "admin"]}>
                <MyListingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ctv/tao-tin"
            element={
              <ProtectedRoute roles={["ctv", "admin"]}>
                <ListingFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ctv/sua-tin/:id"
            element={
              <ProtectedRoute roles={["ctv", "admin"]}>
                <ListingFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sua-tin/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ListingFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cong-tac-vien"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
