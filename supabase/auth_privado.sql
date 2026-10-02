-- =====================================================
-- MM Ingeniería · Área Persona PRIVADA (solo con login)
-- Ejecutar TODO este archivo en: Supabase → SQL Editor → Run
--
-- PASOS PREVIOS (obligatorios, en el Dashboard de Supabase):
--   1. Authentication → Sign In / Providers → activar Email.
--   2. Authentication → Users → Add user (tu email + contraseña,
--      con email auto-confirmado).
--   3. Authentication → Settings → APAGAR "Allow new users
--      to sign up" (para que nadie más pueda registrarse).
--
-- Después de ejecutar este archivo, la API con la anon key
-- ya NO entrega ni permite modificar ningún dato sin sesión.
-- Los recordatorios por email (pg_cron) siguen funcionando
-- porque corren como postgres y no pasan por RLS.
-- =====================================================

-- ---------- 1. QUITAR ACCESO ANÓNIMO ----------

drop policy if exists anon_tareas_all  on tareas;
drop policy if exists anon_horario_all on horario;
drop policy if exists anon_cursos_all  on cursos;
drop policy if exists anon_grupos_all  on grupos;
drop policy if exists anon_alumnos_all on alumnos;

-- avisos_horario no tenía RLS: activarla (sin políticas
-- para anon queda totalmente cerrada al público)
alter table avisos_horario enable row level security;

-- ---------- 2. SOLO USUARIOS LOGUEADOS ----------

drop policy if exists auth_tareas_all  on tareas;
drop policy if exists auth_horario_all on horario;
drop policy if exists auth_cursos_all  on cursos;
drop policy if exists auth_grupos_all  on grupos;
drop policy if exists auth_alumnos_all on alumnos;
drop policy if exists auth_avisos_all  on avisos_horario;

create policy auth_tareas_all
  on tareas for all
  to authenticated
  using (true)
  with check (true);

create policy auth_horario_all
  on horario for all
  to authenticated
  using (true)
  with check (true);

create policy auth_cursos_all
  on cursos for all
  to authenticated
  using (true)
  with check (true);

create policy auth_grupos_all
  on grupos for all
  to authenticated
  using (true)
  with check (true);

create policy auth_alumnos_all
  on alumnos for all
  to authenticated
  using (true)
  with check (true);

create policy auth_avisos_all
  on avisos_horario for all
  to authenticated
  using (true)
  with check (true);

-- ---------- 3. VERIFICACIÓN ----------
-- Tras ejecutar, esta consulta muestra las políticas activas.
-- Debe listar 6 políticas "auth_*_all" para el rol authenticated
-- y NINGUNA política para el rol anon.

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
