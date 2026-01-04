# Commit Message Guidelines

## Overview

This document defines the commit message standards for this project. These guidelines are designed to be **reusable across any project** — simply copy this file to your new repository's `docs/` folder.

Well-crafted commit messages serve as documentation, aid debugging, and make code reviews more effective.

---

## Why Detailed Commits Matter

1. **Debugging** - When something breaks, you can trace back to the exact commit that introduced the change
2. **Code Reviews** - Reviewers understand the *why* behind changes, not just the *what*
3. **Onboarding** - New team members learn the codebase through commit history
4. **Documentation** - Commits become living documentation of design decisions
5. **Rollbacks** - Clear commits make it easy to identify what to revert

---

## Commit Message Structure

```
<type>: <Short summary in imperative mood> (max 72 chars)

## 🎯 Feature/Fix Overview (if applicable)

### What Was Done
Brief description of the change.

### Why It Was Done
Explain the reasoning, problem solved, or feature added.

### How It Works
Technical explanation with code snippets if helpful.

---

## 📁 Files Changed

### Added
- path/to/new/file.py - Description

### Modified  
- path/to/changed/file.py - What changed and why

### Removed
- path/to/deleted/file.py - Why it was removed

---

## Technical Details (for complex changes)

### Before (Problem)
```code
// What the code looked like before
```

### After (Solution)
```code
// What the code looks like now
```

---

## Testing Notes (if applicable)

- How to test this change
- Edge cases considered

---

## Related Issues/PRs

- Fixes #123
- Related to #456
```

---

## Commit Types

Use these prefixes to categorize commits:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: Add patient account auto-linking` |
| `fix` | Bug fix | `fix: Resolve race condition in data loading` |
| `docs` | Documentation only | `docs: Update API endpoint documentation` |
| `style` | Formatting, no code change | `style: Format auth_routes.py with black` |
| `refactor` | Code restructuring | `refactor: Extract email matching to helper` |
| `perf` | Performance improvement | `perf: Add database index on patient email` |
| `test` | Adding/updating tests | `test: Add patient registration test cases` |
| `chore` | Maintenance tasks | `chore: Update dependencies in requirements.txt` |
| `security` | Security improvements | `security: Add rate limiting to login endpoint` |
| `revert` | Reverting changes | `revert: Undo commit abc123 (broke login)` |

---

## Emoji Guide (Optional but Encouraged)

Use emojis to make sections scannable:

| Emoji | Meaning |
|-------|---------|
| 🔗 | Linking/Integration features |
| 🐛 | Bug fixes |
| 📊 | Data/Dashboard related |
| 🔧 | Configuration/Tooling |
| 📁 | File organization |
| 📚 | Documentation |
| 🔄 | Updates/Sync |
| 🛡️ | Security |
| ⚡ | Performance |
| 🧪 | Testing |
| 🎨 | UI/Styling |
| ✅ | Completed feature |
| 🚀 | Deployment/Release |

---

## Examples

### ✅ Good Commit (Detailed)

```
feat: Add user authentication with OAuth2 support

## 🔗 OAuth2 Authentication Integration

### What Was Done
Implemented OAuth2 authentication flow supporting Google and GitHub providers,
with automatic account linking for existing users.

### Why It Was Done
Users requested social login options to avoid managing another password.
This also improves security by leveraging established OAuth providers.

### How It Works

1. **Provider Selection**
   - User clicks "Login with Google" or "Login with GitHub"
   - Redirected to provider's OAuth consent screen

2. **Token Exchange**
   - Callback receives authorization code
   - Server exchanges code for access token

3. **Account Linking**
   - If email exists, links OAuth to existing account
   - If new email, creates new user account

### Code Example
```python
# OAuth callback handler
@auth_bp.route('/oauth/callback/<provider>')
def oauth_callback(provider):
    token = oauth.fetch_token(provider)
    user_info = oauth.get_user_info(provider, token)
    user = User.find_or_create_by_email(user_info['email'])
    return create_session(user)
```

---

## Files Changed

### Modified
- routes/auth_routes.py
  - Added OAuth callback endpoints
  - Updated login to check OAuth links

