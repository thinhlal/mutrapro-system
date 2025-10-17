# MIGRATION SCRIPTS CHO ARRANGEMENT PRICING SYSTEM

## Migration 010: Add Arrangement Pricing Fields

```sql
-- Migration: 010_add_arrangement_pricing_fields.sql
-- Mô tả: Thêm các fields cho arrangement pricing vào service_requests và quotations

-- 1. Thêm fields vào service_requests
ALTER TABLE service_requests 
ADD COLUMN instrument_count integer DEFAULT 0,
ADD COLUMN tempo_bpm integer,
ADD COLUMN key_signature varchar(10),
ADD COLUMN time_signature varchar(10) DEFAULT '4/4',
ADD COLUMN style_preference varchar(50),
ADD COLUMN complexity_factors jsonb DEFAULT '{}'::jsonb;

-- 2. Thêm fields vào quotations
ALTER TABLE quotations 
ADD COLUMN base_arrangement_price decimal(12,2) DEFAULT 0,
ADD COLUMN instrument_count integer DEFAULT 0,
ADD COLUMN free_instrument_count integer DEFAULT 3,
ADD COLUMN additional_instrument_count integer DEFAULT 0,
ADD COLUMN additional_instrument_price decimal(12,2) DEFAULT 0,
ADD COLUMN tempo_complexity_fee decimal(12,2) DEFAULT 0,
ADD COLUMN key_complexity_fee decimal(12,2) DEFAULT 0,
ADD COLUMN style_complexity_fee decimal(12,2) DEFAULT 0;

-- 3. Thêm indexes
CREATE INDEX idx_service_requests_instrument_count ON service_requests(instrument_count);
CREATE INDEX idx_service_requests_tempo_bpm ON service_requests(tempo_bpm);
CREATE INDEX idx_service_requests_style_preference ON service_requests(style_preference);

-- 4. Thêm constraints
ALTER TABLE service_requests 
ADD CONSTRAINT chk_instrument_count_positive CHECK (instrument_count >= 0),
ADD CONSTRAINT chk_tempo_bpm_range CHECK (tempo_bpm IS NULL OR (tempo_bpm >= 30 AND tempo_bpm <= 300));

-- 5. Comments
COMMENT ON COLUMN service_requests.instrument_count IS 'Số nhạc cụ yêu cầu cho arrangement';
COMMENT ON COLUMN service_requests.tempo_bpm IS 'Tempo của bài (BPM)';
COMMENT ON COLUMN service_requests.key_signature IS 'Key của bài (C, G, F#, etc.)';
COMMENT ON COLUMN service_requests.time_signature IS 'Nhịp của bài (4/4, 3/4, etc.)';
COMMENT ON COLUMN service_requests.style_preference IS 'Style nhạc (pop, jazz, classical, etc.)';
COMMENT ON COLUMN service_requests.complexity_factors IS 'Các yếu tố phức tạp khác (JSON)';

COMMENT ON COLUMN quotations.base_arrangement_price IS 'Giá cơ bản theo bài';
COMMENT ON COLUMN quotations.instrument_count IS 'Số nhạc cụ trong quotation';
COMMENT ON COLUMN quotations.free_instrument_count IS 'Số nhạc cụ miễn phí (default: 3)';
COMMENT ON COLUMN quotations.additional_instrument_count IS 'Số nhạc cụ tính phí';
COMMENT ON COLUMN quotations.additional_instrument_price IS 'Tổng phí nhạc cụ thêm';
COMMENT ON COLUMN quotations.tempo_complexity_fee IS 'Phí tempo phức tạp';
COMMENT ON COLUMN quotations.key_complexity_fee IS 'Phí key phức tạp';
COMMENT ON COLUMN quotations.style_complexity_fee IS 'Phí style phức tạp';
```

## Migration 011: Create Arrangement Pricing Rules Table

