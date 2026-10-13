# Breathing Point Care (Phase 1)

Provider side of the Care platform: yoga teachers and physiotherapists register, an admin reviews and approves,
and approved providers publish their timings and fees. Patient search and booking come in Phase 2.

Served at `https://breathingpoint.in/care/` (React + Vite + Supabase, installable as a PWA).

## 1. Create the database (Supabase)
1. Create a free project at supabase.com. Choose the **Mumbai (ap-south-1)** region.
2. Open **SQL Editor**, paste the whole of `sql/care_phase1.sql` and run it once.

## 2. Create the two admins
1. **Authentication > Users > Add user > Create new user**. Tick **Auto Confirm User**.
   * Email `yoga_admin@admin.breathingpoint.in`, password: **choose a strong one yourself**
   * Email `phy_admin@admin.breathingpoint.in`, password: **choose a strong one yourself**
2. In **SQL Editor** run:
```sql
insert into admins (user_id, username, scope)
select id, 'yoga_admin', 'yoga'  from auth.users where email = 'yoga_admin@admin.breathingpoint.in';
insert into admins (user_id, username, scope)
select id, 'phy_admin', 'physio' from auth.users where email = 'phy_admin@admin.breathingpoint.in';
```
Admins log in at `https://breathingpoint.in/care/#/admin` with just the username (`yoga_admin` / `phy_admin`).
`yoga_admin` only ever sees yoga teachers; `phy_admin` only sees physiotherapists (enforced in the database, not just the screen).

> Do not use a simple password such as `Admin123` on the live site. These accounts can see providers' phone numbers,
> addresses and certificates.

## 3. Supabase settings
* **Authentication > URL Configuration**: Site URL `https://breathingpoint.in/care/`, and add the same address under Redirect URLs.
* **Authentication > Sign In / Providers > Email**: for the first pilot, switch **Confirm email** OFF so registration completes in one step.
  Before the public launch, set up your own email sender (Resend or Amazon SES, under Authentication > SMTP) and switch it back ON;
  Supabase's built-in email sender is only meant for testing and is very limited.
  (With confirmation ON the app still works: after confirming the email, the provider logs in and is asked to finish the registration.)

## 4. Build the app
```bash
cp .env.example .env        # then edit .env: paste your Supabase URL and the anon (public) key
npm install
npm test                    # optional: 9 quick checks
npm run build               # creates the dist/ folder
```
Never put the `service_role` key in `.env`; only the anon key.

## 5. Publish on breathingpoint.in
Copy everything **inside** `dist/` into a folder named `care/` in the breathingpoint.in repository, so that `care/index.html` exists. Commit and push.
Test: open `https://breathingpoint.in/care/`.

Local preview: `npm run dev`, then open http://localhost:5173/care/

## Test checklist
1. Register as a yoga teacher (upload a PDF/JPG). Dashboard shows "Under review".
2. Log in at `/care/#/admin` as `phy_admin`: the yoga teacher must NOT appear.
3. Log in as `yoga_admin`: open the certificate, try **Reject** with an empty reason (blocked), then reject with a reason.
4. Log in as the teacher: the reason is shown; fix, resubmit.
5. Approve as `yoga_admin`. Teacher can now publish batches and home-visit hours.
6. Repeat for a physiotherapist with `phy_admin` (clinic hours, 45-minute home-visit slots).

## What is in this folder
* `sql/care_phase1.sql`: database tables, security rules, admin review function, private certificate storage
* `src/`: the app (pages, registration form, admin review screen, schedule editors)
* `src/test/`: automated UI checks
* `public/`: PWA manifest, service worker, placeholder icons (replace with the Breathing Point logo mark)