### Added
- services/oauth_service.py - OAuth provider abstraction
- docs/OAUTH_SETUP.md - Configuration documentation

---

## Testing Notes

1. Click "Login with Google" → redirects to Google → returns authenticated
2. Use same email as existing account → links automatically
3. Revoke OAuth access → can still login with password
```

### ❌ Bad Commit (Vague)

```
fix: fixed stuff
```

```
update: changes to auth
```

```
wip: working on patient feature
```

---

## Commit Size Guidelines

### Ideal Commit
- **One logical change** per commit
- Can be explained in a clear summary line
- Related changes grouped together
- Tests included with the change

### When to Split Commits
- Feature + unrelated refactor → 2 commits
- Bug fix + new feature → 2 commits  
- Multiple independent bug fixes → separate commits

### When to Combine
- Feature + its tests → 1 commit
- Refactor + formatting of same files → 1 commit
- Related file moves/renames → 1 commit

---

## Branch Naming Convention

```
<type>/<short-description>

Examples:
- feat/patient-auto-linking
- fix/login-race-condition
- docs/api-documentation
- refactor/auth-service-cleanup
```

---

## Commit Message Checklist

Before committing, verify:

- [ ] **Summary line** is under 72 characters
- [ ] **Type prefix** is appropriate (feat, fix, docs, etc.)
- [ ] **Imperative mood** used ("Add feature" not "Added feature")
- [ ] **Why** is explained, not just what
- [ ] **Breaking changes** are clearly noted
- [ ] **Files changed** are listed for significant commits
- [ ] **Code examples** included for complex logic
- [ ] **Testing notes** added if applicable
- [ ] **No sensitive data** in commit message (passwords, keys)

---

## Multi-File Commits

For commits touching many files, organize by category:

```
## 📁 Project Reorganization

### Scripts Reorganized
Moved utility scripts from root to organized subfolders:

```
scripts/
├── admin/
│   ├── create_admin.py
│   └── reset_passwords.py
├── database/
│   ├── migrate_db.py
│   └── migrate_patient_user.py
└── utilities/
    ├── check_users.py
    └── fix_patient_role.py
```

### Added
- scripts/admin/create_admin.py - Moved from scripts/
- scripts/admin/reset_passwords.py - Moved from root
- scripts/README.md - Usage documentation

### Removed
- check_users.py (moved to scripts/utilities/)
- reset_passwords.py (moved to scripts/admin/)
```

---

## Tools & Automation

### Git Hooks (Optional)
Consider using commit-msg hooks to enforce format:

```bash
# .git/hooks/commit-msg
# Enforce type prefix
if ! grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore|security|revert):" "$1"; then
    echo "Error: Commit message must start with type prefix"
    exit 1
fi
```

### VS Code Extensions
- **Conventional Commits** - Helps format commit messages
- **Git Lens** - Visualize commit history

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMIT MESSAGE FORMAT                     │
├─────────────────────────────────────────────────────────────┤
│  <type>: <summary in imperative mood>                       │
│                                                             │
│  ## 🎯 Overview                                             │
│  What was done and why                                      │
│                                                             │
│  ## 💡 How It Works                                         │
│  Technical details with code examples                       │
│                                                             │
│  ## 📁 Files Changed                                        │
│  - Added: new files                                         │
│  - Modified: changed files                                  │
│  - Removed: deleted files                                   │
│                                                             │
│  ## 🧪 Testing                                              │
│  How to verify the change                                   │
├─────────────────────────────────────────────────────────────┤
│  Types: feat | fix | docs | style | refactor | perf |       │
│         test | chore | security | revert                    │
└─────────────────────────────────────────────────────────────┘
```

---

*These guidelines ensure our commit history remains a valuable resource for the entire team. When in doubt, err on the side of more detail rather than less.*

---

## 📋 Using This Template in Other Projects

1. Copy this file to your new project's `docs/` folder
2. Customize the emoji guide if needed for your domain
3. Add project-specific examples to the "Good Commit" section
4. Share with your team and reference in CONTRIBUTING.md

```bash
# Quick copy command
cp docs/COMMIT_GUIDELINES.md /path/to/new-project/docs/
```

---

*Last Updated: January 2026*