```sql
-- Migration: 011_create_arrangement_pricing_rules.sql
-- Mô tả: Tạo bảng arrangement_pricing_rules để quản lý pricing rules

-- 1. Tạo enum cho arrangement pricing rule types
CREATE TYPE arrangement_pricing_rule_type AS ENUM (
    'instrument_count',      -- Rule cho số nhạc cụ
    'tempo_complexity',      -- Rule cho tempo phức tạp
    'key_complexity',        -- Rule cho key phức tạp
    'style_complexity',      -- Rule cho style phức tạp
    'time_signature',        -- Rule cho nhịp phức tạp
    'custom_factor'          -- Rule tùy chỉnh khác
);

-- 2. Tạo bảng arrangement_pricing_rules
CREATE TABLE arrangement_pricing_rules (
    rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name varchar(100) NOT NULL,
    rule_type arrangement_pricing_rule_type NOT NULL,
    condition_description text NOT NULL,
    
    -- Pricing logic
    base_threshold integer DEFAULT 3, -- Ngưỡng cơ bản (VD: 3 instruments miễn phí)
    additional_price_per_unit decimal(12,2) DEFAULT 0, -- Giá cho mỗi unit vượt ngưỡng
    multiplier decimal(3,2) DEFAULT 1.0, -- Hệ số nhân
    
    -- Conditions (JSON for flexibility)
    conditions jsonb DEFAULT '{}'::jsonb, -- Điều kiện áp dụng rule
    
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 3. Thêm indexes
CREATE INDEX idx_arrangement_pricing_rules_type ON arrangement_pricing_rules(rule_type);
CREATE INDEX idx_arrangement_pricing_rules_active ON arrangement_pricing_rules(is_active);
CREATE INDEX idx_arrangement_pricing_rules_threshold ON arrangement_pricing_rules(base_threshold);

-- 4. Thêm constraints
ALTER TABLE arrangement_pricing_rules 
ADD CONSTRAINT chk_additional_price_positive CHECK (additional_price_per_unit >= 0),
ADD CONSTRAINT chk_multiplier_positive CHECK (multiplier >= 0),
ADD CONSTRAINT chk_base_threshold_positive CHECK (base_threshold >= 0);

-- 5. Comments
COMMENT ON TABLE arrangement_pricing_rules IS 'Rules cho arrangement pricing - instrument count, tempo, key complexity';
COMMENT ON COLUMN arrangement_pricing_rules.rule_name IS 'Tên rule (VD: "Extra Instruments Fee")';
COMMENT ON COLUMN arrangement_pricing_rules.rule_type IS 'Loại rule';
COMMENT ON COLUMN arrangement_pricing_rules.condition_description IS 'Mô tả điều kiện áp dụng rule';
COMMENT ON COLUMN arrangement_pricing_rules.base_threshold IS 'Ngưỡng cơ bản (VD: 3 instruments miễn phí)';
COMMENT ON COLUMN arrangement_pricing_rules.additional_price_per_unit IS 'Giá cho mỗi unit vượt ngưỡng';
COMMENT ON COLUMN arrangement_pricing_rules.multiplier IS 'Hệ số nhân';
COMMENT ON COLUMN arrangement_pricing_rules.conditions IS 'Điều kiện áp dụng rule (JSON)';
```

## Migration 012: Insert Default Arrangement Pricing Rules

```sql
-- Migration: 012_insert_default_arrangement_pricing_rules.sql
-- Mô tả: Insert các default pricing rules cho arrangement

-- 1. Rule cho instrument count (sau 3 instruments thì tính phí)
INSERT INTO arrangement_pricing_rules (
    rule_name, 
    rule_type, 
    condition_description, 
    base_threshold, 
    additional_price_per_unit, 
    conditions
) VALUES (
    'Extra Instruments Fee',
    'instrument_count',
    'Tính phí cho mỗi instrument sau 3 instruments miễn phí',
    3,
    50000, -- 50,000 VND per additional instrument
    '{"min_instruments": 4}'::jsonb
);

-- 2. Rule cho tempo complexity (tempo quá nhanh/chậm)
INSERT INTO arrangement_pricing_rules (
    rule_name, 
    rule_type, 
    condition_description, 
    base_threshold, 
    additional_price_per_unit, 
    conditions
) VALUES (
    'Extreme Tempo Fee',
    'tempo_complexity',
    'Tính phí cho tempo quá nhanh (<60 BPM) hoặc quá chậm (>180 BPM)',
    0,
    100000, -- 100,000 VND for extreme tempo
    '{"min_tempo": 60, "max_tempo": 180}'::jsonb
);

-- 3. Rule cho key complexity (key có nhiều dấu thăng/giáng)
INSERT INTO arrangement_pricing_rules (
    rule_name, 
    rule_type, 
    condition_description, 
    base_threshold, 
    additional_price_per_unit, 
    conditions
) VALUES (
    'Complex Key Signature Fee',
    'key_complexity',
    'Tính phí cho key có nhiều dấu thăng/giáng',
    0,
    75000, -- 75,000 VND for complex keys
    '{"complex_keys": ["C#", "F#", "B", "E#", "A#", "D#", "G#"]}'::jsonb
);

-- 4. Rule cho style complexity (style phức tạp)
INSERT INTO arrangement_pricing_rules (
    rule_name, 
    rule_type, 
    condition_description, 
    base_threshold, 
    additional_price_per_unit, 
    conditions
) VALUES (
    'Complex Style Fee',
    'style_complexity',
    'Tính phí cho style phức tạp như jazz, classical, progressive',
    0,
    150000, -- 150,000 VND for complex styles
    '{"complex_styles": ["jazz", "classical", "progressive", "experimental"]}'::jsonb
);

-- 5. Rule cho time signature phức tạp
INSERT INTO arrangement_pricing_rules (
    rule_name, 
    rule_type, 
    condition_description, 
    base_threshold, 
    additional_price_per_unit, 
    conditions
) VALUES (
    'Complex Time Signature Fee',
    'time_signature',
    'Tính phí cho nhịp phức tạp khác 4/4',
    0,
    50000, -- 50,000 VND for complex time signatures
    '{"standard_time_signature": "4/4", "complex_signatures": ["3/4", "6/8", "7/8", "5/4", "9/8"]}'::jsonb
);
```

