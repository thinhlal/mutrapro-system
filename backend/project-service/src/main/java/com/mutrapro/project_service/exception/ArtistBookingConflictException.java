package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.List;
import java.util.Map;

/**
 * Exception khi artist đã được book trong time slot đó
 */
public class ArtistBookingConflictException extends BusinessException {

    public ArtistBookingConflictException(String message) {
        super(ProjectServiceErrorCodes.ARTIST_BOOKING_CONFLICT, message);
    }

    public ArtistBookingConflictException(String message, List<String> conflictingSpecialistIds) {
        super(ProjectServiceErrorCodes.ARTIST_BOOKING_CONFLICT, message,
              Map.of("conflictingSpecialistIds", conflictingSpecialistIds != null ? conflictingSpecialistIds : List.of()));
    }

    public static ArtistBookingConflictException forArtists(List<String> conflictingSpecialistIds) {
        String specialists = conflictingSpecialistIds != null && !conflictingSpecialistIds.isEmpty()
            ? String.join(", ", conflictingSpecialistIds)
            : "unknown";
        return new ArtistBookingConflictException(
            String.format("One or more artists are already booked at the requested time slot: %s", specialists),
            conflictingSpecialistIds
        );
    }
    
    public static ArtistBookingConflictException artistNotAvailable(String specialistId) {
        return new ArtistBookingConflictException(
            String.format("Artist %s is not available for the requested time slot (no registered slots or missing slots)", 
                specialistId != null ? specialistId : "unknown"),
            List.of(specialistId != null ? specialistId : "unknown")
        );
    }
}

