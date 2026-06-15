-- Planes
CREATE TABLE IF NOT EXISTS plans (
    plan_id SERIAL PRIMARY KEY,
    plan_type VARCHAR(50) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    duration VARCHAR(50),
    benefits TEXT,
    class_limit INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    duration_value INTEGER DEFAULT 1,
    duration_unit VARCHAR(20) DEFAULT 'months'
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
    registration_date DATE DEFAULT CURRENT_DATE,
    plan_expiration_date DATE
);

-- Profesor
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    dni VARCHAR(20) UNIQUE,
    birth_date DATE,
    branch_id INTEGER REFERENCES branches(branch_id),
    available_from TIME,
    available_to TIME,
    status VARCHAR(20) DEFAULT 'active'
);

-- Clases
CREATE TABLE IF NOT EXISTS classes (
    class_id SERIAL PRIMARY KEY,
    instructor_id INTEGER REFERENCES instructors(instructor_id),
    branch_id INTEGER REFERENCES branches(branch_id),
    class_name VARCHAR(100) NOT NULL,
    capacity INTEGER,
    start_time TIME,
    end_time TIME,
    class_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled'
);

-- Reserva
CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    class_id INTEGER REFERENCES classes(class_id),
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'confirmed',
    cancellation_reason TEXT
);

-- Asistencia
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(booking_id),
    class_id INTEGER REFERENCES classes(class_id),
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'present',
    marked_by_admin INTEGER,
    marked_by_instructor INTEGER REFERENCES instructors(instructor_id),
    notes TEXT,
    CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent', 'late', 'excused')),
    CONSTRAINT attendance_booking_unique UNIQUE (booking_id)
);

-- Permisos
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Admins
CREATE TABLE IF NOT EXISTS administrators (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    hierarchy VARCHAR(50),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'attendance_marked_by_admin_fkey'
    ) THEN
        ALTER TABLE attendance
        ADD CONSTRAINT attendance_marked_by_admin_fkey
        FOREIGN KEY (marked_by_admin) REFERENCES administrators(admin_id);
    END IF;
END $$;

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS marked_by_instructor INTEGER REFERENCES instructors(instructor_id);

-- Admin-Permisos
CREATE TABLE IF NOT EXISTS admin_permissions (
    admin_id INTEGER REFERENCES administrators(admin_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (admin_id, permission_id)
);


-- Pagos
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),    plan_id INTEGER REFERENCES plans(plan_id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    payment_status VARCHAR(30),
    payment_method VARCHAR(50),
    corresponding_month VARCHAR(20),
    mp_payment_id VARCHAR(255) UNIQUE,
    preference_id VARCHAR(255),
    checkout_url TEXT,
    external_reference VARCHAR(100),
    status_detail VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'ARS',
    approved_at TIMESTAMP,
    processed_at TIMESTAMP
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(plan_id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mp_payment_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS preference_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status_detail VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ARS';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE payments ALTER COLUMN payment_status TYPE VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS payments_external_reference_unique
ON payments(external_reference) WHERE external_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_mp_payment_unique
ON payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    instructor_id INTEGER REFERENCES instructors(instructor_id),
    notification_type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20)
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
    chat_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    instructor_id INTEGER REFERENCES instructors(instructor_id),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gym
CREATE TABLE IF NOT EXISTS gym (
    gym_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    system_plan VARCHAR(50),
    registration_date DATE
);

-- Certificados medicos

CREATE TABLE IF NOT EXISTS medical_certificates (
    medical_certificate_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_data BYTEA NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES administrators(admin_id),
    CHECK (status IN ('pending', 'approved', 'rejected'))
    );

CREATE INDEX IF NOT EXISTS idx_medical_certificates_user_id
ON medical_certificates(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS medical_certificates_one_active_per_user
ON medical_certificates(user_id)
WHERE status IN ('pending', 'approved');