## Migration 013: Create Arrangement Pricing Calculation Function

```sql
-- Migration: 013_create_arrangement_pricing_function.sql
-- Mô tả: Tạo function để tính giá arrangement tự động

-- 1. Function để tính giá arrangement
CREATE OR REPLACE FUNCTION calculate_arrangement_pricing(
    p_instrument_count INTEGER,
    p_tempo_bpm INTEGER,
    p_key_signature VARCHAR(10),
    p_style_preference VARCHAR(50),
    p_time_signature VARCHAR(10) DEFAULT '4/4'
)
RETURNS TABLE(
    base_price DECIMAL(12,2),
    additional_instrument_price DECIMAL(12,2),
    tempo_complexity_fee DECIMAL(12,2),
    key_complexity_fee DECIMAL(12,2),
    style_complexity_fee DECIMAL(12,2),
    time_signature_fee DECIMAL(12,2),
    total_price DECIMAL(12,2)
) AS $$
DECLARE
    base_arrangement_price DECIMAL(12,2);
    free_instrument_count INTEGER := 3;
    additional_instrument_count INTEGER;
    instrument_price_per_unit DECIMAL(12,2);
    tempo_fee DECIMAL(12,2) := 0;
    key_fee DECIMAL(12,2) := 0;
    style_fee DECIMAL(12,2) := 0;
    time_sig_fee DECIMAL(12,2) := 0;
BEGIN
    -- Lấy base price từ pricing matrix
    SELECT base_price INTO base_arrangement_price
    FROM pricing_matrix 
    WHERE service_type = 'arrangement' 
        AND complexity_level = 'moderate' 
        AND unit_type = 'per_song'
        AND is_active = true
    LIMIT 1;
    
    -- Tính additional instrument price
    additional_instrument_count := GREATEST(0, p_instrument_count - free_instrument_count);
    
    -- Lấy giá cho mỗi instrument thêm
    SELECT additional_price_per_unit INTO instrument_price_per_unit
    FROM arrangement_pricing_rules
    WHERE rule_type = 'instrument_count' AND is_active = true
    LIMIT 1;
    
    -- Tính tempo complexity fee
    IF p_tempo_bpm < 60 OR p_tempo_bpm > 180 THEN
        SELECT additional_price_per_unit INTO tempo_fee
        FROM arrangement_pricing_rules
        WHERE rule_type = 'tempo_complexity' AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Tính key complexity fee
    IF p_key_signature IN ('C#', 'F#', 'B', 'E#', 'A#', 'D#', 'G#') THEN
        SELECT additional_price_per_unit INTO key_fee
        FROM arrangement_pricing_rules
        WHERE rule_type = 'key_complexity' AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Tính style complexity fee
    IF p_style_preference IN ('jazz', 'classical', 'progressive', 'experimental') THEN
        SELECT additional_price_per_unit INTO style_fee
        FROM arrangement_pricing_rules
        WHERE rule_type = 'style_complexity' AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Tính time signature complexity fee
    IF p_time_signature NOT IN ('4/4', '2/4', '3/4') THEN
        SELECT additional_price_per_unit INTO time_sig_fee
        FROM arrangement_pricing_rules
        WHERE rule_type = 'time_signature' AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN QUERY
    SELECT 
        COALESCE(base_arrangement_price, 0) as base_price,
        (additional_instrument_count * COALESCE(instrument_price_per_unit, 0)) as additional_instrument_price,
        COALESCE(tempo_fee, 0) as tempo_complexity_fee,
        COALESCE(key_fee, 0) as key_complexity_fee,
        COALESCE(style_fee, 0) as style_complexity_fee,
        COALESCE(time_sig_fee, 0) as time_signature_fee,
        (COALESCE(base_arrangement_price, 0) + 
         (additional_instrument_count * COALESCE(instrument_price_per_unit, 0)) + 
         COALESCE(tempo_fee, 0) + 
         COALESCE(key_fee, 0) + 
         COALESCE(style_fee, 0) + 
         COALESCE(time_sig_fee, 0)) as total_price;
END;
$$ LANGUAGE plpgsql;

-- 2. Function để update quotation với pricing breakdown
CREATE OR REPLACE FUNCTION update_quotation_arrangement_pricing(p_quotation_id UUID)
RETURNS VOID AS $$
DECLARE
    pricing_result RECORD;
    request_info RECORD;
BEGIN
    -- Lấy thông tin request
    SELECT sr.instrument_count, sr.tempo_bpm, sr.key_signature, 
           sr.style_preference, sr.time_signature
    INTO request_info
    FROM quotations q
    JOIN service_requests sr ON q.request_id = sr.request_id
    WHERE q.quotation_id = p_quotation_id;
    
    -- Tính pricing
    SELECT * INTO pricing_result
    FROM calculate_arrangement_pricing(
        request_info.instrument_count,
        request_info.tempo_bpm,
        request_info.key_signature,
        request_info.style_preference,
        request_info.time_signature
    );
    
    -- Update quotation
    UPDATE quotations SET
        base_arrangement_price = pricing_result.base_price,
        instrument_count = request_info.instrument_count,
        additional_instrument_count = GREATEST(0, request_info.instrument_count - 3),
        additional_instrument_price = pricing_result.additional_instrument_price,
        tempo_complexity_fee = pricing_result.tempo_complexity_fee,
        key_complexity_fee = pricing_result.key_complexity_fee,
        style_complexity_fee = pricing_result.style_complexity_fee,
        base_price = pricing_result.total_price,
        total_price = pricing_result.total_price,
        deposit_amount = pricing_result.total_price * 0.4,
        final_amount = pricing_result.total_price * 0.6
    WHERE quotation_id = p_quotation_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Comments
COMMENT ON FUNCTION calculate_arrangement_pricing IS 'Tính giá arrangement dựa trên instrument count và complexity factors';
COMMENT ON FUNCTION update_quotation_arrangement_pricing IS 'Update quotation với pricing breakdown cho arrangement';
```

