# 🎤 Vocal vs Instrument - Skill Selection Logic

## ✅ GIẢI PHÁP: VOCAL KHÔNG CẦN skill_id, INSTRUMENT BẮT BUỘC skill_id

### 1. VOCAL - KHÔNG cần skill_id

**VOCAL + CUSTOMER_SELF:**
- ✅ **KHÔNG cần skill_id**
- Lý do: Customer tự hát → chỉ cần biết là "hát", không cần phân biệt skill cụ thể

**VOCAL + INTERNAL_ARTIST:**
- ✅ **KHÔNG cần skill_id**
- Lý do: `specialist_id` đã đủ để biết vocalist (specialist có skills trong profile của họ)
- Nếu cần biết skill cụ thể của vocalist → query từ specialist-service

### 2. INSTRUMENT - Bắt buộc chọn skill_id

**INSTRUMENT (dù CUSTOMER_SELF hay INTERNAL_ARTIST):**
- ✅ **BẮT BUỘC user phải chọn skill_id**
- Phải chọn: "Guitar Performance", "Piano Performance", "Drums Performance", etc.
- Lý do: Phải biết rõ là instrument gì để:
  - Suggest equipment phù hợp (qua skill_equipment_mapping)
  - Tính phí equipment rental
  - Track availability của instrumentalist

---

## 📋 Implementation

### Backend Logic:

```java
public class BookingParticipant {
    private SessionRoleType roleType; // VOCAL | INSTRUMENT
    private PerformerSource performerSource; // CUSTOMER_SELF | INTERNAL_ARTIST
    private String skillId; // NULLABLE - chỉ cần cho INSTRUMENT
}

// Validation
public void validateParticipant(BookingParticipant participant) {
    if (participant.getRoleType() == SessionRoleType.VOCAL) {
        // VOCAL: KHÔNG được có skill_id
        if (participant.getSkillId() != null) {
            throw new ValidationException("VOCAL participants cannot have skill_id");
        }
    }
    
    if (participant.getRoleType() == SessionRoleType.INSTRUMENT) {
        // INSTRUMENT: BẮT BUỘC phải có skill_id
        if (participant.getSkillId() == null) {
            throw new ValidationException("INSTRUMENT participants must have skill_id");
        }
        
        // Ensure skill is INSTRUMENT type
        Skill skill = skillService.findById(participant.getSkillId());
        if (skill.getRecordingCategory() != RecordingCategory.INSTRUMENT) {
            throw new ValidationException("Skill must be an INSTRUMENT skill");
        }
    }
}
```

### Frontend Logic:

**Step 2: Vocal Setup**
```javascript
// Customer tự hát
if (vocalChoice === 'CUSTOMER_SELF') {
  // KHÔNG hiển thị skill selector
  participant = {
    roleType: 'VOCAL',
    performerSource: 'CUSTOMER_SELF',
    skillId: null // VOCAL không cần skill_id
  };
}

// Thuê vocalist
if (vocalChoice === 'INTERNAL_ARTIST') {
  // 1. Chọn vocalist từ list
  // 2. KHÔNG cần chọn skill_id (specialist_id đã đủ)
  participant = {
    roleType: 'VOCAL',
    performerSource: 'INTERNAL_ARTIST',
    specialistId: selectedVocalistId,
    skillId: null // VOCAL không cần skill_id
  };
}
```

**Step 3: Instrument Setup**
```javascript
// BẮT BUỘC phải chọn instrument
if (hasInstruments) {
  instruments.forEach(instrument => {
    // BẮT BUỘC chọn skill
    const selectedSkill = selectSkill({
      roleType: 'INSTRUMENT',
      category: 'INSTRUMENT',
      options: ['Guitar Performance', 'Piano Performance', 'Drums Performance', ...]
    });
    
    participant = {
      roleType: 'INSTRUMENT',
      performerSource: selectedPerformer, // CUSTOMER_SELF or INTERNAL_ARTIST
      skillId: selectedSkill.id, // REQUIRED
      instrumentSource: selectedSource,
      equipmentId: selectedEquipment?.id
    };
  });
}
```

---

## 🎯 Tóm tắt

| Role | Performer Source | Skill Selection | Logic |
|------|------------------|-----------------|-------|
| **VOCAL** | CUSTOMER_SELF | ❌ Không cần skill_id | Chỉ cần biết là "hát" |
| **VOCAL** | INTERNAL_ARTIST | ❌ Không cần skill_id | specialist_id đã đủ |
| **INSTRUMENT** | CUSTOMER_SELF | ✅ Required | User phải chọn skill_id |
| **INSTRUMENT** | INTERNAL_ARTIST | ✅ Required | User phải chọn skill_id |

---

## ✅ Ưu điểm

1. **UX đơn giản**: VOCAL không cần chọn skill_id (chỉ cần biết là "hát")
2. **Đơn giản hóa**: Không cần track skill cho vocal (specialist_id đã đủ thông tin)
3. **Required khi cần**: Instrument luôn phải chọn skill_id (vì bắt buộc phải biết instrument gì và filter equipment)
4. **Backend safe**: Validation đảm bảo skill_id chỉ có khi cần (INSTRUMENT)

