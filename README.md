# GymManager

*GymManager* es una página web diseñada para optimizar la administración y organización de gimnasios, integrando en una única plataforma la gestión de socios, planes de membresía, reservas de clases, control de asistencia y seguimiento de pagos.

El sistema busca **digitalizar procesos que comúnmente se realizan de forma manual o fragmentada**, permitiendo una administración más eficiente, trazable y segura tanto para los gestores del gimnasio como para los clientes.

El proyecto tiene como objetivo principal **desarrollar un sistema que centralice y automatice la gestión interna de un gimnasio**, garantizando control de membresías, reservas y estado financiero de los socios.

Dentro de todas las opciones, la web podrá registrar y administrar los clientes, gestionar planes de membresía con sus beneficios, precios y duraciones, junto a sus vencimientos y avisos de los mismos, administrar clases grupales junto a un profesional, permitir reservas/cancelaciones 
automáticos, gestionar pagos/detectar atrasos en estos, entre otros. 

Este proyecto **no está pensado para** creación de rutinas, o gestión personal de cada cliente, sino para la administración general de una empresa de un gimnasio.

## Entorno local con Docker

Al crear la base de datos por primera vez, Docker carga el esquema y los datos
de prueba de `database/seed.sql`. La cuenta administrativa inicial es
`admin1` con contraseña `123456`; es solo para desarrollo local.

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

En la primera creación del volumen, PostgreSQL ejecuta `database/gymmanager.sql` y deja el esquema listo. No se cargan datos de ejemplo.

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

### Inicializaciones incrementales

`database/gymmanager.sql` se ejecuta solamente cuando PostgreSQL crea un volumen vacío. Para aplicar cambios idempotentes sobre una base que ya existe, agregalos en `src/initDb.js` y ejecutá:

```powershell
docker compose exec backend npm run db:migrate
```

El comando puede ejecutarse nuevamente sin volver a crear las tablas o columnas que ya existen.
