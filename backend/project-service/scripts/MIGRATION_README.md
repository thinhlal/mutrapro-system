# 🔄 Migration Guide: booking_artists → booking_participants

## 📋 TỔNG QUAN

Script này migrate data từ bảng `booking_artists` (cũ) sang `booking_participants` (mới) sau khi đã update code backend và frontend.

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Backup database TRƯỚC KHI chạy migration**
2. **Chạy script này SAU KHI đã update code** (Phase 2 & 3 đã hoàn thành)
3. **Verify data sau khi migration**
4. **Không drop bảng `booking_artists` ngay** - giữ để backup ít nhất 1 tháng

## 📝 CÁCH CHẠY

### Option 1: Dùng psql command line

```bash
# Lấy thông tin database từ file .env
# PROJECT_DATASOURCE_URL=jdbc:postgresql://host:port/railway

# Parse connection string:
# host=your-host.proxy.rlwy.net
# port=your-port
# database=railway

# Chạy migration script
psql -h your-host.proxy.rlwy.net -p your-port -U postgres -d railway -f backend/project-service/scripts/migrate_booking_artists_to_participants.sql
```

### Option 2: Dùng pgAdmin hoặc DBeaver

1. Mở pgAdmin/DBeaver
2. Connect đến Project Service database
3. Mở file `migrate_booking_artists_to_participants.sql`
4. Chạy script

### Option 3: Dùng Railway CLI

```bash
# Nếu dùng Railway CLI
railway connect
psql < backend/project-service/scripts/migrate_booking_artists_to_participants.sql
```

## ✅ VERIFICATION

Sau khi chạy migration, verify bằng các query trong script:

1. **So sánh số lượng records:**
   - `booking_artists` (active) count = `booking_participants` (INTERNAL_ARTIST) count

2. **Check mapping role_type:**
   - VOCALIST → VOCAL
   - GUITARIST, PIANIST, etc. → INSTRUMENT

3. **Verify fee mapping:**
   - `artist_fee` = `participant_fee`

## 🔍 TROUBLESHOOTING

### Vấn đề: Migration không migrate hết records

**Nguyên nhân:** Có thể có duplicate hoặc constraint violation

**Giải pháp:**
```sql
-- Check records chưa được migrate
SELECT ba.* 
FROM booking_artists ba
INNER JOIN studio_bookings sb ON ba.booking_id = sb.booking_id
WHERE sb.status != 'CANCELLED'
  AND NOT EXISTS (
      SELECT 1 FROM booking_participants bp 
      WHERE bp.booking_id = ba.booking_id 
        AND bp.specialist_id = ba.specialist_id
        AND bp.performer_source = 'INTERNAL_ARTIST'
  );
```

### Vấn đề: Fee không khớp

**Nguyên nhân:** Có thể có NULL hoặc giá trị khác

**Giải pháp:**
```sql
-- Check và fix fee
UPDATE booking_participants bp
SET participant_fee = ba.artist_fee
FROM booking_artists ba
WHERE bp.booking_id = ba.booking_id
  AND bp.specialist_id = ba.specialist_id
  AND bp.performer_source = 'INTERNAL_ARTIST'
  AND bp.participant_fee != ba.artist_fee;
```

## 🗑️ CLEANUP (SAU 1 THÁNG)

Sau khi verify migration thành công và đã test đầy đủ (ít nhất 1 tháng):

```sql
-- Drop bảng cũ (UNCOMMENT khi sẵn sàng)
-- DROP TABLE booking_artists;
-- DROP TABLE booking_artists_backup;
```

## 📚 REFERENCES

- Migration plan: `docs/workflows/MIGRATION_BOOKING_ARTISTS_TO_PARTICIPANTS.md` (đã xóa, nhưng logic đã implement)
- Booking logic: `docs/workflows/BOOKING_LOGIC_FINAL.md`

