# Data Management Plan

## Overview
This document outlines data handling, security, and management practices for the Cyberbullying Research Platform.

## Data Collection Principles

### Minimization
Collect only data necessary for research objectives:
- ✅ Required: Demographics, experimental responses, questionnaire responses
- ❌ Not collected: Names, photos, precise locations, browsing history

### Transparency
Participants informed about:
- What data is collected
- How data is used
- How long data is retained
- Who has access

### Security
All data protected through:
- Encryption in transit (HTTPS/TLS)
- Encryption at rest (MongoDB Atlas)
- Access controls
- Audit logging

---

## Data Types

### Personal Data
**Directly Identifying:**
- None intentionally collected
- Email (optional) - for follow-up only

**Potentially Identifying:**
- Age
- Gender
- Institution
- Program
- Academic year
- IP address (for duplicate detection only)

**De-identification:**
- Participant ID (e.g., P0001) used instead of names
- IP addresses hashed and not exported
- Email addresses not exported with research data

### Research Data
**Experimental:**
- Condition assignment (anonymous/identified)
- Video response text
- Response timing
- Aggression coding

**Questionnaire:**
- Item responses
- Response timing
- Computed scores

**Administrative:**
- Timestamps
- Completion status
- Withdrawal status

---

## Data Storage

### Database Structure
```
MongoDB Atlas Cluster (Production)
├── cyberbullying-research (database)
│   ├── participants
│   ├── consents
│   ├── videoResponses
│   ├── questionnaires
│   ├── questionnaireResponses
│   ├── codings
│   ├── admins
│   ├── auditLogs
│   └── studySettings
```

### Storage Location
- **Provider:** MongoDB Atlas
- **Region:** [To be determined - closest to Pakistan]
- **Encryption:** AES-256 at rest
- **Backup:** Automated daily

### Access Control
- Application-level authentication
- Database-level authentication
- IP whitelist (production only)
- Role-based permissions

---

## Data Lifecycle

### 1. Collection
- Data entered via web forms
- Validated before storage
- Timestamps recorded
- Audit log created

### 2. Storage
- Encrypted at rest
- Replicated across availability zones
- Backed up daily
- Access logged

### 3. Processing
- Accessed only by authorized personnel
- Changes logged in audit trail
- De-identified for analysis
- Never modified unless correcting errors

### 4. Analysis
- Export de-identified data only
- Statistical analysis in SPSS/R
- Results reported in aggregate only
- Individual responses never published

### 5. Archival
- Retained for 7 years post-publication (per institutional policy)
- Kept in secure long-term storage
- Backup maintained

### 6. Deletion
- After retention period or participant withdrawal
- Secure deletion (not recoverable)
- Audit log entry created
- Aggregated data retained

---

## Data Security Measures

### Technical Security
- **Encryption in transit:** TLS 1.2+
- **Encryption at rest:** AES-256
- **Password hashing:** bcrypt (admin accounts)
- **Session management:** HTTP-only cookies, server-side sessions
- **Input validation:** All user inputs sanitized
- **Rate limiting:** Prevent brute force attacks
- **Security headers:** Helmet.js implementation

### Administrative Security
- **Access control:** Minimum necessary access
- **Authentication:** Multi-factor authentication (admin, future)
- **Audit logging:** All data access logged
- **Regular reviews:** Quarterly access audits
- **Training:** Security awareness for research team

### Physical Security
- **Cloud hosting:** MongoDB Atlas, Vercel, Railway
- **Data centers:** SOC 2 compliant
- **Geographic redundancy:** Multi-region backups

---

## Access Control

### Participant Access
- Own data only (via participant ID session)
- Read-only after submission
- Can withdraw (marks as withdrawn, retains data)

### Admin Roles

**Superadmin:**
- Full system access
- User management
- Configuration changes
- Data export

**Researcher:**
- View all participant data
- Export de-identified data
- View analytics
- No system configuration

**Coder:**
- View responses for coding
- Submit aggression ratings
- View own coding history
- No personal data access

### Access Logging
All data access logged with:
- Who accessed
- What was accessed
- When accessed
- Action performed
- IP address

---

## Data Backup and Recovery

### Backup Strategy
**MongoDB Atlas:**
- Automated daily backups
- Point-in-time recovery
- Backup retention: 30 days
- Geographic redundancy

