import pool from './src/lib/database.js';

async function runMigration() {
  try {
    console.log('Starting migration...');
    
    // Add is_group column if it doesn't exist
    await pool.query(`
      ALTER TABLE assignments 
      ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;
    `);
    console.log('✓ Added is_group column to assignments table');
    
    // Drop old UNIQUE constraint if it exists and add filtered constraint
    await pool.query(`
      ALTER TABLE assignment_submissions
      DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_student_id_key;
    `);
    
    // Add filtered UNIQUE constraint (allows group submissions)
    await pool.query(`
      ALTER TABLE assignment_submissions
      ADD CONSTRAINT unique_individual_submission 
      UNIQUE (assignment_id, student_id) WHERE is_group = false;
    `);
    console.log('✓ Updated assignment_submissions constraint for group submissions');
    
    // Create assignment_group_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_group_members (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        submission_id INT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(submission_id, student_id)
      );
    `);
    console.log('✓ Created assignment_group_members table');
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_assignment_group_members_submission 
      ON assignment_group_members(submission_id);
    `);
    console.log('✓ Created index on submission_id');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_assignment_group_members_student 
      ON assignment_group_members(student_id);
    `);
    console.log('✓ Created index on student_id');
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}
}

runMigration();
