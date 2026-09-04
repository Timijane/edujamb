# EduJAMB Phase 1 Authentication

This batch adds the authentication foundation without replacing the existing CMS/admin work.

## Portals

- Student: `/register`, `/login`, `/onboarding`, `/dashboard`
- Teacher: `/teacher/login`, `/teacher`
- Delegated staff: `/staff/login`, `/staff`
- Super Admin: existing `/admin/login`, `/admin`

## Delegated accounts

Only the existing `super_admin` can create `admin`, `supporter`, or `teacher` accounts from `/admin/team`.

Passwords are managed by Firebase Authentication. They are not stored in Firestore.

Co-admin/supporter accounts must use the Staff Portal; they do not enter the Super Admin console.

Teacher accounts use the Teacher Portal.

## Backend

Sensitive account creation and onboarding operations use Firebase Admin SDK server-side.

Firestore Security Rules still need to be merged with the existing CMS rules before production student writes are enabled.
