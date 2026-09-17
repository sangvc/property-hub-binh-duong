# Test Credentials

## Admin
- Email: sang.vucao@gmail.com
- Password: hkdvucaosang
- Role: admin

## Demo CTV (cộng tác viên)
- Email: ctv.demo@poollocal.vn
- Password: ctv123456
- Role: ctv

## Auth endpoints
- POST /api/auth/login {email, password}
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/forgot-password {email}
- POST /api/auth/reset-password {token, password}

## Notes
- Auth dùng httpOnly cookie (access_token 15 phút, refresh_token 7 ngày). Frontend dùng axios withCredentials.
- Admin được seed tự động khi backend khởi động (từ ADMIN_EMAIL/ADMIN_PASSWORD trong backend/.env).
- Trang đăng nhập: /dang-nhap. Admin dashboard: /admin. CTV dashboard: /ctv.
