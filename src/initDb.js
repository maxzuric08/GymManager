const pool = require("./db");

const initializeDatabase = async (db = pool) => {
  try {
    console.log("Initializing database tables...");

    // Create medical_certificates table
    await db.query(`
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
        CONSTRAINT medical_certificates_status_check
          CHECK (status IN ('pending', 'approved', 'rejected'))
      );
    `);
    console.log("✓ medical_certificates table created");

    // Create bookings table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ bookings table created");

    // Add plan_expiration_date column to users table if it doesn't exist
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan_expiration_date DATE;
    `);
    console.log("✓ plan_expiration_date column added to users");

    // Add duration fields to plans table
    await db.query(`
      ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS duration_value INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'months';
    `);
    console.log("✓ duration_value and duration_unit columns added to plans");

    // Add status column to instructors table
    await db.query(`
      ALTER TABLE instructors
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);
    console.log("✓ status column added to instructors");

    await db.query(`
      ALTER TABLE attendance
      ADD COLUMN IF NOT EXISTS marked_by_instructor INTEGER REFERENCES instructors(instructor_id);
    `);
    console.log("Attendance instructor marker added");

    await db.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS checkout_url TEXT;
    `);
    console.log("Payment checkout URL added");

    await db.query(`
      CREATE TABLE IF NOT EXISTS membership_notification_runs (
        notification_run_id SERIAL PRIMARY KEY,
        notification_type VARCHAR(50) NOT NULL,
        target_expiration_date DATE NOT NULL,
        trigger VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        processed_count INTEGER NOT NULL DEFAULT 0,
        sent_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
        CHECK (trigger IN ('scheduled', 'manual')),
        CHECK (status IN ('running', 'completed', 'failed'))
      );

      CREATE TABLE IF NOT EXISTS membership_notification_deliveries (
        membership_notification_delivery_id SERIAL PRIMARY KEY,
        notification_run_id INTEGER REFERENCES membership_notification_runs(notification_run_id) ON DELETE SET NULL,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        expiration_date DATE NOT NULL,
        delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
        CHECK (delivery_status IN ('pending', 'sent', 'failed')),
        UNIQUE (user_id, notification_type, expiration_date)
      );

      CREATE INDEX IF NOT EXISTS idx_membership_notification_runs_started_at
      ON membership_notification_runs(started_at DESC);
    `);
    console.log("✓ membership notification audit tables created");

    // Create index for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_medical_certificates_user_id
      ON medical_certificates(user_id);
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS medical_certificates_one_active_per_user
      ON medical_certificates(user_id)
      WHERE status IN ('pending', 'approved');
    `);
    console.log("✓ indexes created");

    console.log("\n✅ Database initialization complete!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
};

if (require.main === module) {
  initializeDatabase()
    .then(() => pool.end())
    .catch(async () => {
      await pool.end().catch(() => {});
      process.exitCode = 1;
    });
}

module.exports = { initializeDatabase };
