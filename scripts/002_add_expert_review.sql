-- Migration: Add Expert Review and Anti-Hallucination Features

-- Update audit_reports table to support new statuses and citation tracking
alter table public.audit_reports 
  drop constraint if exists audit_reports_status_check;

alter table public.audit_reports 
  add constraint audit_reports_status_check 
  check (status in ('pending', 'processing', 'ai_completed', 'verified', 'rejected', 'error'));

-- Add new columns for expert review
alter table public.audit_reports
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists needs_expert_review boolean default false,
  add column if not exists citation_count int default 0;

-- Create admin_users table to track Vexim experts
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'expert' check (role in ('expert', 'admin', 'superadmin')),
  can_review boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS for admin_users
alter table public.admin_users enable row level security;

-- Policy: Authenticated users can view admin status
create policy "admin_users_select"
  on public.admin_users for select
  to authenticated
  using (true);

-- Policy: Only admins can modify admin_users
create policy "admin_users_modify"
  on public.admin_users for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Update RLS for audit_reports to allow experts to view all reports
create policy "audit_reports_select_experts"
  on public.audit_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid() and can_review = true
    )
  );

-- Policy: Experts can update reports for review
create policy "audit_reports_update_experts"
  on public.audit_reports for update
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid() and can_review = true
    )
  );

-- Add metadata column to compliance_knowledge for citation tracking
alter table public.compliance_knowledge
  alter column metadata set default jsonb_build_object(
    'regulation_id', '',
    'section', '',
    'title', '',
    'effective_date', ''
  );

-- Create function to check if user is admin
create or replace function public.is_admin(user_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = user_uuid and role in ('admin', 'superadmin', 'expert')
  );
end;
$$ language plpgsql security definer;

-- Create view for expert dashboard
create or replace view public.expert_dashboard_stats as
select
  count(*) filter (where status = 'ai_completed') as pending_review,
  count(*) filter (where status = 'verified') as verified_today,
  count(*) filter (where needs_expert_review = true) as needs_attention,
  count(*) filter (where status = 'rejected') as rejected
from public.audit_reports
where created_at >= current_date;

-- Grant access to the view for authenticated users
grant select on public.expert_dashboard_stats to authenticated;
