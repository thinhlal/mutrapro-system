import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";
import { formatPrice } from "../services/pricingMatrixService";
import { getGenreLabel, getPurposeLabel } from "../constants/musicOptionsConstants";

const RequestCard = ({ request, onPress, booking }) => {
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
        text: "Contract approved - awaiting signature",
        bgColor: COLORS.info + "15",
      },
      contract_signed: {
        color: COLORS.primary,
        icon: "document-text",
        text: "Contract signed",
        bgColor: COLORS.primary + "15",
      },
      awaiting_assignment: {
        color: COLORS.warning,
        icon: "time-outline",
        text: "Awaiting assignment",
        bgColor: COLORS.warning + "15",
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

  const formatBookingDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {getRequestTypeLabel(request.requestType)}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {request.title}
        </Text>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
        <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
        <Text style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </View>

      {/* Content - Table Layout */}
      <View style={styles.content}>
        <View style={styles.tableContainer}>
          {/* Description - Always show */}
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Description:</Text>
            <Text style={styles.tableValue} numberOfLines={2}>
              {request.description || "No description"}
            </Text>
          </View>

          {/* Contact Name - Always show */}
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Name:</Text>
            <Text style={styles.tableValue} numberOfLines={1}>
              {request.contactName}
            </Text>
          </View>

          {/* Contact Phone - Always show */}
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Phone:</Text>
            <Text style={styles.tableValue} numberOfLines={1}>
              {request.contactPhone}
            </Text>
          </View>

          {/* Email - Always show */}
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Email:</Text>
            <Text style={styles.tableValue} numberOfLines={1}>
              {request.contactEmail}
            </Text>
          </View>

          {/* Tempo - Only for transcription */}
          {request.tempoPercentage && request.requestType === "transcription" && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Tempo:</Text>
              <Text style={styles.tableValue}>{request.tempoPercentage}%</Text>
            </View>
          )}

          {/* Guests - If > 0 */}
          {request.externalGuestCount > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Guests:</Text>
              <Text style={styles.tableValue}>
                {request.externalGuestCount} {request.externalGuestCount === 1 ? "person" : "people"}
              </Text>
            </View>
          )}

          {/* Genres - Only for arrangement/arrangement_with_recording */}
          {(request.requestType === "arrangement" || request.requestType === "arrangement_with_recording") &&
            request.genres &&
            Array.isArray(request.genres) &&
            request.genres.length > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Genres:</Text>
                <View style={styles.genresContainer}>
                  {request.genres.map((genre, idx) => (
                    <View key={idx} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{getGenreLabel(genre)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Purpose - Only for arrangement/arrangement_with_recording */}
          {(request.requestType === "arrangement" || request.requestType === "arrangement_with_recording") &&
            request.purpose && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Purpose:</Text>
                <Text style={styles.tableValue}>{getPurposeLabel(request.purpose)}</Text>
              </View>
            )}

          {/* Total Price - Only for non-recording requests */}
          {request.requestType !== "recording" && request.totalPrice && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Total Price:</Text>
              <Text style={[styles.tableValue, styles.priceValue]}>
                {formatPrice(request.totalPrice, request.currency || "VND")}
              </Text>
            </View>
          )}

          {/* Booking info for recording requests */}
          {request.requestType === "recording" && booking && (
            <>
              {booking.bookingDate && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Date:</Text>
                  <Text style={styles.tableValue}>
                    {formatBookingDate(booking.bookingDate)}
                  </Text>
                </View>
              )}
              {booking.startTime && booking.endTime && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Time Slot:</Text>
                  <Text style={styles.tableValue}>
                    {booking.startTime} - {booking.endTime}
                  </Text>
                </View>
              )}
              {booking.totalCost !== undefined && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Total Cost:</Text>
                  <Text style={[styles.tableValue, styles.priceValue]}>
                    {booking.totalCost.toLocaleString("vi-VN")} VND
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.dateText}>Created: {formatDate(request.createdAt)}</Text>
        <Text style={styles.dateText}>Updated: {formatDate(request.updatedAt)}</Text>
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
  typeBadge: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
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
  tableContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 40,
    alignItems: "flex-start",
  },
  tableLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    width: 100,
    minWidth: 100,
  },
  tableValue: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  priceValue: {
    fontWeight: "600",
    color: COLORS.success,
    fontSize: FONT_SIZES.base,
  },
  genresContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  genreTag: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  genreTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  footer: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xs / 2,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default RequestCard;

