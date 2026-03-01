-- Enable pgvector extension for vector storage
create extension if not exists vector;

-- Table: compliance_knowledge (Law Library)
create table if not exists public.compliance_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}',
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Create index for vector similarity search
create index if not exists compliance_knowledge_embedding_idx 
  on public.compliance_knowledge 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Table: audit_reports (Audit Reports)
create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  file_name text,
  compliance_score int check (compliance_score >= 0 and compliance_score <= 100),
  findings jsonb default '[]',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  error_message text,
  extracted_data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.compliance_knowledge enable row level security;
alter table public.audit_reports enable row level security;

-- RLS Policies for compliance_knowledge (read-only for authenticated users)
create policy "compliance_knowledge_select"
  on public.compliance_knowledge for select
  to authenticated
  using (true);

-- RLS Policies for audit_reports (users can only see their own reports)
create policy "audit_reports_select_own"
  on public.audit_reports for select
  to authenticated
  using (auth.uid() = user_id);

create policy "audit_reports_insert_own"
  on public.audit_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "audit_reports_update_own"
  on public.audit_reports for update
  to authenticated
  using (auth.uid() = user_id);

create policy "audit_reports_delete_own"
  on public.audit_reports for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create storage bucket for label images
insert into storage.buckets (id, name, public)
values ('labels', 'labels', false)
on conflict (id) do nothing;

-- Storage policies for labels bucket
create policy "labels_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "labels_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "labels_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_audit_reports_updated_at
  before update on public.audit_reports
  for each row
  execute function public.update_updated_at_column();
