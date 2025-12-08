-- Seed data cho bảng pricing_matrix (bảng đã được tạo bởi request-service)
-- Yêu cầu: pgcrypto để sinh UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert dữ liệu mẫu
-- Transcription: tính theo phút
INSERT INTO pricing_matrix (pricing_id, service_type, unit_type, base_price, currency, description, is_active, created_by, created_at, updated_by, updated_at)
SELECT gen_random_uuid(), 'transcription', 'per_minute', 50000.00, 'VND', 'Giá ký âm theo phút', true, 'SYSTEM', NOW(), 'SYSTEM', NOW()
WHERE NOT EXISTS (SELECT 1 FROM pricing_matrix WHERE service_type = 'transcription');

-- Arrangement: tính theo bài
INSERT INTO pricing_matrix (pricing_id, service_type, unit_type, base_price, currency, description, is_active, created_by, created_at, updated_by, updated_at)
SELECT gen_random_uuid(), 'arrangement', 'per_song', 1500000.00, 'VND', 'Giá phối khí theo bài', true, 'SYSTEM', NOW(), 'SYSTEM', NOW()
WHERE NOT EXISTS (SELECT 1 FROM pricing_matrix WHERE service_type = 'arrangement');

-- Arrangement with Recording: tính theo bài (chưa bao gồm phí ca sĩ)
INSERT INTO pricing_matrix (pricing_id, service_type, unit_type, base_price, currency, description, is_active, created_by, created_at, updated_by, updated_at)
SELECT gen_random_uuid(), 'arrangement_with_recording', 'per_song', 2000000.00, 'VND', 'Giá phối khí + thu âm theo bài', true, 'SYSTEM', NOW(), 'SYSTEM', NOW()
WHERE NOT EXISTS (SELECT 1 FROM pricing_matrix WHERE service_type = 'arrangement_with_recording');

-- Recording: tính theo bài (thống nhất với arrangement)
INSERT INTO pricing_matrix (pricing_id, service_type, unit_type, base_price, currency, description, is_active, created_by, created_at, updated_by, updated_at)
SELECT gen_random_uuid(), 'recording', 'per_song', 1500000.00, 'VND', 'Giá thu âm theo bài', true, 'SYSTEM', NOW(), 'SYSTEM', NOW()
WHERE NOT EXISTS (SELECT 1 FROM pricing_matrix WHERE service_type = 'recording');

-- Kiểm tra dữ liệu đã insert
SELECT 
    pricing_id,
    service_type,
    unit_type,
    base_price,
    currency,
    description,
    is_active,
    created_at
FROM pricing_matrix
ORDER BY service_type, unit_type;

