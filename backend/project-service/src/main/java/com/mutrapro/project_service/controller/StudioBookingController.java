package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateStudioBookingFromRequestRequest;
import com.mutrapro.project_service.dto.request.CreateStudioBookingRequest;
import com.mutrapro.project_service.dto.response.AvailableArtistResponse;
import com.mutrapro.project_service.dto.response.AvailableTimeSlotResponse;
import com.mutrapro.project_service.dto.response.StudioBookingResponse;
import com.mutrapro.project_service.service.StudioBookingService;
import com.mutrapro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Slf4j
@RestController
@RequestMapping("/studio-bookings")
@RequiredArgsConstructor
@FieldDefaults(level = PRIVATE, makeFinal = true)
public class StudioBookingController {

    StudioBookingService studioBookingService;

    /**
     * Tạo booking cho recording milestone trong arrangement_with_recording contract
     * 
     * POST /studio-bookings/recording-milestone
     * 
     * Body: CreateStudioBookingRequest
     * 
     * Response: StudioBookingResponse
     */
    @PostMapping("/recording-milestone")
    public ResponseEntity<ApiResponse<StudioBookingResponse>> createBookingForRecordingMilestone(
            @Valid @RequestBody CreateStudioBookingRequest request) {
        
        log.info("Creating studio booking for recording milestone: milestoneId={}, sessionType={}, bookingDate={}",
            request.getMilestoneId(), 
            request.getSessionType() != null ? request.getSessionType() : "ARTIST_ASSISTED (default)",
            request.getBookingDate());
        
        StudioBookingResponse booking = studioBookingService.createBookingForRecordingMilestone(request);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.<StudioBookingResponse>builder()
                .message("Studio booking created successfully")
                .data(booking)
                .statusCode(HttpStatus.CREATED.value())
                .status("success")
                .build());
    }

    /**
     * Tạo studio booking từ service request (Luồng 3: Recording)
     * 
     * POST /studio-bookings/from-request/{requestId}
     * 
     * Flow:
     * 1. Customer tạo service request (request-service)
     * 2. Customer tạo booking từ request với participants và equipment (project-service)
     * 
     * Body: CreateStudioBookingFromRequestRequest
     * 
     * Response: StudioBookingResponse
     */
    @PostMapping("/from-request/{requestId}")
    public ResponseEntity<ApiResponse<StudioBookingResponse>> createBookingFromServiceRequest(
            @PathVariable("requestId") String requestId,
            @Valid @RequestBody CreateStudioBookingFromRequestRequest request) {
        
        log.info("Creating studio booking from service request: requestId={}, bookingDate={}, startTime={}, endTime={}",
            requestId, request.getBookingDate(), request.getStartTime(), request.getEndTime());
        
        StudioBookingResponse booking = studioBookingService.createBookingFromServiceRequest(requestId, request);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.<StudioBookingResponse>builder()
                .message("Studio booking created successfully from service request")
                .data(booking)
                .statusCode(HttpStatus.CREATED.value())
                .status("success")
                .build());
    }
    
    /**
     * Lấy available time slots của studio trong một ngày
     * GET /studio-bookings/available-slots?studioId={studioId}&date={date}
     * 
     * Flow: Manager chọn Studio + Date → hiển thị slot giờ trống
     */
    @GetMapping("/available-slots")
    public ResponseEntity<ApiResponse<List<AvailableTimeSlotResponse>>> getAvailableSlots(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        log.info("Getting available slots for active studio, date={}", date);
        
        List<AvailableTimeSlotResponse> slots = studioBookingService.getAvailableSlots(date);
        
        return ResponseEntity.ok(ApiResponse.<List<AvailableTimeSlotResponse>>builder()
            .message("Available slots retrieved successfully")
            .data(slots)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
    
    /**
     * Lấy available artists cho một slot cụ thể (Luồng 2: Booking từ Milestone)
     * GET /studio-bookings/available-artists?milestoneId={milestoneId}&date={date}&startTime={startTime}&endTime={endTime}&genres={genres}&preferredSpecialistIds={ids}
     * 
     * Flow: Sau khi chọn slot → hiển thị artists với preferred artists highlight
     * 
     * @param genres Optional - Danh sách genres từ frontend để filter vocalists (tránh gọi request-service)
     * @param preferredSpecialistIds Optional - Danh sách preferred specialist IDs từ frontend (tránh gọi request-service)
     */
    @GetMapping("/available-artists")
    public ResponseEntity<ApiResponse<List<AvailableArtistResponse>>> getAvailableArtists(
            @RequestParam("milestoneId") String milestoneId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("startTime") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam("endTime") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime,
            @RequestParam(value = "genres", required = false) List<String> genres,
            @RequestParam(value = "preferredSpecialistIds", required = false) List<String> preferredSpecialistIds) {
        
        log.info("Getting available artists: milestoneId={}, date={}, time={}-{}, genres={}, preferredSpecialistIds={}", 
            milestoneId, date, startTime, endTime, genres, preferredSpecialistIds);
        
        List<AvailableArtistResponse> artists = studioBookingService.getAvailableArtists(
            milestoneId, date, startTime, endTime, genres, preferredSpecialistIds);
        
        return ResponseEntity.ok(ApiResponse.<List<AvailableArtistResponse>>builder()
            .message("Available artists retrieved successfully")
            .data(artists)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
    
    /**
     * Lấy available artists/instrumentalists cho luồng 3 (Booking từ Service Request)
     * GET /studio-bookings/available-artists-for-request?date={date}&startTime={startTime}&endTime={endTime}&skillId={skillId}&roleType={roleType}&genres={genres}
     * 
     * Flow: Sau khi chọn slot → hiển thị artists/instrumentalists với:
     * - Available/Busy status cho slot đó
     * - Filter theo skillId nếu là INSTRUMENT
     * - Check conflict từ cả booking_artists và booking_participants
     * 
     * @param date Ngày booking
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @param skillId Optional - Skill ID để filter instrumentalists (chỉ dùng khi roleType = INSTRUMENT)
     * @param roleType Optional - VOCAL hoặc INSTRUMENT (mặc định lấy cả 2)
     * @param genres Optional - Genres để filter vocalists
     */
    @GetMapping("/available-artists-for-request")
    public ResponseEntity<ApiResponse<List<AvailableArtistResponse>>> getAvailableArtistsForRequest(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("startTime") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam("endTime") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime,
            @RequestParam(value = "skillId", required = false) String skillId,
            @RequestParam(value = "roleType", required = false) String roleType,
            @RequestParam(value = "genres", required = false) List<String> genres) {
        
        log.info("Getting available artists for request: date={}, time={}-{}, skillId={}, roleType={}, genres={}", 
            date, startTime, endTime, skillId, roleType, genres);
        
        List<AvailableArtistResponse> artists = studioBookingService.getAvailableArtistsForRequest(
            date, startTime, endTime, skillId, roleType, genres);
        
        return ResponseEntity.ok(ApiResponse.<List<AvailableArtistResponse>>builder()
            .message("Available artists for request retrieved successfully")
            .data(artists)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
    
    /**
     * Lấy danh sách studio bookings
     * GET /studio-bookings?contractId={contractId}&milestoneId={milestoneId}&status={status}
     * 
     * @param contractId Optional - Filter theo contract
     * @param milestoneId Optional - Filter theo milestone
     * @param status Optional - Filter theo status
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudioBookingResponse>>> getStudioBookings(
            @RequestParam(value = "contractId", required = false) String contractId,
            @RequestParam(value = "milestoneId", required = false) String milestoneId,
            @RequestParam(value = "status", required = false) String status) {
        
        log.info("Getting studio bookings: contractId={}, milestoneId={}, status={}", contractId, milestoneId, status);
        
        List<StudioBookingResponse> bookings = studioBookingService.getStudioBookings(contractId, milestoneId, status);
        
        return ResponseEntity.ok(ApiResponse.<List<StudioBookingResponse>>builder()
            .message("Studio bookings retrieved successfully")
            .data(bookings)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
    
    /**
     * Lấy chi tiết một studio booking
     * GET /studio-bookings/{bookingId}
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<StudioBookingResponse>> getStudioBookingById(
            @PathVariable("bookingId") String bookingId) {
        
        log.info("Getting studio booking: bookingId={}", bookingId);
        
        StudioBookingResponse booking = studioBookingService.getStudioBookingById(bookingId);
        
        return ResponseEntity.ok(ApiResponse.<StudioBookingResponse>builder()
            .message("Studio booking retrieved successfully")
            .data(booking)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
    
    /**
     * Lấy studio booking theo requestId
     * GET /studio-bookings/by-request/{requestId}
     */
    @GetMapping("/by-request/{requestId}")
    public ResponseEntity<ApiResponse<StudioBookingResponse>> getStudioBookingByRequestId(
            @PathVariable("requestId") String requestId) {
        
        log.info("Getting studio booking by requestId: {}", requestId);
        
        StudioBookingResponse booking = studioBookingService.getStudioBookingByRequestId(requestId);
        
        return ResponseEntity.ok(ApiResponse.<StudioBookingResponse>builder()
            .message("Studio booking retrieved successfully")
            .data(booking)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
    
    /**
     * Lấy danh sách studio bookings của recording artist hiện tại
     * GET /studio-bookings/my-bookings
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<List<StudioBookingResponse>>> getMyStudioBookings() {
        
        log.info("Getting studio bookings for current recording artist");
        
        List<StudioBookingResponse> bookings = studioBookingService.getMyStudioBookings();
        
        return ResponseEntity.ok(ApiResponse.<List<StudioBookingResponse>>builder()
            .message("Studio bookings retrieved successfully")
            .data(bookings)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
}

