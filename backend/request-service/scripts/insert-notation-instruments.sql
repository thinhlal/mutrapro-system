-- Script để insert dữ liệu mẫu cho bảng notation_instruments
-- Chạy script này trực tiếp vào database PostgreSQL

INSERT INTO notation_instruments (instrument_id, instrument_name, usage, base_price, is_active, created_by, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'Piano', 'both', 50000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Guitar', 'both', 30000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Violin', 'transcription', 40000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Drums', 'arrangement', 60000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Bass', 'both', 35000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Saxophone', 'transcription', 45000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Trumpet', 'transcription', 40000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Flute', 'transcription', 30000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Cello', 'arrangement', 50000, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Organ', 'both', 70000, true, 'SYSTEM', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Kiểm tra dữ liệu đã insert
SELECT * FROM notation_instruments ORDER BY instrument_name;

