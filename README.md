# School Management System — Phase 1

## 1. Install
Install Node.js LTS and VS Code. Extract this ZIP to a folder.

## 2. Open the project
In VS Code choose File → Open Folder and select `school-management-system-phase1`.

Open Terminal → New Terminal and run:
```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## 3. Connect Supabase
Create a Supabase project. In Project Settings → API copy the Project URL and publishable/anon key into `.env.local`.
Run `supabase/schema.sql` in Supabase → SQL Editor.

## 4. Create an admin
In Supabase → Authentication → Users, create an email/password user.
Copy the user's UUID. Run this in SQL Editor (replace the UUID):
```sql
insert into public.profiles (id, full_name, role)
values ('YOUR-USER-UUID', 'School Administrator', 'admin')
on conflict (id) do update set role = 'admin';
```
Then sign in at http://localhost:3000/login.

Never share your Supabase password, user password, or secret/service-role key in chat.
