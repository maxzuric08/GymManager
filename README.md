# GymManager

*GymManager* es una página web diseñada para optimizar la administración y organización de gimnasios, integrando en una única plataforma la gestión de socios, planes de membresía, reservas de clases, control de asistencia y seguimiento de pagos.

El sistema busca **digitalizar procesos que comúnmente se realizan de forma manual o fragmentada**, permitiendo una administración más eficiente, trazable y segura tanto para los gestores del gimnasio como para los clientes.

El proyecto tiene como objetivo principal **desarrollar un sistema que centralice y automatice la gestión interna de un gimnasio**, garantizando control de membresías, reservas y estado financiero de los socios.

Dentro de todas las opciones, la web podrá registrar y administrar los clientes, gestionar planes de membresía con sus beneficios, precios y duraciones, junto a sus vencimientos y avisos de los mismos, administrar clases grupales junto a un profesional, permitir reservas/cancelaciones 
automáticos, gestionar pagos/detectar atrasos en estos, entre otros. 

Este proyecto **no está pensado para** creación de rutinas, o gestión personal de cada cliente, sino para la administración general de una empresa de un gimnasio.

## Despliegue público en Render

El repositorio incluye [render.yaml](./render.yaml), que crea una API Docker,
un sitio estático Vite y PostgreSQL administrado. Render asigna URLs públicas
`*.onrender.com`; no se necesita dominio propio. La API se publica en
`/health`, que devuelve `200` cuando también puede consultar PostgreSQL.

### Variables de producción

Render genera `JWT_SECRET` y enlaza `DATABASE_URL` desde la base administrada.
En el dashboard configurá los siguientes valores como secretos, nunca en Git:

| Variable | Uso |
| --- | --- |
| `FRONTEND_URL`, `APP_URL`, `CORS_ORIGINS` | URL pública del sitio frontend. `CORS_ORIGINS` puede contener varios orígenes separados por coma. |
| `BACKEND_PUBLIC_URL` | URL pública de la API; se usa para el webhook de Mercado Pago. |
| `EMAIL_USER`, `EMAIL_PASSWORD` | Cuenta SMTP/Gmail para notificaciones y confirmación de plan. |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Credenciales **sandbox** y secreto del webhook de Mercado Pago. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Recomendaciones IA, exclusivamente del lado servidor. |
| `DEMO_ADMIN_USERNAME`, `DEMO_ADMIN_PASSWORD` | Cuenta administrativa privada para la demostración. |
| `DEMO_USER_USERNAME`, `DEMO_USER_PASSWORD`, `DEMO_USER_EMAIL`, `DEMO_USER_DNI` | Socio privado sin membresía, destinado al checkout sandbox. |
| `DEMO_MEMBER_USERNAME`, `DEMO_MEMBER_PASSWORD`, `DEMO_MEMBER_EMAIL`, `DEMO_MEMBER_DNI` | Socio privado con plan activo y una reserva para mostrar el dashboard poblado. |
| `DB_SSL` | Definila en `true` únicamente si la URL de PostgreSQL elegida exige TLS. |

`VITE_API_URL` es la única variable del frontend y debe contener la URL pública
de la API. No uses prefijos `VITE_` para secretos: Vite los incorpora en el
bundle enviado al navegador.

### Crear y publicar

1. En Render, creá un Blueprint desde este repositorio y elegí la rama `dev`
   después de hacer merge del pull request. Completá los secretos solicitados
   por `render.yaml`.
2. Una vez creada la API, copiá su URL en `VITE_API_URL`, `BACKEND_PUBLIC_URL`.
   Copiá la URL del Static Site en `FRONTEND_URL`, `APP_URL`, `CORS_ORIGINS` y
   volvé a desplegar ambos servicios.
3. En Mercado Pago sandbox, registrá
   `https://<api>.onrender.com/payments/webhook` como URL de notificación.
4. El arranque de la API ejecuta `npm run db:bootstrap` de forma idempotente.
   El hook inicial ejecuta una única vez `npm run db:seed-demo`, con los datos
   privados configurados en Render. Para repetirlo de forma intencional, usá
   la Shell de Render y ejecutá `npm run db:seed-demo`.

Para rollback, seleccioná el último deploy saludable de cada servicio en
Render y hacé **Rollback**. La base de datos es persistente: no se elimina ni
se repuebla durante un rollback.

