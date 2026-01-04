# AI Development Companion Guide

## Purpose

This document serves as a **living development log** and **AI instruction guide**. Any AI assistant (GitHub Copilot, Claude, ChatGPT, etc.) working on this project should:

1. **Read this file first** to understand the project's evolution
2. **Update this file** after implementing significant changes
3. **Follow the documentation standards** defined here

This guide is **system-agnostic** — copy it to any project's `docs/` folder.

---

## 📋 Instructions for AI Assistants

### Before Starting Work

1. **Read the Development Log** (below) to understand:
   - What features exist
   - Recent changes and their reasoning
   - Known issues or limitations
   - Architectural decisions made

2. **Check the Current State** section for:
   - Active features
   - Deprecated features pending removal
   - Work in progress

3. **Understand Dependencies** between features before modifying

### After Completing Work

**Always update this file** with:

1. **New features** — What was added and why
2. **Modifications** — What changed and the implications
3. **Removals** — What was removed and why
4. **Breaking changes** — What might affect other parts of the system
5. **Technical decisions** — Why a particular approach was chosen

### Documentation Format

Use this template for each entry:

```markdown
### [DATE] - Brief Title

**Type:** Feature | Enhancement | Fix | Refactor | Removal

**Summary:**
One paragraph explaining what was done.

**Details:**
- Specific change 1
- Specific change 2

**Files Affected:**
- `path/to/file.py` - Description of changes

**Implications:**
- How this affects other parts of the system
- Breaking changes (if any)
- Migration steps needed (if any)

**Technical Decisions:**
- Why this approach was chosen over alternatives
```

---

## 🏗️ Project Architecture Overview

> **AI: Update this section when architectural changes are made**

### Core Structure

```
project-root/
├── docs/                    # Documentation
│   ├── AI_DEVELOPMENT_GUIDE.md  # This file
│   ├── FEATURES.md          # Feature documentation
│   └── COMMIT_GUIDELINES.md # Commit standards
├── models/                  # SQLAlchemy database models
│   ├── user.py             # User accounts & authentication
│   ├── patient.py          # Patient records with medical data
│   ├── appointment.py      # Appointment scheduling
│   ├── medical_record.py   # Medical records & history
│   ├── audit_log.py        # Database audit logging
│   └── user_session.py     # Session tracking
├── routes/                  # API route blueprints
│   ├── auth_routes.py      # Authentication & registration
│   ├── patient_routes.py   # Patient CRUD operations
│   ├── appointment_routes.py
│   ├── medical_record_routes.py
│   ├── admin_routes.py     # Admin-only endpoints
│   └── user_routes.py
├── services/                # Business logic services
│   ├── email_service.py    # Email sending
│   ├── logging_service.py  # ActivityLogger for file logs
│   └── notification_service.py
├── public/                  # Frontend static files
│   ├── *.html              # HTML pages
│   ├── css/                # Stylesheets
│   └── js/                 # JavaScript files
├── scripts/                 # Utility scripts
│   ├── admin/              # Admin management (create_admin.py)
│   ├── database/           # DB migrations (migrate_db.py)
│   └── utilities/          # Debug helpers (check_users.py)
├── tests/                   # Test suite
├── migrations/              # Alembic migrations
├── logs/                    # Log files (gitignored)
└── instance/                # SQLite database (gitignored)
```

### Key Patterns Used

| Pattern | Location | Description |
|---------|----------|-------------|
| Factory Pattern | `app.py` | `create_app()` for Flask initialization |
| Blueprint Pattern | `routes/` | Modular route organization |
| Service Layer | `services/` | Business logic separated from routes |
| Repository Pattern | `models/` | SQLAlchemy models with `to_dict()` methods |
| Singleton Logger | `services/logging_service.py` | `ActivityLogger` static methods |

### Integration Points

| Integration | Purpose | Configuration |
|-------------|---------|---------------|
| Flask-JWT-Extended | JWT authentication | `config.py` |
| Flask-SocketIO | Real-time updates | `extensions.py` |
| SQLAlchemy | Database ORM | `extensions.py` |
| Flask-Migrate/Alembic | Schema migrations | `migrations/` |
| SMTP (Gmail) | Email sending | `.env` file |

