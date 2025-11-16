-- ============================================================
-- Script tổng hợp: Setup Skills cho PostgreSQL
-- Bao gồm: Migration (thêm recording_category) + Insert data
-- ============================================================

-- ===== PHẦN 1: MIGRATION - Thêm cột recording_category (nếu chưa có) =====
-- Thêm column recording_category (nullable, optional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'skills' AND column_name = 'recording_category'
    ) THEN
        ALTER TABLE skills ADD COLUMN recording_category VARCHAR(50);
        
        -- Thêm check constraint
        ALTER TABLE skills 
        ADD CONSTRAINT check_recording_category 
        CHECK (recording_category IN ('VOCAL', 'INSTRUMENT') OR recording_category IS NULL);
        
        -- Tạo index
        CREATE INDEX idx_skills_recording_category ON skills (recording_category);
        
        RAISE NOTICE 'Đã thêm cột recording_category';
    ELSE
        RAISE NOTICE 'Cột recording_category đã tồn tại';
    END IF;
END $$;

-- ===== PHẦN 2: INSERT DATA =====
-- Xóa dữ liệu cũ (nếu cần) - Bỏ comment dòng dưới để xóa
-- DELETE FROM skills;

-- TRANSCRIPTION SKILLS (19 skills)
INSERT INTO skills (skill_id, skill_name, skill_type, description, is_active, created_by, created_at, updated_by, updated_at)
VALUES 
    (gen_random_uuid(), 'Piano Transcription', 'TRANSCRIPTION', 'Transcription cho đàn piano', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Guitar Transcription', 'TRANSCRIPTION', 'Transcription cho guitar', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Violin Transcription', 'TRANSCRIPTION', 'Transcription cho violin', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Cello Transcription', 'TRANSCRIPTION', 'Transcription cho cello', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Viola Transcription', 'TRANSCRIPTION', 'Transcription cho viola', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Double Bass Transcription', 'TRANSCRIPTION', 'Transcription cho double bass', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Drums Transcription', 'TRANSCRIPTION', 'Transcription cho trống và percussion', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Bass Transcription', 'TRANSCRIPTION', 'Transcription cho bass guitar', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Flute Transcription', 'TRANSCRIPTION', 'Transcription cho sáo', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Clarinet Transcription', 'TRANSCRIPTION', 'Transcription cho clarinet', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Saxophone Transcription', 'TRANSCRIPTION', 'Transcription cho saxophone', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Trumpet Transcription', 'TRANSCRIPTION', 'Transcription cho trumpet', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Trombone Transcription', 'TRANSCRIPTION', 'Transcription cho trombone', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'French Horn Transcription', 'TRANSCRIPTION', 'Transcription cho french horn', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Vocal Transcription', 'TRANSCRIPTION', 'Transcription cho giọng hát', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'String Ensemble Transcription', 'TRANSCRIPTION', 'Transcription cho dàn nhạc dây', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Orchestra Transcription', 'TRANSCRIPTION', 'Transcription cho dàn nhạc giao hưởng', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Jazz Transcription', 'TRANSCRIPTION', 'Transcription nhạc jazz', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Pop/Rock Transcription', 'TRANSCRIPTION', 'Transcription nhạc pop/rock', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP)
ON CONFLICT (skill_name) DO NOTHING;

-- ARRANGEMENT SKILLS (22 skills)
INSERT INTO skills (skill_id, skill_name, skill_type, description, is_active, created_by, created_at, updated_by, updated_at)
VALUES 
    (gen_random_uuid(), 'Piano Arrangement', 'ARRANGEMENT', 'Sắp xếp cho đàn piano', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Guitar Arrangement', 'ARRANGEMENT', 'Sắp xếp cho đàn guitar (acoustic, electric, classical)', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Drums Arrangement', 'ARRANGEMENT', 'Sắp xếp cho trống', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Bass Arrangement', 'ARRANGEMENT', 'Sắp xếp cho bass guitar', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Violin Arrangement', 'ARRANGEMENT', 'Sắp xếp cho violin', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Cello Arrangement', 'ARRANGEMENT', 'Sắp xếp cho cello', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Viola Arrangement', 'ARRANGEMENT', 'Sắp xếp cho viola', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Double Bass Arrangement', 'ARRANGEMENT', 'Sắp xếp cho double bass', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Flute Arrangement', 'ARRANGEMENT', 'Sắp xếp cho sáo', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Clarinet Arrangement', 'ARRANGEMENT', 'Sắp xếp cho clarinet', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Saxophone Arrangement', 'ARRANGEMENT', 'Sắp xếp cho saxophone', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Trumpet Arrangement', 'ARRANGEMENT', 'Sắp xếp cho trumpet', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Trombone Arrangement', 'ARRANGEMENT', 'Sắp xếp cho trombone', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'French Horn Arrangement', 'ARRANGEMENT', 'Sắp xếp cho french horn', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Vocal Arrangement', 'ARRANGEMENT', 'Sắp xếp cho giọng hát', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'String Ensemble Arrangement', 'ARRANGEMENT', 'Sắp xếp cho dàn nhạc dây (string quartet, string orchestra)', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Orchestra Arrangement', 'ARRANGEMENT', 'Sắp xếp cho dàn nhạc giao hưởng', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Jazz Arrangement', 'ARRANGEMENT', 'Sắp xếp nhạc jazz', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Pop Arrangement', 'ARRANGEMENT', 'Sắp xếp nhạc pop', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Rock Arrangement', 'ARRANGEMENT', 'Sắp xếp nhạc rock', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Electronic Music Arrangement', 'ARRANGEMENT', 'Sắp xếp nhạc điện tử', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Choir Arrangement', 'ARRANGEMENT', 'Sắp xếp cho dàn hợp xướng', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP)
ON CONFLICT (skill_name) DO NOTHING;

-- RECORDING ARTIST SKILLS (21 skills) - Có recording_category
INSERT INTO skills (skill_id, skill_name, skill_type, recording_category, description, is_active, created_by, created_at, updated_by, updated_at)
VALUES 
    -- Vocal (5 skills)
    (gen_random_uuid(), 'Vocal', 'RECORDING_ARTIST', 'VOCAL', 'Hát các thể loại nhạc khác nhau', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Soprano', 'RECORDING_ARTIST', 'VOCAL', 'Giọng nữ cao', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Alto', 'RECORDING_ARTIST', 'VOCAL', 'Giọng nữ trầm', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Tenor', 'RECORDING_ARTIST', 'VOCAL', 'Giọng nam cao', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Bass Voice', 'RECORDING_ARTIST', 'VOCAL', 'Giọng nam trầm', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    -- Instrument Performance (16 skills)
    (gen_random_uuid(), 'Piano Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn piano', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Guitar Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn guitar', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Drums Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn trống', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Bass Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn bass', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Violin Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn violin', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Cello Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn cello', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Saxophone Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn saxophone', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Trumpet Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn trumpet', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Flute Performance', 'RECORDING_ARTIST', 'INSTRUMENT', 'Biểu diễn sáo', true, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP)
    ON CONFLICT (skill_name) DO NOTHING;

-- ===== PHẦN 3: KIỂM TRA KẾT QUẢ =====
SELECT 
    skill_type,
    recording_category,
    COUNT(*) as count
FROM skills
GROUP BY skill_type, recording_category
ORDER BY skill_type, recording_category;

