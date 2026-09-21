-- =====================================================
-- MM Ingeniería · Cursos, grupos y alumnos (página Persona)
-- Ejecutar TODO este archivo en: Supabase → SQL Editor → Run
--
-- Requisito previo: haber ejecutado supabase/schema.sql
-- =====================================================

-- ---------- TABLAS ----------

create table if not exists cursos (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  docente text,
  nota    text,
  creada  timestamptz not null default now()
);

create table if not exists grupos (
  id       uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  nombre   text not null,
  creada   timestamptz not null default now()
);

create table if not exists alumnos (
  id       uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references grupos(id) on delete cascade,
  nombre   text not null,
  creada   timestamptz not null default now()
);

-- ---------- SEGURIDAD (RLS) ----------
-- Uso personal sin login: políticas abiertas para el rol anon,
-- igual que las tablas de tareas y horario.

alter table cursos  enable row level security;
alter table grupos  enable row level security;
alter table alumnos enable row level security;

drop policy if exists anon_cursos_all  on cursos;
drop policy if exists anon_grupos_all  on grupos;
drop policy if exists anon_alumnos_all on alumnos;

create policy anon_cursos_all
  on cursos for all
  to anon
  using (true)
  with check (true);

create policy anon_grupos_all
  on grupos for all
  to anon
  using (true)
  with check (true);

create policy anon_alumnos_all
  on alumnos for all
  to anon
  using (true)
  with check (true);

-- ---------- PERMISOS PARA EL ROL anon ----------

grant usage on schema public to anon;
grant select, insert, update, delete on all tables in schema public to anon;

-- ---------- DATOS DE EJEMPLO (opcional) ----------
-- Descomenta el bloque siguiente si quieres un curso de ejemplo:
--
-- insert into cursos (nombre, docente, nota) values
--   ('Geomática', null, 'Revisar apuntes de la semana 1')
-- on conflict do nothing;
