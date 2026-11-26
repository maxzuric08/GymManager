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

### Contraseñas

Las contraseñas se guardan con hash bcrypt. Si tu base tiene contraseñas anteriores en texto plano, convertilas con:

```powershell
docker compose exec backend npm run db:hash-passwords
```

El comando es idempotente: saltea las que ya están hasheadas. Además, el login convierte automáticamente a hash cualquier contraseña en texto plano que quede, la primera vez que esa persona inicia sesión.

### Reglas de los planes

Cada plan define reglas estructuradas que el backend valida al crearlo o editarlo y aplica al reservar:

| Regla | Valores válidos | Significado |
| --- | --- | --- |
| Nombre | 1 a 50 caracteres, único entre planes activos | Cómo se muestra a los socios |
| Costo | Número entre 0 y 99.999.999,99 | Precio total en pesos |
| Duración y unidad | Entero mayor a 0 en días (hasta 3650), semanas (520) o meses (120) | Define el vencimiento; el texto de duración se genera solo |
| Límite de reservas | Entero mayor o igual a 1, o vacío | Máximo de reservas futuras activas a la vez |
| Beneficios | Texto opcional de hasta 500 caracteres | Se muestra al socio y en el mail de confirmación |

**Límite vacío = sin límite.** El socio puede tener cualquier cantidad de reservas futuras activas. El valor 0 no se admite. Cancelar una reserva libera un lugar del límite.

Si se baja el límite de un plan que ya tienen socios, no se les cancelan las reservas existentes: el nuevo límite solo impide reservar más hasta volver a quedar por debajo.

Cuando una reserva se bloquea por el límite, el socio ve cuál es su plan, cuál es el límite y cuántas reservas activas ya tiene.
