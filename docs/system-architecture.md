# System Architecture

## Overview
This document describes the technical architecture of the Cyberbullying Research Platform.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                       (Next.js 14)                           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Pages    │  │ Components │  │    Lib     │           │
│  │            │  │            │  │            │           │
│  │ - Home     │  │ - UI       │  │ - API      │           │
│  │ - Study    │  │ - Layout   │  │ - Auth     │           │
│  │ - Consent  │  │ - Forms    │  │ - Utils    │           │
│  │ - Participant │ - Experiment │             │           │
│  │ - Admin    │  │ - Questionnaire │          │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTPS / REST API
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                        Backend                                │
│                     (Express.js)                              │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Routes  │  │Controllers│  │ Services │  │  Models  │   │
│  │          │  │           │  │          │  │          │   │
│  │ - Health │  │ - Participant │ - DB    │  │ - Participant│
│  │ - Participant │ - Experiment │ - Session │ - Consent │  │
│  │ - Consent │  │ - Questionnaire │ - Email │ - Experiment │
│  │ - Experiment │ - Admin  │  │ - Coding │  │ - Questionnaire │
│  │ - Admin  │  │          │  │          │  │ - Admin  │   │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘   │
│                                                   │          │
│  ┌──────────────────────────────────────────────┐│          │
│  │          Middleware                           ││          │
│  │  - Security (Helmet, CORS, Rate Limit)       ││          │
│  │  - Authentication                             ││          │
│  │  - Authorization                              ││          │
│  │  - Validation                                 ││          │
│  │  - Error Handling                             ││          │
│  │  - Logging                                    ││          │
│  └──────────────────────────────────────────────┘│          │
│                                                   │          │
└───────────────────────────────────────────────────┼──────────┘
                                                    │
                                                    │ Mongoose ODM
                                                    │
┌───────────────────────────────────────────────────▼──────────┐
│                       Database                                │
│                   (MongoDB / Atlas)                           │
│                                                               │
│  Collections:                                                 │
│  - participants                                               │
│  - consents                                                   │
│  - videoResponses                                             │
│  - questionnaires                                             │
│  - questionnaireResponses                                     │
│  - codings                                                    │
│  - admins                                                     │
│  - auditLogs                                                  │
│  - studySettings                                              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Native Fetch API
- **Charts:** Recharts (for admin analytics)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** JavaScript
- **ODM:** Mongoose
- **Security:** Helmet, CORS, express-rate-limit
- **Validation:** express-validator

### Database
- **Development:** MongoDB (local)
- **Production:** MongoDB Atlas
- **Storage:** GridFS for large file storage (if needed)

### Authentication
- **Method:** HTTP-only cookies
- **Session:** Server-side session storage
- **Password:** bcrypt hashing (for admin)

### Deployment
- **Frontend:** Vercel
- **Backend:** Production Node hosting (e.g., Railway, Render, DigitalOcean)
- **Database:** MongoDB Atlas
- **CDN:** Vercel Edge Network

## Data Flow

### Participant Flow
1. User visits frontend (Vercel)
2. Frontend makes API requests to backend
3. Backend processes requests
4. Backend queries/updates MongoDB
5. Backend returns JSON response
6. Frontend displays results

### Admin Flow
1. Admin logs in (backend creates session)
2. Session stored server-side
3. HTTP-only cookie sent to frontend
4. Authenticated requests include cookie
5. Backend verifies session
6. Admin accesses protected resources

## Security Architecture

### Frontend Security
- Content Security Policy headers
- XSS prevention (React escaping)
- HTTPS only in production
- No sensitive data in localStorage
- Input validation

### Backend Security
- Helmet security headers
- CORS configuration
- Rate limiting (100 requests / 15 minutes)
- Request size limits (10MB)
- Input validation and sanitization
- SQL injection prevention (MongoDB parameterized queries)
- Authentication middleware
- Authorization checks
- Audit logging

### Database Security
- Encrypted connections (TLS)
- IP whitelist (production)
- Authentication required
- Role-based access control
- Regular automated backups
- Encryption at rest (MongoDB Atlas)

### Session Security
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag (HTTPS only)
- SameSite attribute
- Short session lifetime
- Session rotation after privilege escalation

## API Architecture

### RESTful Endpoints

**Public Endpoints**
- `GET /api/health` - Health check
- `POST /api/participants/register` - Register participant
- `POST /api/consent` - Submit consent
- `GET /api/questionnaires` - Get questionnaires

**Protected Participant Endpoints**
- `GET /api/participants/:id` - Get participant profile
- `POST /api/experiment/start` - Start experiment
- `POST /api/experiment/response` - Submit response
- `POST /api/questionnaires/response` - Submit questionnaire

**Admin Endpoints**
- `POST /api/admin/login` - Admin login
- `GET /api/admin/participants` - List participants
- `GET /api/admin/responses` - View responses
- `POST /api/admin/coding` - Code responses
- `GET /api/admin/export` - Export data
- `GET /api/admin/analytics` - View analytics

### Response Format
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

### Error Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Field-specific error"]
}
```

## Database Schema

See [database-schema.md](./database-schema.md) for detailed schema documentation.

## Scalability Considerations

### Current Architecture (Phase 1)
- Single backend server
- MongoDB Atlas (scalable by default)
- Vercel (edge network, auto-scaling)

### Future Scaling Options
- Horizontal scaling: Multiple backend instances behind load balancer
- Database: MongoDB Atlas auto-scaling, read replicas
- Caching: Redis for session storage and caching
- CDN: Cloudflare for static assets
- Message queue: For background jobs (data export, email)

## Monitoring and Logging

### Application Logs
- Request/response logging
- Error tracking
- Performance monitoring

### Audit Logs
- Admin actions
- Data access
- Participant actions
- System events

### Metrics (Future)
- Response times
- Error rates
- Database performance
- Active users

## Backup and Recovery

### Database Backups
- Automated daily backups (MongoDB Atlas)
- Point-in-time recovery
- Backup retention: 30 days

### Disaster Recovery
- Database: Restore from backup
- Application: Redeploy from Git repository
- Configuration: Environment variables in secure storage

## Compliance and Privacy

### Data Protection
- Minimal data collection
- Encryption in transit and at rest
- De-identification for analysis
- Secure deletion on withdrawal

### Access Control
- Role-based access
- Audit logging
- Least privilege principle
- Regular access review

---

**Document Version:** 1.0  
**Last Updated:** Phase 1  
**Status:** Implementation in progress
