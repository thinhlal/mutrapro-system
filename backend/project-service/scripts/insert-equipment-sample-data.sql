-- Seed data cho bảng equipment và skill_equipment_mapping
-- Database: project_db (hoặc tên database của project-service)
-- Lưu ý: 
-- 1. Script này giả định skills table có trong cùng database hoặc có cross-database access
-- 2. Nếu skills table ở database khác (specialist_db), cần:
--    - Lấy skill_ids từ specialist_db.skills table (WHERE skill_name = 'Piano Performance', etc.)
--    - Update các SELECT statements trong phần skill_equipment_mapping với skill_ids thực tế (String UUIDs)
-- 3. Đảm bảo đã chạy setup_skills_postgresql.sql trong specialist_db trước khi chạy script này

-- Yêu cầu: pgcrypto để sinh UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- 1. Insert sample equipment
-- ========================================
-- Lưu ý: brand và model phải unique (constraint)
INSERT INTO equipment (equipment_id, equipment_name, brand, model, description, specifications, rental_fee, total_quantity, is_active, created_by, created_at, updated_at)
VALUES 
    -- Piano Equipment
    (gen_random_uuid(), 'Yamaha C3 Grand Piano', 'Yamaha', 'C3', 'Grand piano 6 feet, mellow tone', '{"type": "Grand Piano", "size": "6 feet", "keys": 88, "pedals": 3}'::jsonb, 500000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Steinway Model D', 'Steinway & Sons', 'Model D', 'Concert grand piano, professional grade', '{"type": "Concert Grand", "size": "8 feet 11 inches", "keys": 88, "pedals": 3}'::jsonb, 800000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Digital Piano Yamaha P-125', 'Yamaha', 'P-125', 'Digital piano, portable, 88 weighted keys', '{"type": "Digital Piano", "keys": 88, "weighted": true, "connectivity": "USB, MIDI"}'::jsonb, 200000, 2, true, 'SYSTEM', NOW(), NOW()),
    
    -- Guitar Equipment
    (gen_random_uuid(), 'Fender Stratocaster', 'Fender', 'Stratocaster Standard', 'Electric guitar, 3 single-coil pickups', '{"type": "Electric Guitar", "strings": 6, "pickups": "3 Single-coil", "tone": "Bright"}'::jsonb, 300000, 2, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Gibson Les Paul Standard', 'Gibson', 'Les Paul Standard', 'Electric guitar, 2 humbucker pickups', '{"type": "Electric Guitar", "strings": 6, "pickups": "2 Humbucker", "tone": "Warm"}'::jsonb, 350000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Taylor 314ce Acoustic', 'Taylor', '314ce', 'Acoustic-electric guitar, cutaway', '{"type": "Acoustic-Electric Guitar", "strings": 6, "body": "Grand Auditorium", "cutaway": true}'::jsonb, 250000, 2, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Martin D-28 Acoustic', 'Martin', 'D-28', 'Acoustic guitar, dreadnought body', '{"type": "Acoustic Guitar", "strings": 6, "body": "Dreadnought", "tonewood": "Spruce/Rosewood"}'::jsonb, 300000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Drum Equipment
    (gen_random_uuid(), 'Pearl Export Series Drum Kit', 'Pearl', 'Export Series', '5-piece drum kit with cymbals', '{"type": "Drum Kit", "pieces": 5, "includes_cymbals": true, "snare": "14x5.5"}'::jsonb, 400000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'DW Collector Series', 'DW', 'Collector Series', 'Professional drum kit, custom finish', '{"type": "Drum Kit", "pieces": 6, "includes_cymbals": false, "snare": "14x6.5"}'::jsonb, 600000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Bass Equipment
    (gen_random_uuid(), 'Fender Precision Bass', 'Fender', 'Precision Bass', 'Electric bass guitar, 4 strings', '{"type": "Electric Bass", "strings": 4, "pickup": "Split-coil P-Bass"}'::jsonb, 280000, 2, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Fender Jazz Bass', 'Fender', 'Jazz Bass', 'Electric bass guitar, 4 strings, dual pickups', '{"type": "Electric Bass", "strings": 4, "pickups": "2 Single-coil J-Bass"}'::jsonb, 290000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Violin Equipment
    (gen_random_uuid(), 'Stradivarius Violin Replica', 'Antonio Stradivari', 'Replica', 'Professional violin, handcrafted', '{"type": "Violin", "strings": 4, "size": "4/4"}'::jsonb, 400000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Yamaha Violin YVN500', 'Yamaha', 'YVN500', 'Student violin, good quality', '{"type": "Violin", "strings": 4, "size": "4/4"}'::jsonb, 250000, 2, true, 'SYSTEM', NOW(), NOW()),
    
    -- Cello Equipment
    (gen_random_uuid(), 'Yamaha Cello C40', 'Yamaha', 'C40', 'Student cello, full size', '{"type": "Cello", "strings": 4, "size": "4/4"}'::jsonb, 450000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Saxophone Equipment
    (gen_random_uuid(), 'Yamaha YAS-280 Alto Saxophone', 'Yamaha', 'YAS-280', 'Alto saxophone, student model', '{"type": "Alto Saxophone", "key": "Eb"}'::jsonb, 350000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Selmer Paris Tenor Saxophone', 'Selmer', 'Paris Tenor', 'Professional tenor saxophone', '{"type": "Tenor Saxophone", "key": "Bb"}'::jsonb, 600000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Trumpet Equipment
    (gen_random_uuid(), 'Yamaha YTR-2330 Trumpet', 'Yamaha', 'YTR-2330', 'Student trumpet, Bb key', '{"type": "Trumpet", "key": "Bb"}'::jsonb, 300000, 2, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Bach Stradivarius Trumpet', 'Bach', 'Stradivarius', 'Professional trumpet, Bb key', '{"type": "Trumpet", "key": "Bb"}'::jsonb, 500000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Flute Equipment
    (gen_random_uuid(), 'Yamaha YFL-222 Flute', 'Yamaha', 'YFL-222', 'Student flute, silver-plated', '{"type": "Flute", "key": "C"}'::jsonb, 280000, 2, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Pearl Quantz Flute', 'Pearl', 'Quantz', 'Professional flute, silver', '{"type": "Flute", "key": "C"}'::jsonb, 450000, 1, true, 'SYSTEM', NOW(), NOW()),
    
    -- Other Instruments (Stage Piano/Keyboard)
    (gen_random_uuid(), 'Roland RD-2000 Stage Piano', 'Roland', 'RD-2000', 'Stage piano, 88 weighted keys, multiple sounds', '{"type": "Stage Piano", "keys": 88, "weighted": true, "sounds": "Multiple"}'::jsonb, 350000, 1, true, 'SYSTEM', NOW(), NOW()),
    (gen_random_uuid(), 'Nord Stage 3', 'Nord', 'Stage 3', 'Stage keyboard, 88 weighted keys', '{"type": "Stage Keyboard", "keys": 88, "weighted": true, "sounds": "Piano, Organ, Synth"}'::jsonb, 400000, 1, true, 'SYSTEM', NOW(), NOW())
ON CONFLICT (brand, model) DO NOTHING;

-- ========================================
-- 2. Kiểm tra dữ liệu đã insert
-- ========================================
SELECT 
    equipment_id,
    equipment_name,
    brand,
    model,
    rental_fee,
    total_quantity,
    total_quantity AS available_quantity,
    is_active,
    created_at
FROM equipment
ORDER BY equipment_name;

SELECT 
    COUNT(*) AS total_equipment,
    COUNT(*) FILTER (WHERE is_active = true) AS active_equipment,
    COUNT(*) FILTER (WHERE total_quantity > 0 AND is_active = true) AS available_equipment
FROM equipment;

-- ========================================
-- 3. HƯỚNG DẪN: Map Equipment với Skills
-- ========================================
-- Lưu ý: Skills table nằm ở specialist_db (database khác)
-- Không thể query trực tiếp từ project_db
--
-- CÁCH LÀM:
-- 1. Chạy get-skill-ids-helper.sql trong specialist_db để lấy skill_ids
-- 2. Update skill_ids vào insert-equipment-mapping-with-skill-ids.sql
-- 3. Chạy insert-equipment-mapping-with-skill-ids.sql trong project_db
--
-- Sau khi map xong, kiểm tra bằng query:
-- SELECT 
--     sem.mapping_id,
--     sem.skill_id,
--     e.equipment_name,
--     e.brand,
--     e.model
-- FROM skill_equipment_mapping sem
-- JOIN equipment e ON sem.equipment_id = e.equipment_id
-- ORDER BY e.equipment_name;

