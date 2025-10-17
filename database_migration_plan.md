# KẾ HOẠCH MIGRATION DATABASE CHO YÊU CẦU MỚI

## TỔNG QUAN
Hệ thống MuTraPro hiện tại đã khá hoàn chỉnh nhưng cần một số điều chỉnh để phù hợp với 3 luồng chính mới:
- **Luồng 1**: Transcription với AI assistance
- **Luồng 2**: Arrangement với option có/không vocalist + Contract management
- **Luồng 3**: Studio booking với multi-artist selection (đã có sẵn)

## CÁC THAY ĐỔI CẦN THIẾT

### 1. ARRANGEMENT WORKFLOW ENHANCEMENT

#### 1.1. Service Requests Updates
```sql
-- Migration: 001_add_arrangement_options.sql
ALTER TABLE service_requests 
ADD COLUMN arrangement_option arrangement_option_type,
ADD COLUMN requires_vocalist boolean DEFAULT false,
ADD COLUMN manager_discussion_notes text,
ADD COLUMN pricing_discussion_completed boolean DEFAULT false;

-- Enum mới
CREATE TYPE arrangement_option_type AS ENUM (
    'arrangement_only',
    'arrangement_with_vocalist'
);
```

#### 1.2. Artist Demo System Enhancement
```sql
-- Migration: 002_enhance_artist_demos.sql
ALTER TABLE artist_demos 
ADD COLUMN demo_order integer DEFAULT 1,
ADD COLUMN is_featured boolean DEFAULT false,
ADD COLUMN view_count integer DEFAULT 0,
ADD COLUMN customer_rating decimal(3,2),
ADD COLUMN last_played_at timestamp;

-- Bảng mới: Artist Recommendations
CREATE TABLE artist_recommendations (
    recommendation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES service_requests(request_id),
    specialist_id uuid REFERENCES specialists(specialist_id),
    demo_id uuid REFERENCES artist_demos(demo_id),
    recommended_by uuid REFERENCES users(user_id),
    recommendation_notes text,
    customer_choice boolean, -- Customer đã chọn artist này chưa
    created_at timestamp DEFAULT now()
);
```

### 2. CONTRACT MANAGEMENT SYSTEM

#### 2.1. Contracts Table
```sql
-- Migration: 003_add_contracts_system.sql
CREATE TYPE contract_type AS ENUM (
    'arrangement_only',
    'arrangement_with_recording',
    'studio_booking',
    'transcription'
);

CREATE TYPE contract_status AS ENUM (
    'draft',
    'sent_to_customer',
    'customer_reviewing',
    'signed',
    'expired',
    'cancelled'
);

CREATE TABLE contracts (
    contract_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id uuid REFERENCES quotations(quotation_id),
    customer_id uuid REFERENCES customers(customer_id),
    coordinator_id uuid REFERENCES service_coordinators(coordinator_id),
    contract_number varchar(50) UNIQUE NOT NULL,
    contract_type contract_type NOT NULL,
    terms_and_conditions text,
    special_clauses text,
    status contract_status DEFAULT 'draft',
    created_at timestamp DEFAULT now(),
    sent_to_customer_at timestamp,
    customer_reviewed_at timestamp,
    signed_at timestamp,
    expires_at timestamp,
    file_id uuid REFERENCES files(file_id), -- Contract PDF
    notes text
);

-- Indexes
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_coordinator_id ON contracts(coordinator_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);
```

### 3. MANAGER ROLE ENHANCEMENT

#### 3.1. Service Coordinators Updates
```sql
-- Migration: 004_enhance_manager_role.sql
CREATE TYPE manager_level_type AS ENUM (
    'junior',
    'senior',
    'lead'
);

ALTER TABLE service_coordinators 
ADD COLUMN can_manage_contracts boolean DEFAULT true,
ADD COLUMN can_recommend_artists boolean DEFAULT true,
ADD COLUMN can_negotiate_pricing boolean DEFAULT true,
ADD COLUMN manager_level manager_level_type DEFAULT 'junior',
ADD COLUMN specialization_areas jsonb DEFAULT '[]'::jsonb, -- ['transcription', 'arrangement', 'studio']
ADD COLUMN max_concurrent_projects integer DEFAULT 15; -- Tăng từ 10 lên 15
```

### 4. AI TRANSCRIPTION SUPPORT

