-- =====================================================
-- MM Ingeniería · Zona de descarga para COMPRADORES
-- Ejecutar TODO este archivo en: Supabase → SQL Editor → Run
--
-- ANTES de ejecutar (Dashboard de Supabase):
--   1. Authentication → Providers → Email → ON "Allow new users to sign up"
--      y MANTENER ON "Confirm email" (si no, cualquiera podría registrarse
--      con tu correo de admin y obtener permisos de admin)
--   2. Authentication → Providers → Google → ON
--   3. Authentication → URL Configuration:
--      Site URL:        https://maytan777.github.io/   (tu dirección principal, no cambiar)
--      Redirect URLs:   https://maytan777.github.io/programas.html
--                       http://localhost:*/  (solo si pruebas en local)
--
-- Google Cloud Console (OAuth, una sola vez):
--   - Orígenes JavaScript autorizados: https://bidintbjpgpeyscirxwl.supabase.co
--   - URI de redireccionamiento (SOLO este):
--     https://bidintbjpgpeyscirxwl.supabase.co/auth/v1/callback
-- =====================================================

-- ---------- 1. TABLA DE COMPRADORES ----------

create table if not exists compradores (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  estado       text not null default 'pendiente' check (estado in ('pendiente','autorizado','rechazado')),
  telefono     text,
  creado_en    timestamptz not null default now(),
  autorizado_en timestamptz
);

alter table compradores enable row level security;

-- Al registrarse, crear su fila en 'pendiente' automáticamente
create or replace function public.handle_new_comprador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.compradores (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_comprador on auth.users;
create trigger on_auth_user_created_comprador
  after insert on auth.users
  for each row execute function public.handle_new_comprador();

-- ---------- 2. RLS DE COMPRADORES ----------

drop policy if exists "comprador_ve_lo_suyo" on compradores;
create policy "comprador_ve_lo_suyo"
  on compradores for select
  to authenticated
  using (user_id = auth.uid());

-- IMPORTANTE: NO crear política de UPDATE para el comprador sobre su propia
-- fila. Con ella, cualquiera podría cambiarse a estado = 'autorizado'.
-- Solo el admin (abajo) cambia estados.

-- Admin (tu email) ve y edita a todos
drop policy if exists "admin_ve_todos" on compradores;
create policy "admin_ve_todos"
  on compradores for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

drop policy if exists "admin_edita_todos" on compradores;
create policy "admin_edita_todos"
  on compradores for update
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

-- ---------- 3. CERRAR SECCIÓN PERSONA SOLO A TI ----------

drop policy if exists auth_tareas_all  on tareas;
drop policy if exists auth_horario_all on horario;
drop policy if exists auth_cursos_all  on cursos;
drop policy if exists auth_grupos_all  on grupos;
drop policy if exists auth_alumnos_all on alumnos;
drop policy if exists auth_avisos_all  on avisos_horario;

drop policy if exists "solo_admin_tareas"  on tareas;
drop policy if exists "solo_admin_horario" on horario;
drop policy if exists "solo_admin_cursos"  on cursos;
drop policy if exists "solo_admin_grupos"  on grupos;
drop policy if exists "solo_admin_alumnos" on alumnos;
drop policy if exists "solo_admin_avisos"  on avisos_horario;

create policy "solo_admin_tareas"
  on tareas for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

create policy "solo_admin_horario"
  on horario for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

create policy "solo_admin_cursos"
  on cursos for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

create policy "solo_admin_grupos"
  on grupos for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

create policy "solo_admin_alumnos"
  on alumnos for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

create policy "solo_admin_avisos"
  on avisos_horario for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com' );

-- ---------- 4. BUCKET PRIVADO DE STORAGE ----------
-- Límite 50 MB por archivo (máximo del plan gratis de Supabase).
-- Los 2 archivos que lo superaban (VIGA HPRO V5 y el bundle) ya están
-- divididos en volúmenes .part1.rar / .part2.rar de ≤45 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('programas-sin-contra', 'programas-sin-contra', false, 52428800, null)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Leen: compradores AUTORIZADOS y tú (admin)
drop policy if exists "autorizados_leen_programas" on storage.objects;
create policy "autorizados_leen_programas"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'programas-sin-contra'
    and (
      (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com'
      or exists (
        select 1 from public.compradores c
        where c.user_id = auth.uid()
          and c.estado = 'autorizado'
      )
    )
  );

-- Solo el admin sube/actualiza/borra archivos
drop policy if exists "admin_gestiona_programas" on storage.objects;
create policy "admin_gestiona_programas"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'programas-sin-contra'
    and (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com'
  );

drop policy if exists "admin_actualiza_programas" on storage.objects;
create policy "admin_actualiza_programas"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'programas-sin-contra'
    and (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com'
  );

drop policy if exists "admin_borra_programas" on storage.objects;
create policy "admin_borra_programas"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'programas-sin-contra'
    and (auth.jwt() ->> 'email') = 'marcoalexsandiomaytanhuaraca@gmail.com'
  );

-- ---------- 5. VERIFICACIÓN ----------

select 'compradores' as tabla, count(*) as filas from compradores;
select id, name, public, file_size_limit from storage.buckets where id = 'programas-sin-contra';

-- Debe verse SOLO "solo_admin_*" y las de compradores (sin políticas abiertas)
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('tareas','horario','cursos','grupos','alumnos','avisos_horario','compradores')
order by tablename, policyname;

-- Políticas del bucket
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (policyname like '%programas%')
order by policyname;
