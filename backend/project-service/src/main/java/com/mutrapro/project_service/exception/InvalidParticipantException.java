package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi participant configuration không hợp lệ
 */
public class InvalidParticipantException extends BusinessException {

    public InvalidParticipantException(String message) {
        super(ProjectServiceErrorCodes.INVALID_PARTICIPANT, message);
    }

    public static InvalidParticipantException vocalWithSkillId() {
        return new InvalidParticipantException("VOCAL participant should not have skill_id");
    }

    public static InvalidParticipantException vocalWithEquipmentId() {
        return new InvalidParticipantException("VOCAL participant should not have equipment_id");
    }

    public static InvalidParticipantException vocalWithInstrumentSource() {
        return new InvalidParticipantException("VOCAL participant should not have instrument_source");
    }

    public static InvalidParticipantException instrumentWithoutSkillId() {
        return new InvalidParticipantException("INSTRUMENT participant must have skill_id");
    }

    public static InvalidParticipantException internalArtistWithoutSpecialistId() {
        return new InvalidParticipantException("INTERNAL_ARTIST participant must have specialistId");
    }

    public static InvalidParticipantException studioSideWithoutEquipmentId() {
        return new InvalidParticipantException("INSTRUMENT participant with STUDIO_SIDE must have equipmentId");
    }

    public static InvalidParticipantException equipmentNotMatchingSkill(String equipmentId, String skillId) {
        return new InvalidParticipantException(
            String.format("Equipment %s does not match skill_id %s. Equipment must be mapped to this skill in skill_equipment_mapping.", 
                equipmentId, skillId));
    }

    public static InvalidParticipantException customInstrumentWithoutSkillName() {
        return new InvalidParticipantException("Custom instrument must have skillName when skillId is null");
    }

    public static InvalidParticipantException customInstrumentCannotRentFromStudio() {
        return new InvalidParticipantException("Custom instruments cannot rent equipment from studio. They must be brought by customer (CUSTOMER_SIDE)");
    }
}

