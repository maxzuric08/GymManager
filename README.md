# GymManager

*GymManager* es una página web diseñada para optimizar la administración y organización de gimnasios, integrando en una única plataforma la gestión de socios, planes de membresía, reservas de clases, control de asistencia y seguimiento de pagos.

El sistema busca **digitalizar procesos que comúnmente se realizan de forma manual o fragmentada**, permitiendo una administración más eficiente, trazable y segura tanto para los gestores del gimnasio como para los clientes.

El proyecto tiene como objetivo principal **desarrollar un sistema que centralice y automatice la gestión interna de un gimnasio**, garantizando control de membresías, reservas y estado financiero de los socios.

Dentro de todas las opciones, la web podrá registrar y administrar los clientes, gestionar planes de membresía con sus beneficios, precios y duraciones, junto a sus vencimientos y avisos de los mismos, administrar clases grupales junto a un profesional, permitir reservas/cancelaciones 
automáticos, gestionar pagos/detectar atrasos en estos, entre otros. 

Este proyecto **no está pensado para** creación de rutinas, o gestión personal de cada cliente, sino para la administración general de una empresa de un gimnasio.

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

2. Reemplazá `POSTGRES_PASSWORD` y `JWT_SECRET` por valores locales propios. Completá las variables de correo o Mercado Pago únicamente si vas a usar esas integraciones.

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
