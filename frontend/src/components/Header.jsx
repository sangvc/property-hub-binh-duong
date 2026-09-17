import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, MessageCircle, LogIn, LayoutDashboard, PlusCircle, LogOut, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getConfig, zaloLink, ZALO_FALLBACK_PHONE } from "../lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [zaloPhone, setZaloPhone] = useState("");

  useEffect(() => {
    getConfig().then((c) => setZaloPhone(c.zalo_phone)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-xl border-b border-stone-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="brand-logo-link">
          <span className="w-9 h-9 rounded-xl bg-[#E05A47] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </span>
          <span className="font-extrabold tracking-tight text-lg leading-none">
            POOL <span className="text-[#E05A47]">LOCAL</span>
            <span className="block text-[10px] font-semibold text-stone-500 tracking-widest uppercase">
              Bình Dương
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={zaloLink(zaloPhone || ZALO_FALLBACK_PHONE, "Chào Pool Local, tôi cần tìm mặt bằng/chỗ ở tại Bình Dương.")}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="header-zalo-button"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#0068FF] hover:bg-[#0056D6] text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Chat Zalo ngay
          </a>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full gap-2" data-testid="user-menu-trigger">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user.role === "admin" ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Quản trị tin đăng
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/admin/cong-tac-vien")} data-testid="menu-admin-users">
                      <Users className="w-4 h-4 mr-2" /> Cộng tác viên
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/ctv")} data-testid="menu-ctv-dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Tin của tôi
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/ctv/tao-tin")} data-testid="menu-create-listing">
                  <PlusCircle className="w-4 h-4 mr-2" /> Đăng tin mới
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className="rounded-full gap-1.5"
              onClick={() => navigate("/dang-nhap")}
              data-testid="header-login-button"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng tin CTV</span>
              <span className="sm:hidden">Đăng nhập</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