---

## 📊 Current State

> **AI: Keep this section updated with the current project state**

### ✅ Active Features

| Feature | Status | Added | Notes |
|---------|--------|-------|-------|
| JWT Authentication | Stable | 2025 | 24hr access, 30-day refresh tokens |
| Patient Account Auto-Linking | Stable | 2026-01 | Email → Name+DOB → Name fallback matching |
| Case-Insensitive Email Matching | Stable | 2026-01 | Uses `db.func.lower()` throughout |
| Patient Portal Dashboard | Stable | 2026-01 | Calendar, profile, records, notifications |
| Comprehensive Audit Logging | Stable | 2025 | auth.log, patient.log, security.log, etc. |
| Role-Based Access Control | Stable | 2025 | Admin, Doctor, Nurse, Patient roles |
| Real-Time Notifications | Stable | 2025 | Socket.IO with Web Audio API sounds |
| Multi-Patient Disambiguation | Stable | 2026-01 | DOB+Name+NIN verification for duplicates |
| User Session Tracking | Stable | 2025 | IP, user agent, activity logging |
| Account Blocking | Stable | 2025 | Admin can block suspicious accounts |

### 🚧 Work in Progress

| Feature | Status | Started | Blockers |
|---------|--------|---------|----------|
| Email Notifications | Partial | 2025 | SMTP configuration required |

### ⚠️ Deprecated (Pending Removal)

| Feature | Deprecated | Removal Target | Migration Path |
|---------|------------|----------------|----------------|
| *None currently* | - | - | - |

### 🐛 Known Issues

| Issue | Severity | Workaround | Fix ETA |
|-------|----------|------------|---------|
| Twins with same name+DOB | Low | NIN verification required | N/A (by design) |

---

## 📝 Development Log

> **AI: Add new entries at the TOP of this section (newest first)**

---

### [Template Entry - Copy This]

**Type:** Feature | Enhancement | Fix | Refactor | Removal

**Summary:**
Brief description of what was done.

**Details:**
- Change 1
- Change 2

**Files Affected:**
- `path/to/file` - What changed

**Implications:**
- Impact on other features
- Breaking changes

**Technical Decisions:**
- Why this approach was chosen

---

<!-- 
=============================================================================
AI: ADD NEW ENTRIES BELOW THIS LINE (Above the template, newest first)
=============================================================================
-->

### 2026-01-04 - Automated Patient Account Matching & Project Reorganization

**Type:** Feature | Enhancement | Refactor

**Summary:**
Implemented intelligent patient record auto-linking that connects new user registrations to existing patient records created by healthcare providers. Also reorganized project structure by moving scripts to organized subfolders and created comprehensive documentation.

**Details:**
- Added case-insensitive email matching using `db.func.lower()` throughout auth system
- Implemented 3-tier matching hierarchy: Email → Name+DOB → Name-only fallback
- Added multi-patient disambiguation using DOB, name, and NIN verification
- Fixed race condition where appointments/records loaded before patient_id was set
- Fixed page detection to prevent provider dashboard code running on patient dashboard
- Added patient email display in "View Patient Data" modal
- Reorganized scripts from root directory into `scripts/admin/`, `scripts/database/`, `scripts/utilities/`
- Created comprehensive feature documentation

**Files Affected:**
- `routes/auth_routes.py` - Case-insensitive matching, name+DOB fallback, auto-linking
- `public/js/app.js` - Page detection fix, patient email in modal
- `public/js/patient-dashboard.js` - Sequential data loading (await loadPatientInfo first)
- `public/patient-dashboard.html` - Version cache busting
- `public/dashboard.html` - Version cache busting
- `docs/FEATURES.md` - Created comprehensive feature documentation
- `docs/COMMIT_GUIDELINES.md` - Created reusable commit style guide
- `scripts/` - Reorganized into admin/, database/, utilities/ subfolders

