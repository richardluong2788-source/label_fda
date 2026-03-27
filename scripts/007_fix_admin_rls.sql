-- Fix infinite recursion in admin_users RLS policies

-- Drop existing problematic policies
drop policy if exists "admin_users_modify" on public.admin_users;
drop policy if exists "admin_users_select" on public.admin_users;

-- Policy: Anyone authenticated can view admin status (no recursion)
create policy "admin_users_select"
  on public.admin_users for select
  to authenticated
  using (true);

-- Policy: Only existing superadmins can insert new admins (using function to break recursion)
create policy "admin_users_insert"
  on public.admin_users for insert
  to authenticated
  with check (
    auth.uid() in (
      select user_id from public.admin_users 
      where role = 'superadmin'
    )
  );

-- Policy: Users can update their own record OR superadmins can update any
create policy "admin_users_update"
  on public.admin_users for update
  to authenticated
  using (
    user_id = auth.uid() 
    or 
    auth.uid() in (
      select user_id from public.admin_users 
      where role = 'superadmin'
    )
  );

-- Policy: Only superadmins can delete
create policy "admin_users_delete"
  on public.admin_users for delete
  to authenticated
  using (
    auth.uid() in (
      select user_id from public.admin_users 
      where role = 'superadmin'
    )
  );

-- For first-time setup, temporarily disable RLS to allow initial insert
-- (This should be run manually or in a controlled environment)
-- alter table public.admin_users disable row level security;
-- insert into public.admin_users (user_id, role, can_review) 
-- values ('2e89bd83-6c7b-43c1-9df6-323688d73519', 'superadmin', true)
-- on conflict (user_id) do update set role = 'superadmin', can_review = true;
-- alter table public.admin_users enable row level security;