## Migration 014: Create Trigger for Auto Pricing Calculation

```sql
-- Migration: 014_create_auto_pricing_trigger.sql
-- Mô tả: Tạo trigger để tự động tính pricing khi có thay đổi

-- 1. Function trigger để auto-calculate pricing
CREATE OR REPLACE FUNCTION trigger_auto_calculate_arrangement_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ áp dụng cho arrangement requests
    IF NEW.request_type = 'arrangement' AND 
       (NEW.instrument_count IS NOT NULL OR 
        NEW.tempo_bpm IS NOT NULL OR 
        NEW.key_signature IS NOT NULL OR 
        NEW.style_preference IS NOT NULL) THEN
        
        -- Tìm quotation active của request này
        PERFORM update_quotation_arrangement_pricing(q.quotation_id)
        FROM quotations q
        WHERE q.request_id = NEW.request_id 
          AND q.is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo trigger
CREATE TRIGGER trg_auto_calculate_arrangement_pricing
    AFTER INSERT OR UPDATE OF instrument_count, tempo_bpm, key_signature, style_preference, time_signature
    ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_calculate_arrangement_pricing();

-- 3. Comments
COMMENT ON FUNCTION trigger_auto_calculate_arrangement_pricing IS 'Trigger function để tự động tính pricing khi có thay đổi arrangement details';
```

## Migration 015: Insert Sample Pricing Matrix Data