**Implications:**
- Patients registering with provider-created email now auto-link without manual DB intervention
- Patients with mismatched emails can still link via name+DOB matching
- Multiple patients with same email require NIN for disambiguation
- Frontend loads data in correct order preventing empty dashboard issues

**Technical Decisions:**
- Used `db.func.lower()` for case-insensitive matching (database-level, more reliable than Python `.lower()`)
- Sequential loading instead of parallel for dependent data (patient_id must exist before fetching appointments)
- Three-tier matching provides flexibility without sacrificing security (NIN required for ambiguous cases)



---

## 🔧 Development Standards

### Code Style

> **AI: Follow these standards when writing code**

- Follow language-specific conventions (PEP 8 for Python, ESLint for JS, etc.)
- Write self-documenting code with clear variable/function names
- Add comments for complex logic, not obvious code
- Include docstrings for public functions/classes

### Testing Requirements

- New features should include tests
- Bug fixes should include regression tests
- Maintain or improve code coverage

### Documentation Requirements

- Update this file for significant changes
- Update FEATURES.md when adding/modifying features
- Follow COMMIT_GUIDELINES.md for commit messages

---

## 🚀 Feature Development Workflow

### Adding a New Feature

1. **Document first** — Add to "Work in Progress" above
2. **Implement** — Write code following project patterns
3. **Test** — Add appropriate tests
4. **Document completion** — Move to "Active Features" + add log entry
5. **Commit** — Follow commit guidelines

### Modifying Existing Features

1. **Check implications** — What depends on this feature?
2. **Maintain backward compatibility** when possible
3. **Document breaking changes** clearly
4. **Update all affected documentation**

### Removing Features

1. **Deprecate first** — Add to "Deprecated" section
2. **Provide migration path** — Document how to transition
3. **Set removal timeline** — Give users time to adapt
4. **Remove and document** — Add removal log entry

---

## 📐 Architectural Decisions Record (ADR)

> **AI: Document significant architectural decisions here**

### ADR Template

```markdown
### ADR-[NUMBER]: [Title]

**Date:** YYYY-MM-DD

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
What situation prompted this decision?

**Decision:**
What was decided?

**Consequences:**
- Positive outcomes
- Negative tradeoffs
- Risks

**Alternatives Considered:**
1. Alternative A - Why not chosen
2. Alternative B - Why not chosen
```

---

<!-- 
=============================================================================
AI: ADD ARCHITECTURAL DECISION RECORDS BELOW THIS LINE
=============================================================================
-->



---

## 🔄 Migration Guides

> **AI: Document migration steps when breaking changes are introduced**

### Migration Template

```markdown
### Migrating from [Old] to [New]

**When:** Required for versions after X.X.X

**Breaking Changes:**
1. Change 1
2. Change 2

**Steps:**
1. Step 1
2. Step 2

**Verification:**
How to confirm migration succeeded
```

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| [FEATURES.md](FEATURES.md) | Detailed feature documentation |
| [COMMIT_GUIDELINES.md](COMMIT_GUIDELINES.md) | Commit message standards |
| README.md (root) | Project overview and setup |

---

## 🤖 AI Session Handoff Checklist

When ending an AI session, ensure:

- [ ] This file is updated with changes made
- [ ] New features are documented in the log
- [ ] Breaking changes are noted
- [ ] "Current State" section reflects reality
- [ ] Any WIP items are noted in "Work in Progress"
- [ ] Commit was made with detailed message

---

## 📋 Using This Template in Other Projects

1. Copy this file to `docs/AI_DEVELOPMENT_GUIDE.md`
2. Clear the example entries
3. Fill in project-specific architecture
4. Add initial feature inventory to "Current State"
5. Reference this file in your main README

```bash
# Quick copy command
cp docs/AI_DEVELOPMENT_GUIDE.md /path/to/new-project/docs/
```

---

*This guide ensures continuity across AI sessions and maintains a comprehensive development history.*

*Last Updated: January 2026*
