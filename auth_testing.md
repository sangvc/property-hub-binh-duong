# Auth Testing Playbook (Pool Local)

Auth is custom email/password JWT with httpOnly cookies. Credentials are in /app/memory/test_credentials.md.

## Step 1: MongoDB verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
```
Verify: bcrypt hash starts with `$2b$`; indexes exist on users.email (unique), login_attempts.identifier, login_attempts.email, password_reset_tokens.expires_at (TTL), password_reset_tokens.token_hash (unique), password_reset_requests.email, password_reset_requests.created_at (TTL).

## Step 2: API testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"sang.vucao@gmail.com","password":"hkdvucaosang"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns the user object and sets access_token + refresh_token cookies. /me returns the same user via cookies.

## Step 3: Password reset
To obtain a test token locally: temporarily set FRONTEND_URL="http://localhost:3000" in /app/backend/.env and restart backend — send_password_reset_email then writes the full reset link to the backend log. Restore the https origin after testing.

1. Register a test account via admin endpoint (POST /api/admin/users as admin) since public registration does not exist.
2. POST /api/auth/forgot-password with a registered and an unregistered email — responses must be identical generic 200 bodies.
3. Complete reset via link from backend log: new password logs in, old one does not, reusing the link fails.
4. Throttle: 6 forgot-password requests for a fresh address — only 5 create tokens, all 6 return the same generic 200.
5. Lockout clearance: fail login 5 times, complete reset, login with new password must succeed.

## Role checks
- CTV hitting /api/admin/* → 403.
- Unauthenticated hitting /api/my/listings → 401.
- CTV cannot edit another CTV's listing → 403.
