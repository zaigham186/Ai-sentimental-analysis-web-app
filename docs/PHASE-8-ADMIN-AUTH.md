# Phase 8: Admin Authentication and Dashboard

## Overview

Phase 8 implements the complete secure admin authentication system and research dashboard. This provides researchers with a separate, secure interface to monitor study progress.

## Implementation Date

September 8, 2026

## Components Implemented

### Backend

#### 1. Admin Authentication Middleware (`backend/src/middleware/adminAuth.js`)
- `authenticateAdmin`: Verifies admin session cookie
- `requireAdmin`: Ensures admin role or higher
- `requireResearcher`: Ensures researcher role or higher
- `requireSuperAdmin`: Ensures superadmin role
- `requirePermission`: Checks specific permissions
- `checkExistingAdminSession`: Prevents duplicate login

#### 2. Admin Controller (`backend/src/controllers/adminController.js`)
- **POST /api/admin/login**: Admin login with bcrypt password verification
- **POST /api/admin/logout**: Admin logout
- **GET /api/admin/me**: Get current admin info
- **GET /api/admin/dashboard**: Get dashboard statistics

#### 3. Admin Routes (`backend/src/routes/admin.js`)
- All routes prefixed with `/api/admin`
- Protected routes require authentication
- Dashboard requires researcher role or higher

#### 4. Admin Creation Script (`backend/create-admin.js`)
- Interactive CLI to create admin accounts
- Password validation (minimum 8 characters)
- Automatic password hashing with bcrypt (12 rounds)
- Duplicate username/email checking

### Frontend

#### 1. Admin Types (`frontend/types/index.ts`)
- `Admin`: Admin user interface
- `AdminLoginData`: Login credentials
- `DashboardStats`: Dashboard statistics structure

#### 2. Admin API (`frontend/lib/api.ts`)
- `api.admin.login()`: Admin login
- `api.admin.logout()`: Admin logout
- `api.admin.me()`: Get current admin
- `api.admin.dashboard()`: Get dashboard data

#### 3. Admin Layout Component (`frontend/components/admin/AdminLayout.tsx`)
- Reusable admin layout with sidebar navigation
- Top navigation bar with admin info and logout
- Navigation items for all future admin features
- "Coming Soon" indicators for Phase 9+ features

#### 4. Admin Login Page (`frontend/app/admin/login/page.tsx`)
- Professional academic login interface
- Username/email and password fields
- Form validation
- Error handling
- Automatic redirect to dashboard on success

#### 5. Admin Dashboard Page (`frontend/app/admin/dashboard/page.tsx`)
- Research progress overview
- Real-time statistics from database:
  - Participant counts (total, anonymous, identifiable, completed, incomplete, withdrawn)
  - Experiment progress (total responses, completed experiments)
  - Questionnaire status (completed, pending)
  - Coding progress (total, coded, pending)
- Color-coded stat cards
- Authentication guard (redirects to login if not authenticated)

## Security Features

### Password Security
- Passwords hashed with bcrypt (12 rounds)
- Never stored as plaintext
- Password hash excluded from queries by default (`select: false`)

### Session Management
- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production (HTTPS only)
- SameSite: strict prevents CSRF attacks
- 24-hour session expiration
- Session cleared on logout

### Account Protection
- Failed login attempt tracking
- Account lock after 5 failed attempts (30-minute lockout)
- Account deactivation support
- IP address logging for security audits

### Route Protection
- Backend independently enforces authentication
- Frontend route guards redirect unauthenticated users
- Role-based access control (RBAC)
- Permission-based access control

### Admin Roles
- **superadmin**: Full access to all features
- **admin**: Administrative privileges
- **researcher**: Research data access
- **coder**: Response coding access
- **analyst**: Data analysis access

### Permissions
- `view_participants`: View participant data
- `view_responses`: View response data
- `view_data`: View study data
- `code_responses`: Code video responses
- `manage_videos`: Manage video library
- `manage_questionnaires`: Manage questionnaires
- `export_data`: Export study data
- `manage_admins`: Manage admin accounts
- `manage_study_settings`: Modify study settings
- `view_audit_logs`: View audit logs

## Usage

### Creating First Admin Account

```bash
cd backend
node create-admin.js
```

Follow the interactive prompts:
- Username (min 3 characters)
- Email (valid format)
- Full Name (min 2 characters)
- Password (min 8 characters)
- Confirm Password

The script creates a superadmin account with all permissions.

### Admin Login

1. Navigate to: `http://localhost:3001/admin/login`
2. Enter username or email
3. Enter password
4. Click "Login"
5. Redirected to dashboard on success

### Dashboard Access

After login, access dashboard at: `http://localhost:3001/admin/dashboard`

Dashboard displays:
- Participant statistics
- Experiment progress
- Questionnaire completion
- Coding progress

### Admin Logout

Click "Logout" button in top navigation bar.

## API Endpoints

### POST /api/admin/login
**Description**: Admin login  
**Authentication**: None (public)  
**Request Body**:
```json
{
  "username": "admin",
  "password": "password123"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "superadmin",
    "permissions": [...]
  }
}
```

