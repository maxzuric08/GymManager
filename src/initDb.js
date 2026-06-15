const pool = require("./db");

const initializeDatabase = async () => {
  try {
    console.log("Initializing database tables...");

    // Create medical_certificates table
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan_expiration_date DATE;
    `);
    console.log("✓ plan_expiration_date column added to users");

    // Add duration fields to plans table
    await pool.query(`
      ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS duration_value INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'months';
    `);
    console.log("✓ duration_value and duration_unit columns added to plans");

    // Add status column to instructors table
    await pool.query(`
      ALTER TABLE instructors
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);
    console.log("✓ status column added to instructors");

    await pool.query(`
      ALTER TABLE attendance
      ADD COLUMN IF NOT EXISTS marked_by_instructor INTEGER REFERENCES instructors(instructor_id);
    `);
    console.log("Attendance instructor marker added");

    // Create index for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_medical_certificates_user_id
      ON medical_certificates(user_id);
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS medical_certificates_one_active_per_user
      ON medical_certificates(user_id)
      WHERE status IN ('pending', 'approved');
    `);
    console.log("✓ indexes created");

    console.log("\n✅ Database initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
};

initializeDatabase();
