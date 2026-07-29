# Sincronización opcional con Supabase

Hypertrofia Tracker funciona sin cuenta y guarda todos los datos localmente. Esta configuración solo es necesaria para sincronizar entre dispositivos.

## 1. Crear el proyecto

1. Crea un proyecto en Supabase.
2. En **Project Settings → API**, copia:
   - Project URL
   - anon public key
3. Pégalos dentro de **Perfil → Sincronización Supabase** en la aplicación.

## 2. Crear la tabla

Abre **SQL Editor** y ejecuta:

```sql
create table if not exists public.hypertrofia_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.hypertrofia_user_data enable row level security;

create policy "Users read their own hypertrophy data"
on public.hypertrofia_user_data
for select
using (auth.uid() = user_id);

create policy "Users insert their own hypertrophy data"
on public.hypertrofia_user_data
for insert
with check (auth.uid() = user_id);

create policy "Users update their own hypertrophy data"
on public.hypertrofia_user_data
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 3. Autenticación

En **Authentication → Providers → Email**, activa correo y contraseña. Puedes decidir si Supabase debe exigir confirmación por correo.

## 4. Primer respaldo

1. Crea una cuenta o inicia sesión desde la aplicación.
2. Presiona **Subir ahora** para guardar la copia local.
3. En el segundo dispositivo, inicia sesión y presiona **Descargar nube**.
4. Activa la sincronización automática solo después de confirmar que ambos dispositivos muestran los datos correctos.

## Seguridad

- La anon key puede utilizarse en una aplicación pública cuando Row Level Security está activado.
- No uses nunca la service role key en el navegador.
- Los datos clínicos o información sensible no deben almacenarse en este proyecto de entrenamiento.
