import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const RequestCard = ({ request, onPress }) => {
  const getStatusConfig = (status, hasManager) => {
    const configs = {
      pending: {
        color: hasManager ? COLORS.warning : COLORS.textSecondary,
        icon: hasManager ? "time-outline" : "alert-circle-outline",
        text: hasManager ? "Assigned - pending" : "Waiting for manager",
        bgColor: hasManager ? COLORS.warning + "15" : COLORS.textSecondary + "15",
      },
      contract_sent: {
        color: COLORS.info,
        icon: "document-text-outline",
        text: "Contract sent",
        bgColor: COLORS.info + "15",
      },
      contract_approved: {
        color: COLORS.info,
        icon: "checkmark-circle-outline",
        text: "Contract approved",
        bgColor: COLORS.info + "15",
      },
      contract_signed: {
        color: COLORS.primary,
        icon: "document-text",
        text: "Contract signed",
        bgColor: COLORS.primary + "15",
      },
      in_progress: {
        color: COLORS.primary,
        icon: "sync-outline",
        text: "In progress",
        bgColor: COLORS.primary + "15",
      },
      completed: {
        color: COLORS.success,
        icon: "checkmark-circle",
        text: "Completed",
        bgColor: COLORS.success + "15",
      },
      cancelled: {
        color: COLORS.textSecondary,
        icon: "close-circle-outline",
        text: "Cancelled",
        bgColor: COLORS.textSecondary + "15",
      },
      rejected: {
        color: COLORS.error,
        icon: "close-circle",
        text: "Rejected",
        bgColor: COLORS.error + "15",
      },
    };
    return configs[status] || { 
      color: COLORS.textSecondary, 
      icon: "help-circle-outline", 
      text: status,
      bgColor: COLORS.textSecondary + "15",
    };
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      transcription: "Transcription",
      arrangement: "Arrangement",
      arrangement_with_recording: "Arrangement + Recording",
      recording: "Recording",
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const statusConfig = getStatusConfig(request.status, !!request.managerUserId);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {request.title}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {getRequestTypeLabel(request.requestType)}
            </Text>
          </View>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
        <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
        <Text style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Description */}
        {request.description && (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText} numberOfLines={2}>
              {request.description}
            </Text>
          </View>
        )}

        {/* Contact */}
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {request.contactName} • {request.contactPhone}
          </Text>
        </View>

        {/* Email */}
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {request.contactEmail}
          </Text>
        </View>

        {/* Optional Info */}
        {request.tempoPercentage && (
          <View style={styles.infoRow}>
            <Ionicons name="musical-note-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Tempo: {request.tempoPercentage}%</Text>
          </View>
        )}

        {request.externalGuestCount > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Guests: {request.externalGuestCount} {request.externalGuestCount === 1 ? "person" : "people"}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.dateInfo}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>{formatDate(request.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  typeBadge: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: SPACING.xs / 2,
  },
  content: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs / 2,
  },
});

export default RequestCard;

