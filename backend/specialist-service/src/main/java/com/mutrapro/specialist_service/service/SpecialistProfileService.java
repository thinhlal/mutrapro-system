package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.request.*;
import com.mutrapro.specialist_service.dto.response.*;
import com.mutrapro.specialist_service.entity.*;
import com.mutrapro.specialist_service.enums.RecordingCategory;
import com.mutrapro.specialist_service.enums.SkillType;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.*;
import com.mutrapro.specialist_service.mapper.*;
import com.mutrapro.specialist_service.repository.*;
import com.mutrapro.specialist_service.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service cho Specialist tự quản lý profile của mình
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpecialistProfileService {
    
    private final SpecialistRepository specialistRepository;
    private final SkillRepository skillRepository;
    private final SpecialistSkillRepository specialistSkillRepository;
    private final ArtistDemoRepository artistDemoRepository;
    private final SpecialistMapper specialistMapper;
    private final SkillMapper skillMapper;
    private final SpecialistSkillMapper specialistSkillMapper;
    private final ArtistDemoMapper artistDemoMapper;
    
    /**
     * Lấy profile của specialist hiện tại
     */
    public SpecialistResponse getMyProfile() {
        String currentUserId = getCurrentUserId();
        log.info("Getting profile for specialist with user ID: {}", currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        return specialistMapper.toSpecialistResponse(specialist);
    }
    
    /**
     * Cập nhật profile của specialist hiện tại
     */
    @Transactional
    public SpecialistResponse updateMyProfile(UpdateProfileRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Updating profile for specialist with user ID: {}", currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        specialistMapper.updateProfileFromRequest(specialist, request);
        
        Specialist saved = specialistRepository.save(specialist);
        log.info("Profile updated successfully for specialist with user ID: {}", currentUserId);
        
        return specialistMapper.toSpecialistResponse(saved);
    }
    
    /**
     * Lấy danh sách skills có sẵn phù hợp với specialization của specialist hiện tại
     */
    public List<SkillResponse> getAllSkills() {
        String currentUserId = getCurrentUserId();
        log.info("Getting available skills for specialist with user ID: {}", currentUserId);
        
        // Lấy specialist hiện tại để biết specialization
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Map SpecialistType sang SkillType (chúng có cùng giá trị)
        SkillType skillType = mapSpecialistTypeToSkillType(specialist.getSpecialization());
        
        // Lấy skills phù hợp với specialization của specialist
        List<Skill> skills = skillRepository.findBySkillTypeAndIsActiveTrue(skillType);
        log.info("Found {} skills for specialization: {}", skills.size(), specialist.getSpecialization());
        
        return skillMapper.toSkillResponseList(skills);
    }
    
    /**
     * Map SpecialistType sang SkillType
     * Vì cả 2 enum có cùng giá trị, nên chỉ cần convert
     */
    private SkillType mapSpecialistTypeToSkillType(SpecialistType specialistType) {
        if (specialistType == null) {
            throw InvalidSpecialistTypeException.cannotBeNull();
        }
        switch (specialistType) {
            case TRANSCRIPTION:
                return SkillType.TRANSCRIPTION;
            case ARRANGEMENT:
                return SkillType.ARRANGEMENT;
            case RECORDING_ARTIST:
                return SkillType.RECORDING_ARTIST;
            default:
                throw InvalidSpecialistTypeException.unknown(specialistType.name());
        }
    }
    
    /**
     * Lấy danh sách skills của specialist hiện tại
     */
    public List<SpecialistSkillResponse> getMySkills() {
        String currentUserId = getCurrentUserId();
        log.info("Getting skills for specialist with user ID: {}", currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        List<SpecialistSkill> skills = specialistSkillRepository.findBySpecialist(specialist);
        return specialistSkillMapper.toSpecialistSkillResponseList(skills);
    }
    
    /**
     * Thêm skill cho specialist hiện tại
     */
    @Transactional
    public SpecialistSkillResponse addSkill(AddSkillRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Adding skill {} for specialist with user ID: {}", request.getSkillId(), currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        Skill skill = skillRepository.findById(request.getSkillId())
            .orElseThrow(() -> SkillNotFoundException.byId(request.getSkillId()));
        
        // Kiểm tra xem skill đã tồn tại chưa
        if (specialistSkillRepository.existsBySpecialistAndSkill(specialist, skill)) {
            throw SkillAlreadyExistsException.create(specialist.getSpecialistId(), request.getSkillId());
        }
        
        // Validate: Nếu là RECORDING_ARTIST, skill phải match với recordingRoles
        if (specialist.isRecordingArtist()) {
            if (specialist.getRecordingRoles() == null || specialist.getRecordingRoles().isEmpty()) {
                throw InvalidSpecialistRequestException.recordingRolesRequiredForSkills();
            }
            
            // Kiểm tra skill có recording_category không (chỉ skills RECORDING_ARTIST mới có)
            if (skill.getSkillType() == SkillType.RECORDING_ARTIST && skill.getRecordingCategory() != null) {
                RecordingCategory skillCategory = skill.getRecordingCategory();
                boolean isAllowed = false;
                
                // Check xem skill category có match với recordingRoles không
                if (skillCategory == RecordingCategory.VOCAL && specialist.isVocalist()) {
                    isAllowed = true;
                } else if (skillCategory == RecordingCategory.INSTRUMENT && specialist.isInstrumentPlayer()) {
                    isAllowed = true;
                }
                
                if (!isAllowed) {
                    throw InvalidSpecialistRequestException.skillCategoryMismatch(
                        skill.getSkillName(),
                        skillCategory != null ? skillCategory.name() : "unknown",
                        specialist.getRecordingRoles() != null ? specialist.getRecordingRoles().toString() : "unknown"
                    );
                }
            }
        }
        
        SpecialistSkill specialistSkill = specialistSkillMapper.toSpecialistSkill(request);
        specialistSkill.setSpecialist(specialist);
        specialistSkill.setSkill(skill);
        
        SpecialistSkill saved = specialistSkillRepository.save(specialistSkill);
        log.info("Skill added successfully for specialist with user ID: {}", currentUserId);
        
        return specialistSkillMapper.toSpecialistSkillResponse(saved);
    }
    
    /**
     * Cập nhật skill của specialist hiện tại
     */
    @Transactional
    public SpecialistSkillResponse updateSkill(String specialistSkillId, UpdateSkillRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Updating skill {} for specialist with user ID: {}", specialistSkillId, currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        SpecialistSkill specialistSkill = specialistSkillRepository.findById(specialistSkillId)
            .orElseThrow(() -> SpecialistSkillNotFoundException.byId(specialistSkillId));
        
        // Kiểm tra xem skill thuộc về specialist hiện tại không
        if (!specialistSkill.getSpecialist().getSpecialistId().equals(specialist.getSpecialistId())) {
            throw AccessDeniedException.cannotUpdateSkill(specialistSkillId);
        }
        
        specialistSkillMapper.updateSkillFromRequest(specialistSkill, request);
        
        SpecialistSkill saved = specialistSkillRepository.save(specialistSkill);
        log.info("Skill updated successfully for specialist with user ID: {}", currentUserId);
        
        return specialistSkillMapper.toSpecialistSkillResponse(saved);
    }
    
    /**
     * Xóa skill của specialist hiện tại
     */
    @Transactional
    public void deleteSkill(String specialistSkillId) {
        String currentUserId = getCurrentUserId();
        log.info("Deleting skill {} for specialist with user ID: {}", specialistSkillId, currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        SpecialistSkill specialistSkill = specialistSkillRepository.findById(specialistSkillId)
            .orElseThrow(() -> SpecialistSkillNotFoundException.byId(specialistSkillId));
        
        // Kiểm tra xem skill thuộc về specialist hiện tại không
        if (!specialistSkill.getSpecialist().getSpecialistId().equals(specialist.getSpecialistId())) {
            throw AccessDeniedException.cannotDeleteSkill(specialistSkillId);
        }
        
        specialistSkillRepository.delete(specialistSkill);
        log.info("Skill deleted successfully for specialist with user ID: {}", currentUserId);
    }
    
    /**
     * Lấy danh sách demos của specialist hiện tại
     * Chỉ Recording Artist mới được phép sử dụng
     */
    public List<ArtistDemoResponse> getMyDemos() {
        String currentUserId = getCurrentUserId();
        log.info("Getting demos for specialist with user ID: {}", currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Chỉ Recording Artist mới được phép quản lý demos
        if (specialist.getSpecialization() != SpecialistType.RECORDING_ARTIST) {
            throw AccessDeniedException.cannotAccessDemos();
        }
        
        List<ArtistDemo> demos = artistDemoRepository.findBySpecialist(specialist);
        return artistDemoMapper.toArtistDemoResponseList(demos);
    }
    
    /**
     * Tạo demo mới cho specialist hiện tại
     * Chỉ Recording Artist mới được phép sử dụng
     */
    @Transactional
    public ArtistDemoResponse createDemo(CreateDemoRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Creating demo for specialist with user ID: {}", currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Chỉ Recording Artist mới được phép quản lý demos
        if (specialist.getSpecialization() != SpecialistType.RECORDING_ARTIST) {
            throw AccessDeniedException.cannotAccessDemos();
        }
        
        ArtistDemo demo = artistDemoMapper.toArtistDemo(request);
        demo.setSpecialist(specialist);
        demo.setIsPublic(false); // Default false, chỉ admin mới được bật
        
        // Set skill nếu có
        if (request.getSkillId() != null && !request.getSkillId().isEmpty()) {
            Skill skill = skillRepository.findById(request.getSkillId())
                .orElseThrow(() -> SkillNotFoundException.byId(request.getSkillId()));
            demo.setSkill(skill);
        }
        
        ArtistDemo saved = artistDemoRepository.save(demo);
        log.info("Demo created successfully for specialist with user ID: {}", currentUserId);
        
        return artistDemoMapper.toArtistDemoResponse(saved);
    }
    
    /**
     * Cập nhật demo của specialist hiện tại
     * Chỉ Recording Artist mới được phép sử dụng
     */
    @Transactional
    public ArtistDemoResponse updateDemo(String demoId, UpdateDemoRequest request) {
        String currentUserId = getCurrentUserId();
        log.info("Updating demo {} for specialist with user ID: {}", demoId, currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Chỉ Recording Artist mới được phép quản lý demos
        if (specialist.getSpecialization() != SpecialistType.RECORDING_ARTIST) {
            throw AccessDeniedException.cannotAccessDemos();
        }
        
        ArtistDemo demo = artistDemoRepository.findById(demoId)
            .orElseThrow(() -> DemoNotFoundException.byId(demoId));
        
        // Kiểm tra xem demo thuộc về specialist hiện tại không
        if (!demo.getSpecialist().getSpecialistId().equals(specialist.getSpecialistId())) {
            throw AccessDeniedException.cannotUpdateDemo(demoId);
        }
        
        artistDemoMapper.updateDemoFromRequest(demo, request);
        
        // Update skill nếu có
        if (request.getSkillId() != null && !request.getSkillId().isEmpty()) {
            Skill skill = skillRepository.findById(request.getSkillId())
                .orElseThrow(() -> SkillNotFoundException.byId(request.getSkillId()));
            demo.setSkill(skill);
        }
        
        ArtistDemo saved = artistDemoRepository.save(demo);
        log.info("Demo updated successfully for specialist with user ID: {}", currentUserId);
        
        return artistDemoMapper.toArtistDemoResponse(saved);
    }
    
    /**
     * Xóa demo của specialist hiện tại
     * Chỉ Recording Artist mới được phép sử dụng
     */
    @Transactional
    public void deleteDemo(String demoId) {
        String currentUserId = getCurrentUserId();
        log.info("Deleting demo {} for specialist with user ID: {}", demoId, currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Chỉ Recording Artist mới được phép quản lý demos
        if (specialist.getSpecialization() != SpecialistType.RECORDING_ARTIST) {
            throw AccessDeniedException.cannotAccessDemos();
        }
        
        ArtistDemo demo = artistDemoRepository.findById(demoId)
            .orElseThrow(() -> DemoNotFoundException.byId(demoId));
        
        // Kiểm tra xem demo thuộc về specialist hiện tại không
        if (!demo.getSpecialist().getSpecialistId().equals(specialist.getSpecialistId())) {
            throw AccessDeniedException.cannotDeleteDemo(demoId);
        }
        
        artistDemoRepository.delete(demo);
        log.info("Demo deleted successfully for specialist with user ID: {}", currentUserId);
    }
    
    /**
     * Lấy profile đầy đủ của specialist hiện tại (bao gồm skills và demos)
     */
    public SpecialistDetailResponse getMyProfileDetail() {
        String currentUserId = getCurrentUserId();
        log.info("Getting full profile for specialist with user ID: {}", currentUserId);
        
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        SpecialistResponse specialistResponse = specialistMapper.toSpecialistResponse(specialist);
        List<SpecialistSkillResponse> skills = getMySkills();
        
        // Chỉ lấy demos nếu là Recording Artist
        List<ArtistDemoResponse> demos = List.of();
        if (specialist.getSpecialization() == SpecialistType.RECORDING_ARTIST) {
            demos = getMyDemos();
        }
        
        return SpecialistDetailResponse.builder()
            .specialist(specialistResponse)
            .skills(skills)
            .demos(demos)
            .build();
    }
    
    /**
     * Get current user ID from JWT token
     */
    private String getCurrentUserId() {
        return SecurityUtils.getCurrentUserId();
    }
}

