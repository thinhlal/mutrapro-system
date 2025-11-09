-- Migration script: Tạo bảng pricing_matrix và insert dữ liệu mẫu
-- Chạy script này để tạo bảng và dữ liệu pricing matrix

-- Tạo bảng pricing_matrix nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS pricing_matrix (
    pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL,
    unit_type VARCHAR(20) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: mỗi service_type chỉ có 1 bản ghi (1 ServiceType = 1 PricingMatrix)
    CONSTRAINT uk_pricing_matrix_service_type UNIQUE (service_type)
);

-- Tạo indexes
CREATE INDEX IF NOT EXISTS idx_pricing_matrix_service_type ON pricing_matrix(service_type);
CREATE INDEX IF NOT EXISTS idx_pricing_matrix_currency ON pricing_matrix(currency);
CREATE INDEX IF NOT EXISTS idx_pricing_matrix_is_active ON pricing_matrix(is_active);

-- Comment
COMMENT ON TABLE pricing_matrix IS 'Bảng giá chuẩn theo service type. Mỗi service type chỉ có 1 pricing matrix (1 ServiceType = 1 PricingMatrix)';
COMMENT ON COLUMN pricing_matrix.service_type IS 'Loại dịch vụ: transcription, arrangement, arrangement_with_recording, recording. UNIQUE constraint: mỗi service type chỉ có 1 pricing matrix';
COMMENT ON COLUMN pricing_matrix.unit_type IS 'Đơn vị tính: per_minute (transcription), per_song (arrangement, arrangement_with_recording, recording)';
COMMENT ON COLUMN pricing_matrix.base_price IS 'Giá cơ bản cho mỗi đơn vị (VND)';
COMMENT ON COLUMN pricing_matrix.currency IS 'Loại tiền tệ: VND, USD, EUR';

-- Insert dữ liệu mẫu
-- Transcription: tính theo phút
INSERT INTO pricing_matrix (service_type, unit_type, base_price, currency, description, is_active)
VALUES 
    ('transcription', 'per_minute', 5000.00, 'VND', 'Giá ký âm theo phút', true)
ON CONFLICT (service_type) DO UPDATE
SET base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Arrangement: tính theo bài
INSERT INTO pricing_matrix (service_type, unit_type, base_price, currency, description, is_active)
VALUES 
    ('arrangement', 'per_song', 1500000.00, 'VND', 'Giá phối khí theo bài', true)
ON CONFLICT (service_type) DO UPDATE
SET base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Arrangement with Recording: tính theo bài (chưa bao gồm phí ca sĩ)
INSERT INTO pricing_matrix (service_type, unit_type, base_price, currency, description, is_active)
VALUES 
    ('arrangement_with_recording', 'per_song', 2000000.00, 'VND', 'Giá phối khí + thu âm theo bài (chưa bao gồm phí ca sĩ)', true)
ON CONFLICT (service_type) DO UPDATE
SET base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Recording: tính theo bài (thống nhất với arrangement)
INSERT INTO pricing_matrix (service_type, unit_type, base_price, currency, description, is_active)
VALUES 
    ('recording', 'per_song', 1500000.00, 'VND', 'Giá thu âm theo bài', true)
ON CONFLICT (service_type) DO UPDATE
SET base_price = EXCLUDED.base_price,
    unit_type = EXCLUDED.unit_type,
    description = EXCLUDED.description,
    updated_at = NOW();

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