#### 4.1. Task Assignments AI Fields
```sql
-- Migration: 005_add_ai_transcription_support.sql
ALTER TABLE task_assignments 
ADD COLUMN ai_assistance_used boolean DEFAULT false,
ADD COLUMN ai_confidence_score decimal(3,2), -- 0.00 - 1.00
ADD COLUMN manual_review_required boolean DEFAULT false,
ADD COLUMN ai_review_notes text,
ADD COLUMN ai_model_used varchar(100), -- 'whisper', 'custom_model_v1', etc.
ADD COLUMN processing_time_seconds integer; -- Thời gian AI xử lý
```

### 5. NOTATION EDITOR INTEGRATION

#### 5.1. Files Table Updates
```sql
-- Migration: 006_add_notation_editor_support.sql
ALTER TABLE files 
ADD COLUMN notation_editor_used varchar(50), -- 'musescore', 'sibelius', 'finale', 'custom'
ADD COLUMN notation_version varchar(20),
ADD COLUMN export_formats jsonb DEFAULT '["pdf"]'::jsonb, -- ['pdf', 'musicxml', 'midi']
ADD COLUMN ai_transcription_confidence decimal(3,2),
ADD COLUMN manual_edits_count integer DEFAULT 0;
```

### 6. WORKFLOW STATUS ENHANCEMENTS

#### 6.1. Request Status Updates
```sql
-- Migration: 007_enhance_request_status.sql
-- Thêm status mới vào request_status enum
ALTER TYPE request_status ADD VALUE 'manager_discussing';
ALTER TYPE request_status ADD VALUE 'contract_sent';
ALTER TYPE request_status ADD VALUE 'contract_signed';
ALTER TYPE request_status ADD VALUE 'artist_selection';
```

#### 6.2. Project Status Updates
```sql
-- Migration: 008_enhance_project_status.sql
-- Thêm status mới vào project_status enum
ALTER TYPE project_status ADD VALUE 'contract_pending';
ALTER TYPE project_status ADD VALUE 'artist_booking';
ALTER TYPE project_status ADD VALUE 'recording_session';
```

### 7. NOTIFICATION SYSTEM ENHANCEMENTS

#### 7.1. Notification Types Updates
```sql
-- Migration: 009_enhance_notification_types.sql
ALTER TYPE notification_type ADD VALUE 'contract_ready';
ALTER TYPE notification_type ADD VALUE 'contract_signed';
ALTER TYPE notification_type ADD VALUE 'artist_recommended';
ALTER TYPE notification_type ADD VALUE 'demo_available';
ALTER TYPE notification_type ADD VALUE 'ai_transcription_complete';
```

## MIGRATION EXECUTION ORDER

1. **001_add_arrangement_options.sql** - Thêm arrangement options
2. **002_enhance_artist_demos.sql** - Nâng cấp demo system
3. **003_add_contracts_system.sql** - Thêm contract management
4. **004_enhance_manager_role.sql** - Nâng cấp manager role
5. **005_add_ai_transcription_support.sql** - Thêm AI support
6. **006_add_notation_editor_support.sql** - Thêm notation editor
7. **007_enhance_request_status.sql** - Cập nhật request status
8. **008_enhance_project_status.sql** - Cập nhật project status
9. **009_enhance_notification_types.sql** - Cập nhật notification types

## BACKWARD COMPATIBILITY

- Tất cả các thay đổi đều backward compatible
- Default values được set cho các column mới
- Không có breaking changes cho existing data
- Existing API endpoints vẫn hoạt động bình thường

## TESTING STRATEGY

1. **Unit Tests**: Test từng migration script
2. **Integration Tests**: Test workflow end-to-end
3. **Data Migration Tests**: Verify existing data integrity
4. **Performance Tests**: Ensure không impact performance
5. **Rollback Tests**: Test rollback scenarios

## ROLLBACK PLAN

Mỗi migration có thể rollback bằng cách:
1. Drop columns/table được thêm
2. Drop types được tạo
3. Restore original enum values (nếu có)

## ESTIMATED TIMELINE

- **Database Migration**: 2-3 ngày
- **Testing**: 1-2 ngày  
- **Documentation Update**: 1 ngày
- **Total**: 4-6 ngày

## RISK ASSESSMENT

- **Low Risk**: Thêm columns mới với default values
- **Medium Risk**: Thêm enum values (cần test kỹ)
- **Low Risk**: Tạo bảng mới
- **Low Risk**: Thêm indexes mới

## POST-MIGRATION TASKS

1. Update API endpoints để support fields mới
2. Update frontend forms để handle workflow mới
3. Update documentation
4. Train users về workflow mới
5. Monitor system performance
