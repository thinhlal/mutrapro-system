package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.request.*;
import com.mutrapro.specialist_service.dto.response.*;
import com.mutrapro.specialist_service.entity.*;
import com.mutrapro.specialist_service.enums.RecordingCategory;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SkillType;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.*;
import com.mutrapro.specialist_service.mapper.*;
import com.mutrapro.specialist_service.repository.*;
import com.mutrapro.specialist_service.util.SecurityUtils;
import com.mutrapro.shared.service.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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
    private final S3Service s3Service;
    
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
     * Upload avatar cho specialist hiện tại
     */
    @Transactional
    public String uploadAvatar(MultipartFile file) {
        String currentUserId = getCurrentUserId();
        log.info("Uploading avatar for specialist with user ID: {}", currentUserId);
        
        // Validate file
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        
        // Validate file type (only images)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        
        // Validate file size (max 5MB)
        long maxSize = 5 * 1024 * 1024; // 5MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size must be less than 5MB");
        }
        
        try {
            // Upload to S3 public folder and get URL
            String avatarUrl = s3Service.uploadPublicFileAndReturnUrl(
                file.getInputStream(),
                file.getOriginalFilename(),
                contentType,
                file.getSize(),
                "avatars" // folder prefix: public/avatars/
            );
            
            // Update specialist avatarUrl
            Specialist specialist = specialistRepository.findByUserId(currentUserId)
                .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
            
            specialist.setAvatarUrl(avatarUrl);
            specialistRepository.save(specialist);
            
            log.info("Avatar uploaded successfully for specialist with user ID: {}, URL: {}", currentUserId, avatarUrl);
            return avatarUrl;
        } catch (Exception e) {
            log.error("Failed to upload avatar for specialist with user ID: {}", currentUserId, e);
            throw new RuntimeException("Failed to upload avatar: " + e.getMessage(), e);
        }
    }
    
    /**
     * Upload file demo cho specialist hiện tại
     * Upload lên S3 public folder và trả về public URL để customer có thể xem/nghe trực tiếp
     * URL được lưu vào demo.previewUrl
     */
    @Transactional
    public String uploadDemoFile(MultipartFile file) {
        String currentUserId = getCurrentUserId();
        log.info("Uploading demo file for specialist with user ID: {}", currentUserId);
        
        // Validate file
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        
        // Validate file type (audio files: mp3, wav, m4a, etc.)
        String contentType = file.getContentType();
        String fileName = file.getOriginalFilename();
        if (contentType == null || fileName == null) {
            throw new IllegalArgumentException("Invalid file");
        }
        
        // Allow audio files
        boolean isAudio = contentType.startsWith("audio/") || 
                         fileName.toLowerCase().endsWith(".mp3") ||
                         fileName.toLowerCase().endsWith(".wav") ||
                         fileName.toLowerCase().endsWith(".m4a") ||
                         fileName.toLowerCase().endsWith(".flac") ||
                         fileName.toLowerCase().endsWith(".aac");
        
        if (!isAudio) {
            throw new IllegalArgumentException("Only audio files are allowed (mp3, wav, m4a, flac, aac)");
        }
        
        // Validate file size (max 50MB)
        long maxSize = 50 * 1024 * 1024; // 50MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size must be less than 50MB");
        }
        
        try {
            // Upload to S3 public folder and get public URL
            // Customer có thể xem/nghe trực tiếp mà không cần authentication
            String publicUrl = s3Service.uploadPublicFileAndReturnUrl(
                file.getInputStream(),
                fileName,
                contentType,
                file.getSize(),
                "demos" // folder prefix: public/demos/
            );
            
            log.info("Demo file uploaded successfully for specialist with user ID: {}, public URL: {}", currentUserId, publicUrl);
            return publicUrl; // Return public URL để lưu vào demo.previewUrl
        } catch (Exception e) {
            log.error("Failed to upload demo file for specialist with user ID: {}", currentUserId, e);
            throw new RuntimeException("Failed to upload demo file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Lấy danh sách skills có sẵn phù hợp với specialization của specialist hiện tại
     * Nếu là RECORDING_ARTIST, chỉ lấy skills match với recordingRoles
     */
    public List<SkillResponse> getAllSkills() {
        String currentUserId = getCurrentUserId();
        log.info("Getting available skills for specialist with user ID: {}", currentUserId);
        
        // Lấy specialist hiện tại để biết specialization
        Specialist specialist = specialistRepository.findByUserId(currentUserId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(currentUserId));
        
        // Map SpecialistType sang SkillType (chúng có cùng giá trị)
        SkillType skillType = mapSpecialistTypeToSkillType(specialist.getSpecialization());
        
        List<Skill> skills;
        
        // Nếu là RECORDING_ARTIST, filter theo recordingRoles
        if (specialist.isRecordingArtist() && specialist.getRecordingRoles() != null && !specialist.getRecordingRoles().isEmpty()) {
            List<Skill> filteredSkills = new ArrayList<>();
            
            // Lấy skills cho từng recordingRole
            for (RecordingRole role : specialist.getRecordingRoles()) {
                RecordingCategory category = null;
                if (role == RecordingRole.VOCALIST) {
                    category = RecordingCategory.VOCAL;
                } else if (role == RecordingRole.INSTRUMENT_PLAYER) {
                    category = RecordingCategory.INSTRUMENT;
                }
                
                if (category != null) {
                    List<Skill> roleSkills = skillRepository.findBySkillTypeAndRecordingCategoryAndIsActiveTrue(skillType, category);
                    filteredSkills.addAll(roleSkills);
                }
            }
            
            // Remove duplicates (nếu có skill match cả 2 roles)
            skills = filteredSkills.stream()
                .distinct()
                .collect(Collectors.toList());
            
            log.info("Found {} skills for RECORDING_ARTIST with roles: {}", skills.size(), specialist.getRecordingRoles());
        } else {
            // Không phải RECORDING_ARTIST hoặc chưa có recordingRoles, lấy tất cả skills của specialization
            skills = skillRepository.findBySkillTypeAndIsActiveTrue(skillType);
            log.info("Found {} skills for specialization: {}", skills.size(), specialist.getSpecialization());
        }
        
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
        
        // Validate: recordingRole phải match với specialist's recordingRoles
        if (request.getRecordingRole() == null) {
            throw InvalidSpecialistRequestException.recordingRoleRequiredForDemo();
        }
        
        if (!specialist.getRecordingRoles().contains(request.getRecordingRole())) {
            throw InvalidSpecialistRequestException.demoRecordingRoleMismatch(
                request.getRecordingRole().name(),
                specialist.getRecordingRoles().toString()
            );
        }
        
        // Validate: demo genres phải nằm trong specialist genres
        if (request.getGenres() == null || request.getGenres().isEmpty()) {
            throw InvalidSpecialistRequestException.genresRequiredForDemo();
        }
        
        if (specialist.getGenres() == null || specialist.getGenres().isEmpty()) {
            throw InvalidSpecialistRequestException.specialistGenresRequiredForDemos();
        }
        
        // Kiểm tra tất cả demo genres phải có trong specialist genres
        for (String demoGenre : request.getGenres()) {
            if (!specialist.getGenres().contains(demoGenre)) {
                throw InvalidSpecialistRequestException.demoGenreMismatch(
                    demoGenre,
                    specialist.getGenres().toString()
                );
            }
        }
        
        ArtistDemo demo = artistDemoMapper.toArtistDemo(request);
        demo.setSpecialist(specialist);
        // isPublic được set từ request, nếu null thì default false
        if (request.getIsPublic() == null) {
            demo.setIsPublic(false);
        }
        
        // previewUrl đã được mapper tự động map từ request.previewUrl
        
        // Validate và set skill theo recordingRole
        if (request.getRecordingRole() == RecordingRole.INSTRUMENT_PLAYER) {
            // INSTRUMENT_PLAYER: skill là bắt buộc và phải là INSTRUMENT skill
            if (request.getSkillId() == null || request.getSkillId().isEmpty()) {
                throw InvalidSpecialistRequestException.skillRequiredForInstrumentDemo();
            }
            
            Skill skill = skillRepository.findById(request.getSkillId())
                .orElseThrow(() -> SkillNotFoundException.byId(request.getSkillId()));
            
            // Validate: skill phải là INSTRUMENT skill
            if (skill.getSkillType() != SkillType.RECORDING_ARTIST || 
                skill.getRecordingCategory() != RecordingCategory.INSTRUMENT) {
                throw InvalidSpecialistRequestException.instrumentSkillRequiredForInstrumentDemo(
                    skill.getSkillName()
                );
            }
            
            demo.setSkill(skill);
        } else if (request.getRecordingRole() == RecordingRole.VOCALIST) {
            // VOCALIST: skill là optional, nhưng nếu có thì phải là VOCAL skill
            if (request.getSkillId() != null && !request.getSkillId().isEmpty()) {
                Skill skill = skillRepository.findById(request.getSkillId())
                    .orElseThrow(() -> SkillNotFoundException.byId(request.getSkillId()));
                
                // Validate: skill phải là VOCAL skill
                if (skill.getSkillType() != SkillType.RECORDING_ARTIST || 
                    skill.getRecordingCategory() != RecordingCategory.VOCAL) {
                    throw InvalidSpecialistRequestException.vocalSkillRequiredForVocalDemo(
                        skill.getSkillName()
                    );
                }
                
                demo.setSkill(skill);
            } else {
                // Nếu không có skillId hoặc skillId là null/empty, set skill = null (OK cho vocalist)
                demo.setSkill(null);
            }
        }
        
        // Xử lý isMainDemo: nếu set true, set tất cả demo khác = false
        if (request.getIsMainDemo() != null && request.getIsMainDemo()) {
            // Set tất cả demo khác của specialist = false
            List<ArtistDemo> otherDemos = artistDemoRepository.findBySpecialist(specialist);
            for (ArtistDemo otherDemo : otherDemos) {
                otherDemo.setIsMainDemo(false);
            }
            if (!otherDemos.isEmpty()) {
                artistDemoRepository.saveAll(otherDemos);
            }
            demo.setIsMainDemo(true);
        } else {
            demo.setIsMainDemo(request.getIsMainDemo() != null ? request.getIsMainDemo() : false);
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
        
        // Validate: recordingRole (nếu có update)
        RecordingRole newRecordingRole = request.getRecordingRole() != null 
            ? request.getRecordingRole() 
            : demo.getRecordingRole();
        
        if (newRecordingRole == null) {
            throw InvalidSpecialistRequestException.recordingRoleRequiredForDemo();
        }
        
        if (!specialist.getRecordingRoles().contains(newRecordingRole)) {
            throw InvalidSpecialistRequestException.demoRecordingRoleMismatch(
                newRecordingRole.name(),
                specialist.getRecordingRoles().toString()
            );
        }
        
        // Validate: demo genres phải nằm trong specialist genres (nếu có update)
        if (request.getGenres() != null && !request.getGenres().isEmpty()) {
            if (specialist.getGenres() == null || specialist.getGenres().isEmpty()) {
                throw InvalidSpecialistRequestException.specialistGenresRequiredForDemos();
            }
            
            // Kiểm tra tất cả demo genres phải có trong specialist genres
            for (String demoGenre : request.getGenres()) {
                if (!specialist.getGenres().contains(demoGenre)) {
                    throw InvalidSpecialistRequestException.demoGenreMismatch(
                        demoGenre,
                        specialist.getGenres().toString()
                    );
                }
            }
        }
        
        artistDemoMapper.updateDemoFromRequest(demo, request);
        
        // Xử lý isMainDemo: nếu set true, set tất cả demo khác = false
        if (request.getIsMainDemo() != null && request.getIsMainDemo()) {
            List<ArtistDemo> otherDemos = artistDemoRepository.findBySpecialist(specialist);
            for (ArtistDemo otherDemo : otherDemos) {
                if (!otherDemo.getDemoId().equals(demo.getDemoId())) {
                    otherDemo.setIsMainDemo(false);
                }
            }
            artistDemoRepository.saveAll(otherDemos);
            demo.setIsMainDemo(true);
        } else if (request.getIsMainDemo() != null && !request.getIsMainDemo()) {
            demo.setIsMainDemo(false);
        }
        
        // Validate và update skill theo recordingRole
        if (newRecordingRole == RecordingRole.INSTRUMENT_PLAYER) {
            // INSTRUMENT_PLAYER: skill là bắt buộc và phải là INSTRUMENT skill
            String skillIdToUse = request.getSkillId() != null ? request.getSkillId() : 
                (demo.getSkill() != null ? demo.getSkill().getSkillId() : null);
            
            if (skillIdToUse == null || skillIdToUse.isEmpty()) {
                throw InvalidSpecialistRequestException.skillRequiredForInstrumentDemo();
            }
            
            Skill skill = skillRepository.findById(skillIdToUse)
                .orElseThrow(() -> SkillNotFoundException.byId(skillIdToUse));
            
            // Validate: skill phải là INSTRUMENT skill
            if (skill.getSkillType() != SkillType.RECORDING_ARTIST || 
                skill.getRecordingCategory() != RecordingCategory.INSTRUMENT) {
                throw InvalidSpecialistRequestException.instrumentSkillRequiredForInstrumentDemo(
                    skill.getSkillName()
                );
            }
            
            demo.setSkill(skill);
        } else if (newRecordingRole == RecordingRole.VOCALIST) {
            // VOCALIST: skill là optional, nhưng nếu có thì phải là VOCAL skill
            if (request.getSkillId() != null && !request.getSkillId().isEmpty()) {
                Skill skill = skillRepository.findById(request.getSkillId())
                    .orElseThrow(() -> SkillNotFoundException.byId(request.getSkillId()));
                
                // Validate: skill phải là VOCAL skill
                if (skill.getSkillType() != SkillType.RECORDING_ARTIST || 
                    skill.getRecordingCategory() != RecordingCategory.VOCAL) {
                    throw InvalidSpecialistRequestException.vocalSkillRequiredForVocalDemo(
                        skill.getSkillName()
                    );
                }
                
                demo.setSkill(skill);
            } else if (request.getSkillId() != null && request.getSkillId().isEmpty()) {
                // Nếu gửi empty string, set skill = null
                demo.setSkill(null);
            }
            // Nếu không có skillId trong request, giữ nguyên skill hiện tại
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

