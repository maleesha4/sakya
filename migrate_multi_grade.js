import pool from './src/lib/database.js';

async function runMigration() {
  try {
    console.log('Starting migration for multi-grade assignments...');
    
    // Check if assignment_grades table already exists
    const tableCheck = await pool.query(`
      SELECT EXISTS(
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assignment_grades'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ assignment_grades table already exists');
    } else {
      // Create assignment_grades junction table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS assignment_grades (
          id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
          grade_id INT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
          UNIQUE(assignment_id, grade_id)
        );
      `);
      console.log('✓ Created assignment_grades table');
      
      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_assignment_grades_assignment 
        ON assignment_grades(assignment_id);
      `);
      console.log('✓ Created index on assignment_id');
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_assignment_grades_grade 
        ON assignment_grades(grade_id);
      `);
      console.log('✓ Created index on grade_id');
      
      // Migrate existing data: copy all assignments' grade_id to assignment_grades junction table
      await pool.query(`
        INSERT INTO assignment_grades (assignment_id, grade_id)
        SELECT id, grade_id FROM assignments
        WHERE grade_id IS NOT NULL
        ON CONFLICT (assignment_id, grade_id) DO NOTHING;
      `);
      console.log('✓ Migrated existing assignment grades');
    }
    
    // Drop old grade_status index if it exists
    await pool.query(`
      DROP INDEX IF EXISTS idx_assignments_grade_status;
    `);
    console.log('✓ Dropped old idx_assignments_grade_status index');
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