**Application Code:**
- Git version control
- GitHub repository
- Tagged releases

**Configuration:**
- Environment variables in secure vault
- Infrastructure as code (future)

### Recovery Procedures
**Database corruption:**
1. Identify issue
2. Stop application
3. Restore from most recent backup
4. Verify data integrity
5. Resume operation
6. Investigate cause

**Accidental deletion:**
1. Identify affected records
2. Restore from point-in-time backup
3. Verify restoration
4. Document incident

**Disaster recovery:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours (last backup)

---

## Data Export and Sharing

### De-identification Process
Before export, remove/hash:
- Email addresses
- IP addresses
- Exact timestamps (round to day)
- Any free-text that might identify

Retain:
- Participant ID (for linking)
- Demographics (age, gender, institution, program)
- Condition assignment
- Response text (screened for identifying info)
- Questionnaire responses
- Computed scores
- Aggression coding

### Export Formats
- **CSV:** For SPSS, Excel
- **JSON:** For R, Python
- **SPSS:** Direct format (future)

### Sharing Guidelines
**Within Research Team:**
- De-identified data on secure shared drive
- Access controlled
- No personal data shared

**Publication/Presentation:**
- Aggregate statistics only
- No individual responses
- No potentially identifying details

**Data Repository (future):**
- De-identified dataset
- After publication
- Open Science Framework or similar
- With ethics approval

---

## Participant Rights

### Right to Access
Participants can request:
- Their own data
- Confirmation of data storage
- How data is being used

### Right to Withdrawal
Participants can:
- Withdraw at any time
- Request data deletion
- Partial data retained if consented for aggregate analysis

### Right to Correction
Participants can request:
- Correction of demographic errors
- Does not apply to experimental/questionnaire responses

### Right to Portability
Participants can request:
- Copy of their data
- In machine-readable format (JSON/CSV)

---

## Compliance

### Institutional Requirements
- IRB/Ethics approval required before data collection
- Annual review submission
- Protocol amendments submitted for approval
- Adverse events reported

### Privacy Regulations
- Comply with local data protection laws
- GDPR principles followed (if applicable)
- Informed consent documented
- Data minimization practiced

### Research Standards
- APA ethical guidelines
- Open science practices
- Pre-registration (if planned)
- Data sharing (after publication, if appropriate)

---

## Quality Assurance

### Data Validation
- Input validation on submission
- Range checks on numeric data
- Required field enforcement
- Duplicate detection (IP-based)

### Data Integrity
- Database constraints
- Transaction consistency
- Regular integrity checks
- Audit trail validation

### Data Cleaning
- Check for missing data
- Identify outliers
- Screen free-text for quality
- Document cleaning procedures

---

## Incident Response

### Data Breach Procedure
1. **Detect:** Identify breach
2. **Contain:** Isolate affected systems
3. **Assess:** Determine scope and impact
4. **Notify:** Inform relevant parties (IRB, participants if needed)
5. **Remediate:** Fix vulnerabilities
6. **Document:** Record incident and response
7. **Review:** Update procedures

### Breach Notification
Required if:
- Unauthorized access to personal data
- Data loss or corruption
- Security compromise

Notify within:
- 24 hours: Research team, IRB
- 72 hours: Affected participants (if high risk)

---

## Documentation

### Required Documentation
- Data dictionary (variable definitions)
- Codebook (coding schemes)
- Analysis plan (statistical methods)
- Data cleaning log
- Access log
- Incident log

### Metadata
Each dataset includes:
- Study title
- Date range
- Sample size
- Variable list
- Data dictionary
- Citation information

---

## Training

### Research Team Training
Required for all team members:
- Data security practices
- Ethics compliance
- Platform usage
- Incident response
- Confidentiality agreement

### Coder Training
Required for coders:
- Aggression coding scheme
- Reliability procedures
- Data confidentiality
- Platform coding interface

---

## Review and Updates

### Regular Reviews
- **Quarterly:** Access permissions
- **Annually:** Security practices
- **After incidents:** Procedures and protocols
- **Before phases:** Data management updates

### Document Updates
This plan updated when:
- New data types collected
- Security measures change
- Regulations change
- Incidents occur

---

**Document Version:** 1.0  
**Last Updated:** Phase 1  
**Next Review:** Before Phase 2 data collection  
**Owner:** Principal Investigator
