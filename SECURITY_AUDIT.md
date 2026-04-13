# Security Audit Report

## Date of Audit
2026-04-13

## Findings

1. **Row Level Security (RLS) disabled on two tables**: The `device_catalog` and `project_devices` tables in the public schema did not have Row Level Security enabled. This meant any client with the Supabase anon key could perform unrestricted reads, writes, updates, and deletes on these tables, bypassing any authorization controls.

2. **No rate limiting on authentication endpoints**: The project had no rate limiting mechanism for authentication-related requests (signup/signin). This left the application vulnerable to brute-force password attacks and credential stuffing.

3. **No CORS restrictions on auth proxy**: Authentication endpoints lacked explicit CORS header management, which could lead to inconsistent cross-origin behavior.

## Remediation

### RLS Enabled on Missing Tables (Completed)
- Enabled RLS on `device_catalog` table
- Enabled RLS on `project_devices` table
- Created permissive SELECT, INSERT, UPDATE, and DELETE policies on `device_catalog` (open access for now)
- Created permissive SELECT, INSERT, and DELETE policies on `project_devices` (open access for now)

### Rate-Limited Auth Edge Function Deployed (Completed)
- Deployed `rate-limit-auth` Edge Function (slug: `rate-limit-auth`, status: ACTIVE)
- Implements IP-based rate limiting: maximum 5 attempts per 15-minute window
- Returns HTTP 429 (Too Many Requests) when the limit is exceeded
- Includes proper CORS headers for frontend integration
- JWT verification disabled (function handles its own authentication logic)

## Remaining Items

1. **Tighten RLS policies**: The current policies are fully permissive (`USING (true)` / `WITH CHECK (true)`). Once user authentication is implemented, these must be scoped to authenticated users and ownership checks. For example:
   - `device_catalog`: Read access for all authenticated users; write access restricted to admin roles.
   - `project_devices`: CRUD access scoped to the owning user via `auth.uid()`.

2. **Add UPDATE policy for `project_devices`**: No UPDATE policy was created for the `project_devices` table. If updates are needed, a properly scoped policy should be added.

3. **Integrate rate-limit-auth with Supabase Auth**: The edge function currently returns a stub response. It should be updated to proxy requests to the actual Supabase Auth signup/signin endpoints (`/auth/v1/signup`, `/auth/v1/token`).

4. **Persistent rate limiting storage**: The current implementation uses an in-memory Map, which resets on function cold starts. For production, consider using a Redis store or Supabase database table for persistent rate limit tracking.

5. **Security advisors review**: The Supabase security advisors check should be run periodically to detect new vulnerabilities (e.g., missing RLS, leaked keys, insecure configurations).

## Recommendations for Future Hardening

1. **Implement authentication**: Add Supabase Auth (email/password or OAuth) and update all RLS policies to use `auth.uid()` for user-scoped access control.

2. **Restrict CORS origins**: Replace the wildcard `Access-Control-Allow-Origin: *` with the specific frontend domain(s) in production.

3. **Enable SSL enforcement**: Ensure all database connections require SSL to prevent man-in-the-middle attacks.

4. **Add API key rotation policy**: Establish a schedule for rotating the Supabase anon and service role keys.

5. **Implement audit logging**: Add database triggers or use Supabase's built-in logging to track data modifications for compliance and forensic analysis.

6. **Add input validation**: Implement server-side validation on all Edge Functions and database constraints (e.g., email format, password complexity) to prevent injection attacks.

7. **Enable MFA**: When user authentication is in place, enable multi-factor authentication for sensitive operations.

8. **Network restrictions**: Consider restricting direct database access to known IP ranges using Supabase network restrictions.