```sql
-- Migration: 015_insert_sample_pricing_matrix.sql
-- Mô tả: Insert sample data cho pricing matrix

-- 1. Insert arrangement pricing vào pricing_matrix
INSERT INTO pricing_matrix (
    service_type, 
    complexity_level, 
    unit_type, 
    base_price, 
    currency, 
    description
) VALUES 
-- Arrangement pricing
('arrangement', 'simple', 'per_song', 500000, 'VND', 'Arrangement đơn giản (1-3 instruments)'),
('arrangement', 'moderate', 'per_song', 800000, 'VND', 'Arrangement trung bình (4-6 instruments)'),
('arrangement', 'complex', 'per_song', 1200000, 'VND', 'Arrangement phức tạp (7+ instruments)'),
('arrangement', 'professional', 'per_song', 1800000, 'VND', 'Arrangement chuyên nghiệp (orchestral)'),
('arrangement', 'virtuoso', 'per_song', 2500000, 'VND', 'Arrangement siêu khó (classical, jazz)'),

-- Transcription pricing
('transcription', 'simple', 'per_minute', 50000, 'VND', 'Transcription đơn giản'),
('transcription', 'moderate', 'per_minute', 80000, 'VND', 'Transcription trung bình'),
('transcription', 'complex', 'per_minute', 120000, 'VND', 'Transcription phức tạp'),
('transcription', 'professional', 'per_minute', 180000, 'VND', 'Transcription chuyên nghiệp'),
('transcription', 'virtuoso', 'per_minute', 250000, 'VND', 'Transcription siêu khó'),

-- Recording pricing
('recording', 'simple', 'per_hour', 300000, 'VND', 'Recording đơn giản'),
('recording', 'moderate', 'per_hour', 500000, 'VND', 'Recording trung bình'),
('recording', 'complex', 'per_hour', 800000, 'VND', 'Recording phức tạp'),
('recording', 'professional', 'per_hour', 1200000, 'VND', 'Recording chuyên nghiệp'),
('recording', 'virtuoso', 'per_hour', 1800000, 'VND', 'Recording siêu khó');

-- 2. Comments
COMMENT ON TABLE pricing_matrix IS 'Bảng giá chuẩn cho tất cả services - Updated với arrangement pricing';
```

## ROLLBACK SCRIPTS

```sql
-- Rollback Migration 010
ALTER TABLE service_requests 
DROP COLUMN IF EXISTS instrument_count,
DROP COLUMN IF EXISTS tempo_bpm,
DROP COLUMN IF EXISTS key_signature,
DROP COLUMN IF EXISTS time_signature,
DROP COLUMN IF EXISTS style_preference,
DROP COLUMN IF EXISTS complexity_factors;

ALTER TABLE quotations 
DROP COLUMN IF EXISTS base_arrangement_price,
DROP COLUMN IF EXISTS instrument_count,
DROP COLUMN IF EXISTS free_instrument_count,
DROP COLUMN IF EXISTS additional_instrument_count,
DROP COLUMN IF EXISTS additional_instrument_price,
DROP COLUMN IF EXISTS tempo_complexity_fee,
DROP COLUMN IF EXISTS key_complexity_fee,
DROP COLUMN IF EXISTS style_complexity_fee;

-- Rollback Migration 011
DROP TABLE IF EXISTS arrangement_pricing_rules;
DROP TYPE IF EXISTS arrangement_pricing_rule_type;

-- Rollback Migration 012
-- (No rollback needed - just data)

-- Rollback Migration 013
DROP FUNCTION IF EXISTS calculate_arrangement_pricing(INTEGER, INTEGER, VARCHAR(10), VARCHAR(50), VARCHAR(10));
DROP FUNCTION IF EXISTS update_quotation_arrangement_pricing(UUID);

-- Rollback Migration 014
DROP TRIGGER IF EXISTS trg_auto_calculate_arrangement_pricing ON service_requests;
DROP FUNCTION IF EXISTS trigger_auto_calculate_arrangement_pricing();

-- Rollback Migration 015
DELETE FROM pricing_matrix WHERE service_type IN ('arrangement', 'transcription', 'recording');
```

## TESTING QUERIES

```sql
-- Test 1: Tính pricing cho arrangement đơn giản
SELECT * FROM calculate_arrangement_pricing(
    2,  -- 2 instruments (miễn phí)
    120, -- tempo bình thường
    'C', -- key đơn giản
    'pop', -- style đơn giản
    '4/4' -- nhịp chuẩn
);

-- Test 2: Tính pricing cho arrangement phức tạp
SELECT * FROM calculate_arrangement_pricing(
    5,  -- 5 instruments (2 tính phí)
    200, -- tempo nhanh
    'F#', -- key phức tạp
    'jazz', -- style phức tạp
    '7/8' -- nhịp phức tạp
);

-- Test 3: Kiểm tra pricing rules
SELECT rule_name, rule_type, additional_price_per_unit, conditions 
FROM arrangement_pricing_rules 
WHERE is_active = true 
ORDER BY rule_type;
```
