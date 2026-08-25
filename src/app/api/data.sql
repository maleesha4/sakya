-- ============================================
-- Sipsara Institute Grade 11 Exam Management System
-- PostgreSQL (Neon.tech) Compatible Schema
-- Corrected & Complete Version
-- ============================================

-- ============================================
-- USER MANAGEMENT
-- ============================================

CREATE TABLE users (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'tutor', 'student')),
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(15),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- GRADES / BATCHES
-- ============================================

CREATE TABLE grades (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    grade_name  VARCHAR(50) NOT NULL,
    year        INT NOT NULL,
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);

CREATE INDEX idx_grades_year   ON grades(year);
CREATE INDEX idx_grades_status ON grades(status);

-- ============================================
-- SUBJECTS (OL subjects)
-- ============================================

CREATE TABLE subjects (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_code  VARCHAR(20) UNIQUE NOT NULL,
    subject_name  VARCHAR(100) NOT NULL,
    description   TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subjects_code ON subjects(subject_code);
CREATE INDEX idx_subjects_name ON subjects(subject_name);

-- ============================================
-- STUDENTS
-- ============================================

CREATE TABLE students (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    index_number    VARCHAR(20) UNIQUE NOT NULL,
    grade_id        INT REFERENCES grades(id),
    gender          VARCHAR(10) CHECK (gender IN ('male', 'female')),
    date_of_birth   DATE,
    address         TEXT,
    parent_name     VARCHAR(100),
    parent_phone    VARCHAR(15),
    profile_photo   VARCHAR(255),
    joined_date     DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_students_user_id    ON students(user_id);
CREATE INDEX idx_students_index      ON students(index_number);
CREATE INDEX idx_students_grade      ON students(grade_id);

-- ============================================
-- TUTORS
-- ============================================

CREATE TABLE tutors (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id   VARCHAR(20) UNIQUE NOT NULL,
    subject       VARCHAR(100),          -- primary subject (optional free-text)
    joined_date   DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_tutors_user_id     ON tutors(user_id);
CREATE INDEX idx_tutors_employee_id ON tutors(employee_id);

-- Many-to-many: tutors ↔ subjects
CREATE TABLE tutor_subjects (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tutor_id    INT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (tutor_id, subject_id)
);

CREATE INDEX idx_tutor_subjects_tutor   ON tutor_subjects(tutor_id);
CREATE INDEX idx_tutor_subjects_subject ON tutor_subjects(subject_id);

-- ============================================
-- ADMINS
-- ============================================

CREATE TABLE admins (
    id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id  INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_admins_user_id ON admins(user_id);

-- ============================================
-- EXAMS
-- ============================================

CREATE TABLE exams (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_name               VARCHAR(100) NOT NULL,
    exam_code               VARCHAR(20) UNIQUE NOT NULL,
    exam_date               DATE NOT NULL,
    exam_type               VARCHAR(20) CHECK (exam_type IN ('mock', 'trial', 'final')),
    duration_minutes        INT,
    registration_start      TIMESTAMP,
    registration_end        TIMESTAMP,
    exam_fee                DECIMAL(10,2) DEFAULT 0.00,
    max_students            INT,
    admission_card_released BOOLEAN DEFAULT FALSE,
    results_published       BOOLEAN DEFAULT FALSE,
    status                  VARCHAR(20) DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_by              INT REFERENCES admins(id),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exams_code   ON exams(exam_code);
CREATE INDEX idx_exams_date   ON exams(exam_date);
CREATE INDEX idx_exams_status ON exams(status);

-- ============================================
-- EXAM SUBJECTS (which subjects are in an exam)
-- ============================================

CREATE TABLE exam_subjects (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id     INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    max_marks   INT NOT NULL,
    pass_marks  INT NOT NULL,
    paper_code  VARCHAR(20),
    question_count INT,
    UNIQUE (exam_id, subject_id)
);

CREATE INDEX idx_exam_subjects_exam    ON exam_subjects(exam_id);
CREATE INDEX idx_exam_subjects_subject ON exam_subjects(subject_id);

-- ============================================
-- EXAM SCHEDULE
-- ============================================

CREATE TABLE exam_schedule (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id     INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_date   DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    venue       VARCHAR(100)
);

CREATE INDEX idx_exam_schedule_exam    ON exam_schedule(exam_id);
CREATE INDEX idx_exam_schedule_subject ON exam_schedule(subject_id);
CREATE INDEX idx_exam_schedule_date    ON exam_schedule(exam_date);

-- ============================================
-- EXAM REGISTRATIONS
-- ============================================

CREATE TABLE exam_registrations (
    id                        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id                INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id                   INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    registration_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status            VARCHAR(20) DEFAULT 'pending'
                              CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    admission_card_downloaded BOOLEAN DEFAULT FALSE,
    admission_card_number     VARCHAR(20) UNIQUE,
    status                    VARCHAR(20) DEFAULT 'registered'
                              CHECK (status IN ('registered', 'cancelled', 'attended')),
    UNIQUE (student_id, exam_id)
);

CREATE INDEX idx_exam_registrations_student ON exam_registrations(student_id);
CREATE INDEX idx_exam_registrations_exam    ON exam_registrations(exam_id);
CREATE INDEX idx_exam_registrations_status  ON exam_registrations(status);

-- ============================================
-- ADMIN EXAMS (separate admin-managed exam flow)
-- ============================================

CREATE TABLE admin_exams (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_name               VARCHAR(100) NOT NULL,
    grade_id                INT REFERENCES grades(id),
    exam_date               DATE NOT NULL,
    registration_start_date DATE NOT NULL,
    registration_end_date   DATE NOT NULL,
    description             TEXT,
    status                  VARCHAR(20) DEFAULT 'draft'
                            CHECK (status IN ('draft', 'registration_open', 'in_progress', 'completed', 'cancelled')),
    created_by              INT REFERENCES admins(id),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_exam_subjects (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_exam_id INT NOT NULL REFERENCES admin_exams(id) ON DELETE CASCADE,
    subject_id    INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (admin_exam_id, subject_id)
);

CREATE TABLE admin_exam_registrations (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_exam_id    INT NOT NULL REFERENCES admin_exams(id) ON DELETE CASCADE,
    student_id       INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    admission_number VARCHAR(20) UNIQUE,
    registered_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status           VARCHAR(20) DEFAULT 'registered'
                     CHECK (status IN ('registered', 'cancelled', 'attended')),
    UNIQUE (admin_exam_id, student_id)
);

CREATE TABLE admin_exam_student_choices (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES admin_exam_registrations(id) ON DELETE CASCADE,
    subject_id      INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (registration_id, subject_id)
);

CREATE INDEX idx_admin_exams_grade          ON admin_exams(grade_id);
CREATE INDEX idx_admin_exams_status         ON admin_exams(status);
CREATE INDEX idx_admin_exam_subjects_exam   ON admin_exam_subjects(admin_exam_id);
CREATE INDEX idx_admin_exam_regs_exam       ON admin_exam_registrations(admin_exam_id);
CREATE INDEX idx_admin_exam_regs_student    ON admin_exam_registrations(student_id);
CREATE INDEX idx_admin_exam_choices_reg     ON admin_exam_student_choices(registration_id);
CREATE INDEX idx_admin_exam_choices_subject ON admin_exam_student_choices(subject_id);

-- ============================================
-- ATTENDANCE
-- ============================================

CREATE TABLE attendance (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id  INT NOT NULL REFERENCES exam_registrations(id) ON DELETE CASCADE,
    subject_id       INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    attended         BOOLEAN DEFAULT FALSE,
    marked_by        INT REFERENCES users(id),
    marked_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes            TEXT
);

CREATE INDEX idx_attendance_registration ON attendance(registration_id);
CREATE INDEX idx_attendance_subject      ON attendance(subject_id);

-- ============================================
-- RESULTS
-- ============================================

CREATE TABLE results (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id  INT NOT NULL REFERENCES exam_registrations(id) ON DELETE CASCADE,
    exam_subject_id  INT NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
    marks_obtained   DECIMAL(5,2) NOT NULL,
    grade            VARCHAR(2),
    rank             INT,
    entered_by       INT REFERENCES tutors(id),
    entry_date       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified         BOOLEAN DEFAULT FALSE,
    verified_by      INT REFERENCES admins(id),
    verified_at      TIMESTAMP,
    UNIQUE (registration_id, exam_subject_id)
);

CREATE INDEX idx_results_registration  ON results(registration_id);
CREATE INDEX idx_results_exam_subject  ON results(exam_subject_id);
CREATE INDEX idx_results_entered_by    ON results(entered_by);

-- ============================================
-- OVERALL RESULTS
-- ============================================

CREATE TABLE overall_results (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id  INT UNIQUE NOT NULL REFERENCES exam_registrations(id) ON DELETE CASCADE,
    total_marks      DECIMAL(7,2) NOT NULL,
    percentage       DECIMAL(5,2) NOT NULL,
    overall_rank     INT,
    result_status    VARCHAR(20) CHECK (result_status IN ('pass', 'fail')),
    z_score          DECIMAL(5,3)
);

CREATE INDEX idx_overall_results_registration ON overall_results(registration_id);
CREATE INDEX idx_overall_results_rank         ON overall_results(overall_rank);

-- ============================================
-- PAPERS & MARKING SCHEMES
-- ============================================

CREATE TABLE papers (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_subject_id         INT NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
    paper_title             VARCHAR(200) NOT NULL,
    paper_type              VARCHAR(50) CHECK (paper_type IN (
                                'question_paper', 'marking_scheme', 'answer_sheet', 'model_answer')),
    file_path               VARCHAR(255) NOT NULL,
    file_size               INT,
    uploaded_by             INT REFERENCES tutors(id),
    uploaded_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_visible_to_students  BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_papers_exam_subject ON papers(exam_subject_id);
CREATE INDEX idx_papers_type         ON papers(paper_type);
CREATE INDEX idx_papers_uploaded_by  ON papers(uploaded_by);

CREATE TABLE student_paper_downloads (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id    INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    paper_id      INT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, paper_id, downloaded_at)
);

CREATE INDEX idx_student_downloads_student ON student_paper_downloads(student_id);
CREATE INDEX idx_student_downloads_paper   ON student_paper_downloads(paper_id);

-- ============================================
-- ANALYTICS
-- ============================================

CREATE TABLE analytics (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id                 INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    subject_id              INT REFERENCES subjects(id) ON DELETE CASCADE,
    average_marks           DECIMAL(5,2),
    highest_marks           DECIMAL(5,2),
    lowest_marks            DECIMAL(5,2),
    pass_count              INT DEFAULT 0,
    fail_count              INT DEFAULT 0,
    attendance_percentage   DECIMAL(5,2),
    calculated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_exam    ON analytics(exam_id);
CREATE INDEX idx_analytics_subject ON analytics(subject_id);

-- ============================================
-- COMMUNICATION
-- ============================================

CREATE TABLE notifications (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    type        VARCHAR(50) CHECK (type IN ('exam', 'result', 'payment', 'general', 'paper')),
    priority    VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    read_status BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at     TIMESTAMP,
    email_sent  BOOLEAN DEFAULT FALSE,
    sms_sent    BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_status);
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE TABLE announcements (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    content          TEXT NOT NULL,
    target_audience  VARCHAR(20) CHECK (target_audience IN ('all', 'students', 'tutors')),
    created_by       INT REFERENCES admins(id),
    published_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at       TIMESTAMP,
    status           VARCHAR(20) DEFAULT 'published'
                     CHECK (status IN ('draft', 'published', 'expired'))
);

CREATE INDEX idx_announcements_audience ON announcements(target_audience);
CREATE INDEX idx_announcements_status   ON announcements(status);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    table_name  VARCHAR(50) NOT NULL,
    record_id   INT,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table     ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

CREATE OR REPLACE VIEW v_student_results AS
SELECT 
    s.index_number,
    u.full_name          AS student_name,
    e.exam_name,
    sub.subject_name,
    r.marks_obtained,
    r.grade,
    r.rank,
    es.max_marks,
    ROUND((r.marks_obtained / es.max_marks * 100), 2) AS percentage
FROM results r
JOIN exam_registrations er ON r.registration_id = er.id
JOIN students s            ON er.student_id = s.id
JOIN users u               ON s.user_id = u.id
JOIN exam_subjects es      ON r.exam_subject_id = es.id
JOIN exams e               ON es.exam_id = e.id
JOIN subjects sub          ON es.subject_id = sub.id
WHERE r.verified = TRUE;

CREATE OR REPLACE VIEW v_exam_summary AS
SELECT 
    e.exam_name,
    e.exam_date,
    e.status,
    COUNT(DISTINCT er.id) AS total_registrations,
    COUNT(DISTINCT CASE WHEN er.payment_status = 'paid' THEN er.id END) AS paid_count,
    COUNT(DISTINCT CASE WHEN er.status = 'attended' THEN er.id END) AS attended_count,
    e.admission_card_released,
    e.results_published
FROM exams e
LEFT JOIN exam_registrations er ON e.id = er.exam_id
GROUP BY e.id, e.exam_name, e.exam_date, e.status,
         e.admission_card_released, e.results_published;

CREATE OR REPLACE VIEW v_tutor_workload AS
SELECT 
    u.full_name AS tutor_name,
    COUNT(DISTINCT ts.subject_id) AS subjects_count,
    COUNT(DISTINCT r.id) AS marks_entered,
    COUNT(DISTINCT CASE WHEN r.verified = TRUE THEN r.id END) AS verified_marks
FROM tutors t
JOIN users u ON t.user_id = u.id
LEFT JOIN tutor_subjects ts ON t.id = ts.tutor_id
LEFT JOIN results r ON t.id = r.entered_by
GROUP BY t.id, u.full_name;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users                  IS 'Base table for all user authentication';
COMMENT ON TABLE students               IS 'Student profile information';
COMMENT ON TABLE tutors                 IS 'Tutor/Teacher information';
COMMENT ON TABLE admins                 IS 'System administrators';
COMMENT ON TABLE grades                 IS 'Grade/Batch information (focused on Grade 11)';
COMMENT ON TABLE subjects               IS 'OL subjects list';
COMMENT ON TABLE tutor_subjects         IS 'Many-to-many relationship between tutors and subjects';
COMMENT ON TABLE exams                  IS 'Mock / Trial / Final exam information';
COMMENT ON TABLE exam_subjects          IS 'Subjects included in each exam with marks settings';
COMMENT ON TABLE papers                 IS 'Question papers, marking schemes, and answer sheets';
COMMENT ON TABLE student_paper_downloads IS 'Track which students downloaded which papers';
COMMENT ON TABLE results                IS 'Individual subject results';
COMMENT ON TABLE overall_results        IS 'Overall exam performance';
COMMENT ON TABLE notifications          IS 'User notifications system';
COMMENT ON TABLE audit_logs             IS 'Security and change tracking';