### Checklist de smoke test

- Abrir `https://<api>.onrender.com/health` y guardar una captura de la
  respuesta `{ "status": "ok", "database": "ok" }`.
- Iniciar sesión con las cuentas privadas del demo; crear un plan y una clase
  recurrente, y verificar las instancias futuras creadas.
- Reservar y cancelar una instancia de la serie recurrente.
- Como socio, seleccionar un plan, completar checkout sandbox y confirmar
  webhook, membresía y correo de confirmación con vencimiento.
- Enviar una consulta de recomendaciones IA y confirmar que la clave no aparece
  en el navegador ni en la respuesta.

## Entorno local con Docker

Al usar `docker compose` en desarrollo, Docker carga el esquema y los datos
de demostración de `database/seed.sql` mediante `compose.override.yaml`. La
cuenta administrativa inicial es `admin1` con contraseña `123456` y el socio
demo es `juan123` con contraseña `123456`; estas cuentas son solo locales.

`compose.yaml` no carga datos demo. Para un despliegue productivo usá solo ese
archivo: `docker compose -f compose.yaml up -d`.

El backend y PostgreSQL se pueden ejecutar sin instalar PostgreSQL localmente. El frontend no forma parte de estos contenedores.

### Configuración inicial

1. Copiá el ejemplo de variables de entorno:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Reemplazá `POSTGRES_PASSWORD` y `JWT_SECRET` por valores locales propios. Completá las variables de correo, Mercado Pago u OpenAI únicamente si vas a usar esas integraciones. Para las recomendaciones, configurá `OPENAI_API_KEY` y opcionalmente `OPENAI_MODEL` (por defecto, `gpt-6-luna`).

El archivo `.env` está ignorado por Git. No subas secretos: solo se versiona `.env.example` con valores de ejemplo.

### Iniciar

```powershell
docker compose up --build -d
```

Compose crea una red interna, inicia PostgreSQL y espera su healthcheck antes de arrancar el backend. La API queda disponible en [http://localhost:3000](http://localhost:3000); podés confirmar su estado con:

```powershell
Invoke-RestMethod http://localhost:3000/
docker compose ps
docker compose logs -f backend
```

En la primera creación del volumen, PostgreSQL ejecuta `database/gymmanager.sql`
y, en desarrollo, `database/seed.sql`. El seed incluye tres clases futuras
disponibles, una clase llena, un instructor inactivo y una clase histórica. Las
fechas se calculan con la hora de Argentina, por lo que las clases disponibles
siempre comienzan a partir del día siguiente.

### Detener y reiniciar

```powershell
docker compose stop
docker compose start
```

También podés detener y eliminar los contenedores sin perder datos:

```powershell
docker compose down
docker compose up -d
```

Los datos se conservan en el volumen nombrado `gymmanager-postgres-data`. Para crear una base completamente nueva (esto elimina todos los datos locales), usá:

```powershell
docker compose down -v
docker compose up --build -d
```

### Reaplicar los datos demo

El seed se puede ejecutar más de una vez sin duplicar sus instructores, clases
ni reservas. Para restablecer o actualizar los datos demo sobre un volumen ya
existente, ejecutá:

```powershell
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/02-demo-seed.sql'
```

Las clases futuras se agregan según la fecha de cada ejecución; las que ya
coinciden en instructor, horario y fecha se conservan sin duplicarse.

Para la demo del 01/12/2026, reinicializá o reaplicá el seed ese día: Yoga,
Funcional y Pilates quedarán programadas del 02/12 al 04/12.

### Inicializaciones incrementales

`database/gymmanager.sql` se ejecuta solamente cuando PostgreSQL crea un volumen vacío. Para aplicar cambios idempotentes sobre una base que ya existe, agregalos en `src/initDb.js` y ejecutá:

```powershell
docker compose exec backend npm run db:migrate
```

El comando puede ejecutarse nuevamente sin volver a crear las tablas o columnas que ya existen.

### Contraseñas

Las contraseñas se guardan con hash bcrypt. Si tu base tiene contraseñas anteriores en texto plano, convertilas con:

```powershell
docker compose exec backend npm run db:hash-passwords
```

El comando es idempotente: saltea las que ya están hasheadas. Además, el login convierte automáticamente a hash cualquier contraseña en texto plano que quede, la primera vez que esa persona inicia sesión.
