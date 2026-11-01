-- Ejecutar en Supabase > SQL Editor antes de habilitar los comentarios.
create table if not exists public.comentarios_programas (
  id bigint generated always as identity primary key,
  parent_id bigint references public.comentarios_programas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  autor text not null,
  es_admin boolean not null default false,
  mensaje text not null check (char_length(trim(mensaje)) between 1 and 1000),
  creado_en timestamptz not null default now()
);

create index if not exists comentarios_programas_parent_idx on public.comentarios_programas(parent_id);
alter table public.comentarios_programas enable row level security;

-- El servidor establece la identidad visible; el cliente no puede elegirla.
create or replace function public.preparar_comentario_programas()
returns trigger language plpgsql set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.autor := left(coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
                             nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''), 'Usuario'), 80);
  new.es_admin := coalesce((auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com', false);
  new.creado_en := now();
  if new.parent_id is not null and not exists (
    select 1 from public.comentarios_programas where id = new.parent_id and parent_id is null
  ) then
    raise exception 'La respuesta debe pertenecer a una sugerencia existente';
  end if;
  return new;
end;
$$;

drop trigger if exists preparar_comentario_programas on public.comentarios_programas;
create trigger preparar_comentario_programas before insert on public.comentarios_programas
for each row execute function public.preparar_comentario_programas();

drop policy if exists "comentarios lectura publica" on public.comentarios_programas;
create policy "comentarios lectura publica" on public.comentarios_programas
  for select to anon, authenticated using (true);
drop policy if exists "comentarios usuarios escriben" on public.comentarios_programas;
create policy "comentarios usuarios escriben" on public.comentarios_programas
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "comentarios admin elimina" on public.comentarios_programas;
create policy "comentarios admin elimina" on public.comentarios_programas
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com');

grant select on public.comentarios_programas to anon, authenticated;
grant insert, delete on public.comentarios_programas to authenticated;
grant usage, select on sequence public.comentarios_programas_id_seq to authenticated;
