-- Planes
CREATE TABLE IF NOT EXISTS plans (
    plan_id SERIAL PRIMARY KEY,
    plan_type VARCHAR(50) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    duration VARCHAR(50),
    benefits TEXT,
    class_limit INTEGER,
    status VARCHAR(20) DEFAULT 'active'
);

-- Sedes
CREATE TABLE IF NOT EXISTS branches (
    branch_id SERIAL PRIMARY KEY,
    location VARCHAR(100) NOT NULL,
    size VARCHAR(50)
);

-- Plan-Sede
CREATE TABLE IF NOT EXISTS plan_branch (
    plan_id INTEGER REFERENCES plans(plan_id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES branches(branch_id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, branch_id)
);

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(branch_id), -- Home branch
    plan_id INTEGER REFERENCES plans(plan_id),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    user_status VARCHAR(20) DEFAULT 'active',
    birth_date DATE,
    registration_date DATE DEFAULT CURRENT_DATE
);