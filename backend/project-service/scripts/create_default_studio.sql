-- Migration: Create default studio for MuTraPro system
-- Date: 2024-01-XX
-- Description: 
--   - Create a default active studio for the single studio system
--   - This script can be run multiple times safely (uses INSERT ... ON CONFLICT DO NOTHING)
--   - Or use IF NOT EXISTS check

-- Option 1: Insert studio nếu chưa có studio nào active
-- (Phù hợp cho single studio system)
INSERT INTO studios (
    studio_id,
    studio_name,
    location,
    hourly_rate,
    free_external_guests_limit,
    extra_guest_fee_per_person,
    is_active,
    created_by,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as studio_id,
    'MuTraPro Studio' as studio_name,
    '123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh' as location,  -- Thay đổi địa chỉ thực tế
    200000.00 as hourly_rate,  -- 200,000 VND/giờ
    3 as free_external_guests_limit,  -- 3 khách ngoài miễn phí
    50000.00 as extra_guest_fee_per_person,  -- 50,000 VND/người cho khách ngoài vượt quá limit
    true as is_active,
    'SYSTEM' as created_by,  -- System user ID hoặc thay bằng user_id thực tế của admin
    NOW() as created_at,
    NOW() as updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM studios WHERE is_active = true
);

-- Option 2: Insert studio với studio_id cụ thể (nếu muốn control ID)
-- Uncomment và sửa studio_id nếu cần
/*
INSERT INTO studios (
    studio_id,
    studio_name,
    location,
    hourly_rate,
    free_external_guests_limit,
    extra_guest_fee_per_person,
    is_active,
    created_by,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Studio ID cố định
    'MuTraPro Studio',
    '123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh',
    200000.00,
    3,
    50000.00,
    true,
    'SYSTEM',  -- System user ID hoặc thay bằng user_id thực tế của admin
    NOW(),
    NOW()
)
ON CONFLICT (studio_id) DO NOTHING;
*/

-- Verification query
-- SELECT 
--     studio_id,
--     studio_name,
--     location,
--     hourly_rate,
--     free_external_guests_limit,
--     extra_guest_fee_per_person,
--     is_active,
--     created_at
-- FROM studios
-- WHERE is_active = true;

