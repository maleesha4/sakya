# Group Assignment Feature Implementation

## Overview
This implementation adds comprehensive group assignment support to the assignment management system. Tutors can now specify whether an assignment is individual or group-based, and for group assignments, one member submits while specifying all group members, and the tutor can grade all members together.

## Database Changes

### New Migration File
**Location:** `src/app/api/migrations/001_add_group_assignments.sql`

- Added `is_group BOOLEAN DEFAULT FALSE` column to `assignments` table
- Created new `assignment_group_members` table to track group membership for submissions:
  - `submission_id` (FK to assignment_submissions)
  - `student_id` (FK to students)
  - Tracks which students are in each group submission

## API Changes

### 1. Tutor Assignment Creation
**File:** `src/app/api/tutor/assignments/route.js`

**Changes:**
- POST endpoint now accepts `isGroup` parameter
- Stores `is_group` flag in assignments table
- Returns `is_group` in GET response for assignment listings

### 2. Tutor Assignment Details
**File:** `src/app/api/tutor/assignments/[id]/route.js`

**Changes:**
- Returns `is_group` flag in assignment details
- Fetches group members for each submission from `assignment_group_members` table
- Returns group member info in submission objects as `group_members` array

### 3. Student Assignment Submission
**File:** `src/app/api/student/assignments/[id]/submit/route.js`

**Changes:**
- POST endpoint now accepts `groupMembers` JSON array in formData
- If assignment is group-based, inserts group members into `assignment_group_members` table
- Lead student who submits is the primary contact; all members are listed in group_members

### 4. Student Classmates Endpoint (New)
**File:** `src/app/api/student/classmates/route.js`

**Features:**
- GET endpoint to fetch classmates for group selection
- Filters by grade and subject
- Excludes the current student
- Returns array of available group members

### 5. Tutor Grading
**File:** `src/app/api/tutor/submissions/[id]/grade/route.js`

**Changes:**
- POST endpoint now accepts `applyToAllGroupMembers` boolean
- When enabled, applies the same grade and feedback to all group members
- Updates submissions for all group member student IDs

## UI/Frontend Changes

### 1. Tutor Create Assignment Form
**File:** `src/app/tutor/assignments/page.js`

**Changes:**
- Added checkbox for "Group Assignment" in create modal
- Displays helpful text explaining group assignment behavior
- Added to formData state with default value `false`
- Group assignment info displayed in assignment cards with `👥 GROUP` badge

### 2. Tutor Assignment Submissions Page
**File:** `src/app/tutor/assignments/[id]/page.js`

**Changes:**
- Displays group members section for group assignments
- Shows all group members in purple badge styling
- Grading modal includes "Apply to All Group Members" checkbox
- When checked, shows list of all group members who will receive the grade
- Added state management for `applyToAllGroupMembers`

### 3. Student Assignment Submission Page
**File:** `src/app/student/assignments/[id]/page.js`

**Changes:**
- Fetches classmates when assignment is group-based
- Added group member selection UI with checkboxes
- Displays available classmates in scrollable list
- Includes helpful text explaining group submission
- Group members sent to API along with files

## Feature Flow

### For Tutors:
1. **Create Assignment** → Toggle "Group Assignment" checkbox
2. **View Assignment** → See 👥 GROUP badge if it's a group assignment
3. **Grade Submissions** → View all group members listed
4. **Apply Grade** → Optionally apply same grade/feedback to all group members

### For Students:
1. **View Group Assignment** → See group member selection area
2. **Select Members** → Check boxes to select fellow group members
3. **Submit Files** → Upload assignment files
4. **See Grade** → All group members receive the same grade/feedback

## Key Features

✅ **Individual & Group Support**: Toggle between individual and group assignments
✅ **Flexible Submission**: One member submits; can add other group members
✅ **Bulk Grading**: Grade all group members at once with single submission
✅ **Member Tracking**: Clear display of who is in each group submission
✅ **Classmate Discovery**: Students can see/select classmates from their grade/subject
✅ **Feedback Management**: Single feedback message applies to entire group or individuals

## Database Relationships

```
assignments (is_group: BOOLEAN)
    ↓
assignment_submissions
    ↓
assignment_group_members → students → users
```

- One submission can have multiple group members
- Each group member is tracked in assignment_group_members
- Tutor can grade the group or individual members

## Testing Recommendations

1. Create a group assignment and verify is_group flag is set
2. As student, submit to group assignment and add group members
3. Verify group members appear in tutor's grading interface
4. Grade assignment with "apply to all" option enabled
5. Verify all group members have same grade/feedback
6. Create individual assignment and verify no group UI appears
