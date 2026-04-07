# Private Send (Supabase only, no custom server)

You were right — now this is **Supabase only**.
No Node server needed for normal use.

## What it does
1. Upload file (with upload password)
2. Get random 6-digit code
3. Other person enters code to download
4. After download, file/code is deleted

Upload limit is **50 MB max**.

---

## Easy setup (very simple)

### Step 1) Create Supabase project
- Go to https://supabase.com
- Create project

### Step 2) Create bucket
- Open project -> Storage -> New bucket
- Name: `private-send-files`
- Set bucket to **Private**

### Step 3) Create table
Open SQL Editor and run:

```sql
create table if not exists public.transfers (
  code text primary key,
  object_path text not null,
  original_name text not null,
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.transfers enable row level security;

create policy "anon can read transfers"
on public.transfers for select
to anon using (true);

create policy "anon can insert transfers"
on public.transfers for insert
to anon with check (true);

create policy "anon can delete transfers"
on public.transfers for delete
to anon using (true);
```

### Step 4) Create storage policies
Run this SQL too:

```sql
create policy "anon can upload files"
on storage.objects for insert
to anon with check (bucket_id = 'private-send-files');

create policy "anon can read files"
on storage.objects for select
to anon using (bucket_id = 'private-send-files');

create policy "anon can delete files"
on storage.objects for delete
to anon using (bucket_id = 'private-send-files');
```

### Step 5) Get Supabase keys
Project Settings -> API -> copy:
- Project URL
- anon public key

### Step 6) Edit `main.js`
At top of `main.js`, replace these 3 values:

```js
const SUPABASE_URL = 'REPLACE_WITH_YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_SUPABASE_ANON_KEY';
const UPLOAD_PASSWORD = 'change-this-upload-password';
```

### Step 7) Open website
Just open `index.html` (or deploy to GitHub Pages / Netlify / Vercel).

---

## How to change upload password
Open `main.js` and change:

```js
const UPLOAD_PASSWORD = 'new-password-here';
```

Save and redeploy/reload.

---

## Important note
Because this is client-only (no server), upload password is in frontend code.
So this is simple protection, not military-grade security.
