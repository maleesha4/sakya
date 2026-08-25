# Multi-Grade Assignment Implementation

## Overview
This document outlines the complete implementation of multi-grade assignment support. Assignments can now target multiple grades simultaneously, and students from different grades can form groups together on a single assignment.

## Database Changes

### Schema Updates (`/src/app/api/data.sql`)
1. **Assignments Table**
   - Removed: `grade_id` column (no longer a single grade per assignment)
   - The assignments table now has a 1:N relationship with grades via junction table

2. **New Junction Table: `assignment_grades`**
   ```sql
   CREATE TABLE assignment_grades (
     id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
     grade_id INT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
     UNIQUE(assignment_id, grade_id)
   );
   ```
   - Links assignments to multiple grades
   - Ensures no duplicate assignment-grade combinations
   - Cascading delete maintains referential integrity

3. **Indexes**
   - `idx_assignment_grades_assignment`: Fast lookup by assignment
   - `idx_assignment_grades_grade`: Fast lookup by grade

4. **Removed Index**
   - `idx_assignments_grade_status`: No longer relevant

### Migration Script (`/migrate_multi_grade.js`)
- Creates `assignment_grades` table if it doesn't exist
- Migrates existing assignment `grade_id` values to junction table
- Creates appropriate indexes
- Handles conflicts gracefully with `ON CONFLICT DO NOTHING`
- **To run:** `node migrate_multi_grade.js`

## Backend API Changes

### Assignment Creation: POST `/api/tutor/assignments`
**Before:**
```json
{
  "title": "...",
  "gradeId": 1
}
```

**After:**
```json
{
  "title": "...",
  "gradeIds": [1, 2, 3]  // Array of grade IDs
}
```

**Implementation:**
- Changed parameter from `gradeId` to `gradeIds` (array required)
- Validates: `!Array.isArray(gradeIds) || gradeIds.length === 0`
- INSERT skips `grade_id` column
- Loop adds each grade via `INSERT INTO assignment_grades`
- Returns assignment with `grades` array aggregated as JSON

### Assignment Update: PUT `/api/tutor/assignments/[id]`
**Before:**
```json
{
  "gradeId": 1
}
```

**After:**
```json
{
  "gradeIds": [1, 2, 3]
}
```

**Implementation:**
- Changed parameter from `gradeId` to `gradeIds`
- Validates array requirement
- UPDATE skips `grade_id` column
- Deletes old `assignment_grades` entries
- Inserts new grade associations in loop
- Returns updated assignment with `grades` array

### Assignment List: GET `/api/tutor/assignments`
**Changes:**
- JOIN with `assignment_grades` instead of direct grade reference
- Aggregates grades as JSON array: `json_agg(json_build_object('id', g.id, 'grade_name', g.grade_name))`
- Response includes `grades` array property on each assignment

### Student Assignment List: GET `/api/student/assignments`
**Query Change:**
```sql
WHERE a.id IN (
  SELECT DISTINCT ag.assignment_id FROM assignment_grades ag
  INNER JOIN enrollments e ON ag.grade_id = e.grade_id
  WHERE e.student_id = $1 AND e.status = 'active'
)
```
- Students see assignments from all grades they're enrolled in that have assignments
- Single query with proper JOIN structure

### Student Assignment Details: GET `/api/student/assignments/[id]`
**Changes:**
- Fetches assignment with all target grades
- Verifies student is enrolled in at least one target grade:
```sql
WHERE student_id = $1 AND grade_id IN (
  SELECT grade_id FROM assignment_grades WHERE assignment_id = $2
)
```
- Returns assignment with `grades` array

### Student Classmates: GET `/api/student/classmates`
**Before:**
```
?gradeId=1&subjectId=5
```

**After:**
```
?assignmentId=10&subjectId=5
```

**Implementation:**
- Changed parameter from `gradeId` to `assignmentId`
- Fetches students from ALL grades the assignment targets
- Query:
```sql
WHERE e.subject_id = $1 AND e.status = 'active'
AND e.grade_id IN (
  SELECT grade_id FROM assignment_grades WHERE assignment_id = $3
)
```
- Enables cross-grade group formation

## Frontend Changes

### Tutor Assignments Page (`/src/app/tutor/assignments/page.js`)

**Form State Changes:**
- `formData.gradeId` → `formData.gradeIds` (array)
- `editFormData.gradeId` → `editFormData.gradeIds` (array)

**Grade Selection UI:**
- Changed from single `<select>` to checkbox group
- Users can select one or more grades
- Both create and edit forms updated
- Clear labeling: "Grades * (Select one or more)"

**Edit Modal:**
- When opening edit modal, extracts grade IDs from assignment's `grades` array
- Handles both old single-grade and new multi-grade assignments

**Assignment Display:**
- Updated to show all target grades: `assignment.grades.map(g => g.grade_name).join(', ')`
- Changed label from "Grade" to "Grades"

### Student Assignment Submission Page (`/src/app/student/assignments/[id]/page.js`)

**API Call Changes:**
- Classmates fetch now uses `assignmentId` instead of `gradeId`
- Enables cross-grade group member selection

## Migration Guide

### For Development/Testing
1. Ensure `.env` has proper `DATABASE_URL` pointing to running PostgreSQL
2. Run migration: `node migrate_multi_grade.js`
3. Verify output shows successful table creation and data migration
4. Test with fresh assignment creation using multiple grades

### For Existing Data
- Migration script safely handles existing assignments
- Uses `ON CONFLICT DO NOTHING` to prevent duplicates
- Grade associations are preserved in `assignment_grades` table
- Old `grade_id` column in assignments can be safely dropped after verification (optional)

## Testing Checklist

- [ ] Create assignment with single grade
- [ ] Create assignment with multiple grades
- [ ] Edit assignment to add/remove grades
- [ ] Verify students from different grades see assignment in their list
- [ ] Verify students from different grades can form groups
- [ ] Verify group member selection shows students from all target grades
- [ ] Verify late submission flag works across multi-grade assignments
- [ ] Verify grace period applies to all target grades
- [ ] Verify tutor dashboard shows all target grades

## Key Implementation Details

1. **Data Integrity**: UNIQUE constraint on (assignment_id, grade_id) prevents duplicates

2. **Backward Compatibility**: Existing single-grade assignments work with the new structure

3. **Performance**: Indexes on both foreign keys ensure efficient lookups

4. **Group Assignments**: Cross-grade groups now possible as classmates are fetched from all assignment grades

5. **Student Access**: Students only see assignments for grades they're enrolled in

## Related Features Working with Multi-Grade

- ✅ Grace period (24 hours after deadline)
- ✅ Late submission marking
- ✅ Group assignments with cross-grade members
- ✅ Timezone handling (local time)
- ✅ Classmates selection from multiple grades
- ✅ Admission card generation for all target grades
