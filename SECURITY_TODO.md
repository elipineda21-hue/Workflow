# ProjectPal Security TODO

## 🔴 Critical — Fix Before External Access

### 1. Move secrets from netlify.toml to Netlify Dashboard
**Status:** Partially done — CSP headers added, secrets still in file
**Action:** 
1. Go to https://app.netlify.com → Site → Site configuration → Environment variables
2. Add these 4 variables:
   - `VITE_SUPABASE_URL` = `https://nymnjhfpvwxdkxxcxbts.supabase.co`
   - `VITE_SUPABASE_KEY` = (the JWT anon key — ask Claude for it)
   - `VITE_MONDAY_BOARD_ID` = `18394052747`
   - `VITE_CLAUDE_EDGE_URL` = `https://nymnjhfpvwxdkxxcxbts.supabase.co/functions/v1/claude-submittal`
3. After confirming the build works, delete the `[build.environment]` section from `netlify.toml`
4. Rotate the Supabase anon key (treat as compromised since it was in public repo)

### 2. Rotate Supabase Anon Key
The anon key has been in the public GitHub repo. Even though it's a publishable key, rotate it:
1. Go to Supabase Dashboard → Settings → API → Anon key → Rotate
2. Update the new key in Netlify dashboard env vars
3. Update `.env` file locally

## 🟠 Fix Before Any External Penetration Test

### 3. Tighten RLS Policies
**Status:** RLS enabled with permissive `USING (true)` policies
**Action:** Scope policies to `auth.uid()`:
```sql
-- work_orders: users can only access their own projects
DROP POLICY IF EXISTS "..." ON work_orders;
CREATE POLICY "Users own work orders" ON work_orders
  FOR ALL USING (user_id = auth.uid());

-- device_catalog: shared read, authenticated write
-- (current policies are acceptable for shared catalog)

-- project_devices: scope to project ownership
-- Need to join through work_orders.user_id
```

### 4. Monday API Token → Server-Side Proxy
**Status:** Token flows through browser (visible in DevTools)
**Action:** Create a Supabase Edge Function that:
- Receives Monday API requests from frontend
- Reads the user's Monday token from their Supabase user_metadata
- Makes the Monday API call server-side
- Returns the result

Template: Use `claude-submittal` Edge Function pattern

### 5. Content Security Policy Headers
**Status:** ✅ DONE — Added in commit 152c948
Headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP

## 🟡 Minor Gaps — Good to Fix

### 6. Rate Limiting Persistence
**Status:** In-memory Map resets on Edge Function cold start
**Action:** Move rate limit tracking to a Supabase table:
```sql
CREATE TABLE rate_limits (
  ip text PRIMARY KEY,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now()
);
```

### 7. Signed URLs for Spec Sheets
**Status:** Using public URLs (anyone with path can download)
**Action:** Switch `getSpecSheetUrl()` and `getProjectFileUrl()` to use `createSignedUrl()` with 1-hour expiry
**Blocker:** Requires async refactor of Library tab and Files tab (they call these synchronously in render)

### 8. Schema File Removed
**Status:** ✅ DONE — `supabase_schema.sql` deleted from repo in commit 152c948

### 9. Camera Passwords in Plaintext
**Status:** Camera passwords stored as plaintext in the project state JSON
**Action:** Encrypt sensitive fields before saving to Supabase (or mark as sensitive in the UI)

## Completed Items
- [x] CSP headers added (commit 152c948)
- [x] supabase_schema.sql removed (commit 152c948)
- [x] RLS enabled on all tables (basic policies)
- [x] Optimistic locking on saveWorkOrder
- [x] User authentication (Supabase Auth)
- [x] Per-user Monday tokens in user_metadata
- [x] Rate limiting Edge Function deployed
- [x] ErrorBoundary per tab
- [x] crypto.randomUUID() for IDs
- [x] GraphQL variables in Monday API
