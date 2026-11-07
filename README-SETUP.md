# CampusFlow ERP – complete source bundle

This bundle contains the original project files plus the Campus Insights frontend additions. It excludes `.env` secrets, `node_modules`, `dist`, and `.git`.

## Setup
1. Copy `client/.env.example` to `client/.env` and fill in your Supabase URL and publishable key.
2. Copy `server/.env.example` to `server/.env` and fill in your Supabase URL and publishable key.
3. Terminal 1: `cd client`, then `npm ci`, then `npm run dev`.
4. Terminal 2: `cd server`, then `npm install`, then `npm run dev`.
5. Open the Vite URL printed in the client terminal (normally http://localhost:5173).

Do not put a Supabase service-role key in frontend variables. Database migrations and RLS policies are not changed. Announcements remain browser-local until a shared table and policies are added.
