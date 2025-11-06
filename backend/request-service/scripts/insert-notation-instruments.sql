-- Script để insert dữ liệu mẫu cho bảng notation_instruments
-- Chạy script này trực tiếp vào database PostgreSQL

INSERT INTO notation_instruments (instrument_id, instrument_name, usage, is_active, created_by, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'Piano', 'both', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Guitar', 'both', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Violin', 'transcription', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Drums', 'arrangement', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Bass', 'both', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Saxophone', 'transcription', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Trumpet', 'transcription', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Flute', 'transcription', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Cello', 'arrangement', true, 'system', NOW(), NOW()),
    (gen_random_uuid(), 'Organ', 'both', true, 'system', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Kiểm tra dữ liệu đã insert
SELECT * FROM notation_instruments ORDER BY instrument_name;

