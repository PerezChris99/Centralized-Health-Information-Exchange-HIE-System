# Known Issues & Roadmap

This document tracks known issues that need to be addressed before/during production use.

---

## 🔴 Critical Issues (Must Fix Before Production)

### 1. No Rate Limiting on Lo gin

**Problem:** Users can brute-force passwords with unlimited login attempts.

**Current State:** No rate limiting implemented on `/api/auth/login` endpoint.

**Impact:** Security vulnerability - attackers can attempt thousands of passwords.

**Fix Needed:** 
- Add rate limiting (e.g., 5 attempts per 15 minutes per IP/email)
- Lock account temporarily after X failed attempts
- Log and alert on suspicious activity

**Files to Modify:**
- `routes/auth_routes.py`
- Consider using Flask-Limiter package

---

### 2. No Token Refresh Mechanism in Frontend

**Problem:** When the 24-hour access token expires, users get logged out abruptly mid-work.

**Current State:** Frontend just redirects to login on 401 response. No automatic token refresh.

**Impact:** Poor user experience - users lose unsaved work and have to re-login frequently.

**Fix Needed:**
- Check token expiry before it expires
- Automatically call `/api/auth/refresh` endpoint
- Seamlessly replace old token with new one
- Only redirect to login if refresh also fails

**Files to Modify:**
- `public/js/app.js` - API request handler
- Add token expiry checking logic

---

### 3. SQLite Concurrency Limitations

**Problem:** SQLite locks the entire database during writes. With multiple concurrent users, you'll get "database is locked" errors.

**Current State:** Using SQLite for all environments including production.

**Impact:** Application crashes/errors when multiple users perform actions simultaneously.

**Fix Needed:**
- Short-term: Add proper connection pooling and retry logic
- Long-term: Migrate to PostgreSQL for production
- Add database connection error handling

**Files to Modify:**
- `config.py` - Database configuration
- `extensions.py` - SQLAlchemy setup
- Consider adding `?timeout=30&check_same_thread=False` to SQLite URI

---

### 4. No Password Complexity Requirements

**Problem:** Users can set weak passwords like "123456" or "password".

**Current State:** No password validation beyond existence check.

**Impact:** Security vulnerability - weak passwords are easily guessed or cracked.

**Fix Needed:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: At least one special character
- Show password strength indicator on registration

**Files to Modify:**
- `routes/auth_routes.py` - Registration endpoints
- `models/user.py` - Add validation method
- `public/js/auth.js` - Client-side validation

---

## 🟠 High Priority Issues

### 5. Duplicate Patient Records

**Problem:** Same person can be registered multiple times by different healthcare providers.

**Current State:** No deduplication mechanism. Each provider can create a new patient record for the same person.

**Impact:** 
- Fragmented medical history
- Incorrect treatment decisions
- Wasted storage and confusion

**Fix Needed:**
- Add duplicate detection based on:
  - NIN (National Identification Number) - should be unique
  - Name + DOB + Gender combination
  - Phone number
- Warn provider when potential duplicate detected
- Allow admin to merge duplicate records

**Files to Modify:**
- `routes/patient_routes.py` - Add duplicate check before creation
- `routes/admin_routes.py` - Add merge functionality
- `public/js/dashboard.js` - Show duplicate warning UI

---

### 6. No Session Timeout on Inactivity

**Problem:** Users stay logged in indefinitely even if they walk away from their computer.

**Current State:** Token valid for 24 hours regardless of activity. No idle detection.

**Impact:** 
- Security risk in shared/public computers
- HIPAA/data protection compliance issues
- Unauthorized access to patient data

**Fix Needed:**
- Track user activity (mouse, keyboard, API calls)
- Show warning modal after 25 minutes of inactivity
- Auto-logout after 30 minutes of inactivity
- Allow users to click "Stay Logged In" to reset timer

**Files to Modify:**
- `public/js/app.js` - Add idle detection
- Add inactivity modal to dashboard pages
- Consider server-side session invalidation

---

### 7. No Offline Handling

**Problem:** Uganda has unreliable internet. The app breaks completely when connection drops.

**Current State:** No offline support. All actions require active connection. No feedback when offline.

**Impact:**
- App appears frozen/broken during network issues
- Users don't know if their action succeeded
- Data entry lost when submitting during outage

**Fix Needed:**
- Detect online/offline status
- Show offline banner when connection lost
- Queue non-critical requests for retry
- Show clear status: "Saving...", "Saved", "Offline - will sync when online"
- Use localStorage for critical pending actions

**Files to Modify:**
- `public/js/app.js` - Add network detection
- `public/css/main.css` - Add offline banner styles
- All HTML files - Add offline indicator element

---

## Implementation Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Rate Limiting on Login | Medium | Critical Security |
| 2 | Password Complexity | Low | Critical Security |
| 3 | Token Auto-Refresh | Medium | User Experience |
| 4 | Offline Handling | Medium | Uganda-Specific |
| 5 | Session Timeout | Medium | Security/Compliance |
| 6 | Duplicate Detection | High | Data Integrity |
| 7 | SQLite Concurrency | High | Scalability |

---

## Status Tracking

| Issue | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Rate Limiting | ⏳ Pending | - | - | - |
| Token Refresh | ⏳ Pending | - | - | - |
| SQLite Concurrency | ⏳ Pending | - | - | - |
| Password Complexity | ⏳ Pending | - | - | - |
| Duplicate Patients | ⏳ Pending | - | - | - |
| Session Timeout | ⏳ Pending | - | - | - |
| Offline Handling | ⏳ Pending | - | - | - |

---

*Last Updated: January 4, 2026*
