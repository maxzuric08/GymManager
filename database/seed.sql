-- =========================
-- ADMIN (para login)
-- =========================
INSERT INTO administrators (
    username,
    password,
    hierarchy,
    first_name,
    last_name,
    email,
    phone
)
VALUES (
           'admin1',
           '123456',
           'superadmin',
           'Admin',
           'Principal',
           'admin@gym.com',
            '111111111'
       );

-- =========================
-- PLAN
-- =========================
INSERT INTO plans (plan_type, cost, duration)
VALUES ('Basico', 10000, '1 mes');

-- =========================
-- SEDE
-- =========================
INSERT INTO branches (location, size)
VALUES ('Temuco', 'Grande');

-- =========================
-- USUARIO
-- =========================
INSERT INTO users (
    branch_id,
    plan_id,
    username,
    password,
    dni,
    first_name,
    last_name,
    email,
    phone,
    birth_date
)
VALUES (
           1,  -- viene de branches
           1,  -- viene de plans
           'juan123',
           '123456',
           '12345678',
           'Juan',
           'Perez',
           'juan@gmail.com',
           '123456789',
           '1995-06-10'
       );