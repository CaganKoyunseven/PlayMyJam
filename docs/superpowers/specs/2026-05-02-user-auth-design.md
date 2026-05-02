# User Auth System — Design Spec
Date: 2026-05-02

## Overview

Add username+password + magic link auth for regular users. Browse stays open to everyone. Requesting a song or adding to queue requires a logged-in account. Users who sign up via magic link get a random username and can set a real one and a password from their profile.

---

## Pages

### `/login`
Two options side by side:
1. **Email or username + password** — API route converts username → email if needed, then `supabase.auth.signInWithPassword()`
2. **Magic link** — email input, `supabase.auth.signInWithOtp()`. New accounts get `user_XXXXX` username auto-assigned.

"Şifremi Unuttum" link below password field → `/forgot-password` page (email input → Supabase sends reset email → user clicks link → `/reset-password` page with new password form).

"Hesabın yok mu? Kayıt ol" → `/register`

### `/register`
Fields: username (unique, live check) + email + password.  
On submit: `supabase.auth.signUp()` then insert row into `profiles`.

### `/forgot-password`
Email input → `supabase.auth.resetPasswordForEmail()`.  
Shows "Email gönderildi" confirmation.

### `/reset-password`
Supabase redirects here with token in URL.  
New password + confirm → `supabase.auth.updateUser({ password })`.

---

## Profile Page (`/profile`)

Already a placeholder. Adds:
- **Username**: display + edit field with uniqueness check on blur. Save button.
- **Şifre Değiştir** section:
  - Eski şifre + yeni şifre + tekrar (eski şifre required — prevents unauthorized change)
  - "Şifremi Unuttum" link → `/forgot-password` (for magic-link users with no password)
  - Submit → `supabase.auth.signInWithPassword(oldPass)` to verify, then `supabase.auth.updateUser({ password: newPass })`
- **Çıkış Yap** button → `supabase.auth.signOut()`

---

## Protected Actions

**Browse** → open to all, no change.

**Request a song** (`/request` page — Request button):
- If not logged in: toast appears: `"Şarkı istemek için giriş yapman gerekiyor"` with `/login` link.
- If logged in: existing flow.

**Add to queue** (`/browse` page — Add button):
- Same toast pattern.

---

## Backend

### Supabase Auth config
- Enable: Email + Password provider
- Enable: Magic Link (OTP) provider
- Disable: Email confirmation for magic link (auto-confirm)

### `profiles` table
```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  created_at   timestamptz default now()
);
```
RLS: public read, owner write only (`auth.uid() = id`).

### Trigger: auto-create profile on signup
```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### API route: login with username
`POST /api/auth/login` — receives `{ login, password }`. If `login` contains `@`, pass directly to Supabase. Otherwise, look up `profiles` by username → get email → `signInWithPassword`.

---

## Global Auth State

`lib/auth-context.tsx` — React context wrapping `supabase.auth.getSession()` + `onAuthStateChange` listener. Exposes `{ user, session, loading }`.

Wrap in `app/layout.tsx`.

---

## Username Uniqueness Check

On `/register` and `/profile` (username edit):
- Debounced 400ms on input change
- `GET /api/auth/check-username?username=X` → queries `profiles` table
- Returns `{ available: boolean }`
- Shows "✓ Kullanılabilir" or "✗ Bu kullanıcı adı alınmış" inline

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `app/login/page.tsx` | Rewrite (currently placeholder) |
| `app/register/page.tsx` | Create new |
| `app/forgot-password/page.tsx` | Create new |
| `app/reset-password/page.tsx` | Create new |
| `app/profile/page.tsx` | Rewrite (currently placeholder) |
| `lib/auth-context.tsx` | Create new |
| `app/layout.tsx` | Wrap with AuthProvider |
| `app/api/auth/login/route.ts` | Create new (username→email lookup) |
| `app/api/auth/check-username/route.ts` | Create new |
| `app/request/page.tsx` | Add auth guard (toast) |
| `app/browse/page.tsx` | Add auth guard (toast) |
| `supabase/users.sql` | Create new (profiles table + trigger) |
