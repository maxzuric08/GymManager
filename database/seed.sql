-- Datos de demostración exclusivos del entorno local.
-- Es seguro ejecutar este archivo más de una vez: reutiliza cada entidad demo
-- mediante sus claves funcionales y no depende de IDs seriales.

DO $$
DECLARE
    argentina_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    demo_password_hash TEXT := '$2b$10$SBBCyYX7n5veJEUe3RBaQeo1apeZRTTe9OjPcCQ.S/Pq0Nj2MEyfS'; -- hash bcrypt de "123456"
    demo_branch_id INTEGER;
    demo_plan_id INTEGER;
    yoga_instructor_id INTEGER;
    functional_instructor_id INTEGER;
    pilates_instructor_id INTEGER;
    inactive_instructor_id INTEGER;
    demo_user_id INTEGER;
    spinning_class_id INTEGER;
    existing_booking_id INTEGER;
BEGIN
    INSERT INTO administrators (
        username, password, hierarchy, first_name, last_name, email, phone
    )
    VALUES (
        'admin1', demo_password_hash, 'superadmin', 'Admin', 'Principal', 'admin@gym.com', '111111111'
    )
    ON CONFLICT (username) DO UPDATE
    SET password = EXCLUDED.password,
        hierarchy = EXCLUDED.hierarchy,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone;

    INSERT INTO branches (location, size)
    SELECT 'Pilar', 'Grande'
    WHERE NOT EXISTS (
        SELECT 1 FROM branches WHERE location = 'Pilar'
    );

    SELECT branch_id
      INTO demo_branch_id
      FROM branches
     WHERE location = 'Pilar'
     ORDER BY branch_id
     LIMIT 1;

    INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit)
    SELECT 'Mensual', 20000, '30 días', 'Acceso general y clases grupales', 20, 'active', 1, 'months'
    WHERE NOT EXISTS (
        SELECT 1 FROM plans WHERE plan_type = 'Mensual'
    );

    SELECT plan_id
      INTO demo_plan_id
      FROM plans
     WHERE plan_type = 'Mensual'
     ORDER BY plan_id
     LIMIT 1;

    INSERT INTO users (
        branch_id, plan_id, username, password, dni, first_name, last_name,
        email, phone, birth_date, user_status, plan_expiration_date
    )
    VALUES (
        demo_branch_id, demo_plan_id, 'juan123', demo_password_hash, '12345678', 'Juan', 'Perez',
        'juan@gmail.com', '123456789', '1995-06-10', 'active', argentina_today + 30
    )
    ON CONFLICT (username) DO UPDATE
    SET branch_id = EXCLUDED.branch_id,
        plan_id = EXCLUDED.plan_id,
        password = EXCLUDED.password,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        user_status = EXCLUDED.user_status,
        plan_expiration_date = EXCLUDED.plan_expiration_date;

    SELECT user_id INTO demo_user_id FROM users WHERE username = 'juan123';

    INSERT INTO instructors (
        username, password, specialty, email, phone, first_name, last_name, dni,
        birth_date, branch_id, available_from, available_to, status
    )
    VALUES
        ('sofia.yoga', demo_password_hash, 'Yoga y movilidad', 'sofia.yoga@gym.com', '111111112', 'Sofia', 'Lopez', '30111222', '1990-04-12', demo_branch_id, '08:00', '13:00', 'active'),
        ('valentina.funcional', demo_password_hash, 'Entrenamiento funcional y spinning', 'valentina.funcional@gym.com', '111111113', 'Valentina', 'Diaz', '31222333', '1988-08-23', demo_branch_id, '17:00', '21:00', 'active'),
        ('martin.pilates', demo_password_hash, 'Pilates', 'martin.pilates@gym.com', '111111114', 'Martin', 'Suarez', '32333444', '1985-11-30', demo_branch_id, '18:00', '21:00', 'active'),
        ('lucas.cross', demo_password_hash, 'Cross training', 'lucas.cross@gym.com', '111111115', 'Lucas', 'Mendez', '33444555', '1987-02-14', demo_branch_id, '08:00', '12:00', 'inactive')
    ON CONFLICT (username) DO UPDATE
    SET password = EXCLUDED.password,
        specialty = EXCLUDED.specialty,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        birth_date = EXCLUDED.birth_date,
        branch_id = EXCLUDED.branch_id,
        available_from = EXCLUDED.available_from,
        available_to = EXCLUDED.available_to,
        status = EXCLUDED.status;

    SELECT instructor_id INTO yoga_instructor_id FROM instructors WHERE username = 'sofia.yoga';
    SELECT instructor_id INTO functional_instructor_id FROM instructors WHERE username = 'valentina.funcional';
    SELECT instructor_id INTO pilates_instructor_id FROM instructors WHERE username = 'martin.pilates';
    SELECT instructor_id INTO inactive_instructor_id FROM instructors WHERE username = 'lucas.cross';

    INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
    SELECT yoga_instructor_id, demo_branch_id, 'Yoga Integral', 12, '09:00', '10:00', argentina_today + 1, 'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM classes
         WHERE instructor_id = yoga_instructor_id AND class_name = 'Yoga Integral'
           AND class_date = argentina_today + 1 AND start_time = '09:00'::time AND end_time = '10:00'::time
    );

    INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
    SELECT functional_instructor_id, demo_branch_id, 'Entrenamiento Funcional', 10, '18:00', '19:00', argentina_today + 2, 'scheduled'
    WHERE NOT EXISTS (
        SELECT 1 FROM classes
         WHERE instructor_id = functional_instructor_id AND class_name = 'Entrenamiento Funcional'
           AND class_date = argentina_today + 2 AND start_time = '18:00'::time AND end_time = '19:00'::time
    );

    INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
    SELECT pilates_instructor_id, demo_branch_id, 'Pilates Mat', 8, '19:00', '20:00', argentina_today + 3, 'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM classes
         WHERE instructor_id = pilates_instructor_id AND class_name = 'Pilates Mat'
           AND class_date = argentina_today + 3 AND start_time = '19:00'::time AND end_time = '20:00'::time
    );

    INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
    SELECT functional_instructor_id, demo_branch_id, 'Spinning', 1, '19:00', '20:00', argentina_today + 1, 'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM classes
         WHERE instructor_id = functional_instructor_id AND class_name = 'Spinning'
           AND class_date = argentina_today + 1 AND start_time = '19:00'::time AND end_time = '20:00'::time
    );

    -- Esta clase sigue programada para comprobar que recomendaciones excluye
    -- instructores inactivos, aunque no esté cancelada.
    INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
    SELECT inactive_instructor_id, demo_branch_id, 'Cross Training', 8, '10:00', '11:00', argentina_today + 2, 'scheduled'
    WHERE NOT EXISTS (
        SELECT 1 FROM classes
         WHERE instructor_id = inactive_instructor_id AND class_name = 'Cross Training'
           AND class_date = argentina_today + 2 AND start_time = '10:00'::time AND end_time = '11:00'::time
    );

    INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
    SELECT yoga_instructor_id, demo_branch_id, 'Yoga Integral', 12, '09:00', '10:00', argentina_today - 7, 'active'
    WHERE NOT EXISTS (
        SELECT 1 FROM classes
         WHERE instructor_id = yoga_instructor_id AND class_name = 'Yoga Integral'
           AND class_date = argentina_today - 7 AND start_time = '09:00'::time AND end_time = '10:00'::time
    );

    SELECT class_id
      INTO spinning_class_id
      FROM classes
     WHERE instructor_id = functional_instructor_id
       AND class_name = 'Spinning'
       AND class_date = argentina_today + 1
       AND start_time = '19:00'::time
       AND end_time = '20:00'::time
     ORDER BY class_id
     LIMIT 1;

    SELECT booking_id
      INTO existing_booking_id
      FROM bookings
     WHERE user_id = demo_user_id AND class_id = spinning_class_id
     ORDER BY booking_id
     LIMIT 1;

    IF existing_booking_id IS NULL THEN
        INSERT INTO bookings (user_id, class_id, status)
        VALUES (demo_user_id, spinning_class_id, 'confirmed');
    ELSE
        UPDATE bookings
           SET status = 'confirmed', cancellation_reason = NULL
         WHERE booking_id = existing_booking_id;
    END IF;
END $$;