### POST /api/admin/logout
**Description**: Admin logout  
**Authentication**: Required  
**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/admin/me
**Description**: Get current admin info  
**Authentication**: Required  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "superadmin",
    "permissions": [...]
  }
}
```

### GET /api/admin/dashboard
**Description**: Get dashboard statistics  
**Authentication**: Required (researcher role or higher)  
**Response**:
```json
{
  "success": true,
  "data": {
    "participants": {
      "total": 45,
      "anonymous": 22,
      "identifiable": 23,
      "completed": 30,
      "incomplete": 10,
      "withdrawn": 5
    },
    "experiment": {
      "totalResponses": 300,
      "completedExperiments": 30
    },
    "questionnaires": {
      "completed": 25,
      "pending": 5
    },
    "coding": {
      "totalResponses": 300,
      "codedResponses": 150,
      "pendingResponses": 150
    }
  }
}
```

## Navigation Structure

### Enabled Routes (Phase 8)
- `/admin/login` - Admin login page
- `/admin/dashboard` - Dashboard overview

### Future Routes (Phase 9+)
- `/admin/participants` - Participant management
- `/admin/videos` - Video library management
- `/admin/responses` - Response viewing
- `/admin/questionnaires` - Questionnaire management
- `/admin/coding` - Response coding interface
- `/admin/analytics` - Advanced analytics
- `/admin/export` - Data export
- `/admin/audit-logs` - Security audit logs
- `/admin/settings` - Study settings

## Testing Checklist

### Backend Tests
- [x] Create admin account
- [x] Valid admin login
- [x] Invalid password
- [x] Invalid username
- [x] Account lockout after 5 failed attempts
- [x] Deactivated account login blocked
- [x] Admin logout
- [x] Protected route without authentication
- [x] Dashboard data retrieval
- [x] Role-based access control

### Frontend Tests
- [x] Login page renders
- [x] Form validation
- [x] Login success redirect
- [x] Login error display
- [x] Dashboard authentication guard
- [x] Dashboard statistics display
- [x] Logout functionality
- [x] Mobile responsive design

### Security Tests
- [x] HTTP-only cookies
- [x] Password hashing
- [x] Session expiration
- [x] CSRF protection (SameSite)
- [x] Participant cannot access admin endpoints
- [x] Unauthenticated access blocked

## Known Limitations

1. **Password Reset**: Not implemented yet (manual admin creation required)
2. **Session Management**: Basic implementation (no session revocation list)
3. **Audit Logging**: Prepared infrastructure but not fully implemented
4. **Multi-factor Authentication**: Not implemented
5. **Remember Me**: Not implemented (24-hour sessions only)

## Future Enhancements (Later Phases)

### Phase 9: Admin Management
- Participant data viewing and management
- Video library management
- Response viewing and filtering
- Questionnaire management

### Phase 10: Coding and Analytics
- Response coding interface
- Inter-rater reliability tools
- Advanced analytics dashboards
- Data visualization

### Phase 11: Export and Audit
- Multiple export formats (CSV, Excel, JSON)
- Audit log viewer
- Study settings management
- Admin account management

## Database Changes

No schema changes required. Uses existing `Admin` model with all necessary fields.

## Environment Variables

No new environment variables required. Uses existing:
- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)

## Dependencies

No new dependencies required. Uses existing:
- `bcryptjs`: Password hashing
- `cookie-parser`: Cookie parsing
- `express`: Web framework
- `mongoose`: MongoDB ORM

## Separation from Participant System

Admin authentication is **completely separate** from participant authentication:

### Separate Sessions
- Admin: `adminSession` cookie
- Participant: `participantSession` cookie

### Separate Routes
- Admin: `/api/admin/*`
- Participant: `/api/participants/*`, `/api/condition/*`, `/api/experiment/*`

### Separate Middleware
- Admin: `adminAuth.js`
- Participant: `participantAuth.js`

### Separate Frontend Routes
- Admin: `/admin/*`
- Participant: `/`, `/consent`, `/register`, `/participant`, `/condition`, `/experiment`

### Separate Concerns
- Admins cannot access participant features
- Participants cannot access admin features
- No credential overlap or confusion

## Troubleshooting

### Cannot login - "Invalid username or password"
- Check username/email spelling
- Verify password is correct
- Check if account exists in database

### Account locked
- Wait 30 minutes for automatic unlock
- Contact superadmin to manually unlock

### Dashboard not loading
- Check MongoDB connection
- Verify admin authentication
- Check browser console for errors

### Logout not working
- Check browser cookies
- Clear browser cache
- Verify backend is running

## Phase Completion Status

✅ **Phase 8 Complete**

All requirements implemented:
- Admin authentication system
- Secure session management
- Admin dashboard with real statistics
- Role-based access control
- Professional admin UI
- Complete separation from participant system

## Next Steps

Phase 9 will implement:
- Participant management interface
- Video library management
- Response viewing and filtering
- Questionnaire management interface

---

**Implementation Team**: SBBWU Research Team  
**Last Updated**: September 8, 2026  
**Phase**: 8 of 11
