import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

/**
 * Contract Preview Component - Document-style view
 * Displays contract content in a formatted, document-like layout
 */
const ContractPreview = ({ contract, requestDetails, pricingBreakdown }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return dayjs(dateString).format("DD/MM/YYYY HH:mm");
  };

  const formatCurrency = (amount, currency = "VND") => {
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const getContractTitle = (contractType) => {
    const titleMap = {
      transcription: "Transcription Service Agreement",
      arrangement: "Arrangement Service Agreement",
      arrangement_with_recording: "Arrangement with Recording Service Agreement",
      recording: "Recording Service Agreement",
      bundle: "Bundle Service Agreement",
    };
    return titleMap[contractType] || "Service Agreement";
  };

  const getStatusConfig = (status) => {
    const configs = {
      draft: { color: COLORS.textSecondary, text: "DRAFT" },
      sent: { color: COLORS.info, text: "SENT TO CUSTOMER" },
      approved: { color: COLORS.info, text: "APPROVED" },
      signed: { color: COLORS.warning, text: "SIGNED" },
      active_pending_assignment: {
        color: COLORS.warning,
        text: "DEPOSIT PAID - PENDING ASSIGNMENT",
      },
      active: { color: COLORS.success, text: "ACTIVE" },
      rejected_by_customer: { color: COLORS.error, text: "REJECTED" },
      need_revision: { color: COLORS.warning, text: "NEEDS REVISION" },
      canceled_by_customer: { color: COLORS.error, text: "CANCELLED" },
      canceled_by_manager: { color: COLORS.error, text: "CANCELLED" },
      expired: { color: COLORS.textSecondary, text: "EXPIRED" },
    };
    return configs[status?.toLowerCase()] || { color: COLORS.textSecondary, text: status };
  };

  const statusConfig = getStatusConfig(contract?.status);
  const isSigned = ["signed", "active", "active_pending_assignment"].includes(
    contract?.status?.toLowerCase()
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Watermark for non-signed contracts */}
      {!isSigned && (
        <View style={styles.watermarkContainer}>
          <Text style={styles.watermark}>{statusConfig.text}</Text>
        </View>
      )}

      {/* Official Seal for signed contracts */}
      {isSigned && (
        <View style={styles.sealContainer}>
          <View style={styles.seal}>
            <View style={styles.sealCircle} />
            <View style={styles.sealInner}>
              <Text style={styles.sealText}>MuTraPro</Text>
              <Text style={styles.sealText}>Official</Text>
              <Text style={styles.sealDate}>
                {contract?.signedAt
                  ? dayjs(contract.signedAt).format("YYYY-MM-DD")
                  : dayjs().format("YYYY-MM-DD")}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.document}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>MuTraPro</Text>
          <Text style={styles.tagline}>Contract Document</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{getContractTitle(contract?.contractType)}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Contract Number:</Text>
          <Text style={styles.metaValue}>{contract?.contractNumber || "N/A"}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Status:</Text>
          <Text style={[styles.metaValue, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Parties */}
        <Text style={styles.sectionTitle}>Parties</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Party A (Provider): </Text>
          MuTraPro Studio Co., Ltd
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Party B (Customer): </Text>
          {contract?.nameSnapshot || "N/A"}
          {contract?.phoneSnapshot && ` | Phone: ${contract.phoneSnapshot}`}
          {contract?.emailSnapshot && `\nEmail: ${contract.emailSnapshot}`}
        </Text>

        <View style={styles.divider} />

        {/* Request Summary */}
        {requestDetails && (requestDetails.title || requestDetails.description) && (
          <>
            <Text style={styles.sectionTitle}>Request Summary</Text>
            {requestDetails.title && (
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Title: </Text>
                {requestDetails.title}
              </Text>
            )}
            {requestDetails.description && (
              <Text style={styles.paragraph}>{requestDetails.description}</Text>
            )}
            <View style={styles.divider} />
          </>
        )}

        {/* Pricing & Payment */}
        <Text style={styles.sectionTitle}>Pricing & Payment</Text>

        {/* Pricing Table */}
        {(pricingBreakdown?.transcriptionDetails || pricingBreakdown?.instruments?.length > 0) && (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellLeft, styles.tableHeader]}>
                <Text style={styles.tableHeaderText}>Item</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellRight, styles.tableHeader]}>
                <Text style={styles.tableHeaderText}>
                  Amount ({contract?.currency || "VND"})
                </Text>
              </View>
            </View>

            {/* Transcription Details */}
            {pricingBreakdown?.transcriptionDetails?.breakdown?.map((item, idx) => (
              <View key={`trans-${idx}`} style={styles.tableRow}>
                <View style={[styles.tableCell, styles.tableCellLeft]}>
                  <Text style={styles.tableCellText}>{item.label}</Text>
                  {item.description && (
                    <Text style={styles.tableCellDescription}>({item.description})</Text>
                  )}
                </View>
                <View style={[styles.tableCell, styles.tableCellRight]}>
                  <Text style={styles.tableCellTextBold}>
                    {item.amount?.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}

            {/* Instruments */}
            {pricingBreakdown?.instruments?.length > 0 && (
              <>
                <View style={[styles.tableRow, styles.tableSubheaderRow]}>
                  <View style={[styles.tableCell, styles.tableCellLeft]}>
                    <Text style={styles.tableCellTextBold}>Instruments Surcharge:</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellRight]} />
                </View>
                {pricingBreakdown.instruments.map((instr, idx) => (
                  <View key={`inst-${idx}`} style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.tableCellLeft, { paddingLeft: 24 }]}>
                      <Text style={styles.tableCellText}>• {instr.instrumentName}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellRight]}>
                      <Text style={styles.tableCellTextBold}>
                        {instr.basePrice?.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={[styles.tableRow, styles.tableSubheaderRow]}>
                  <View style={[styles.tableCell, styles.tableCellLeft]}>
                    <Text style={styles.tableCellTextBold}>Instruments Total:</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellRight]}>
                    <Text style={styles.tableCellTextBold}>
                      {pricingBreakdown.instruments
                        .reduce((sum, instr) => sum + (instr.basePrice || 0), 0)
                        .toLocaleString()}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Total Price */}
        <View style={[styles.table, { marginTop: SPACING.md }]}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCell, styles.tableCellLeft]}>
              <Text style={styles.tableHeaderText}>Total Price</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellRight]}>
              <Text style={styles.tableHeaderText}>
                {formatCurrency(contract?.totalPrice, contract?.currency)}
              </Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.tableCellLeft, styles.tableHeader]}>
              <Text style={styles.tableHeaderText}>
                Deposit (
                {contract?.installments?.find((i) => i.type === "DEPOSIT")?.percent ||
                  contract?.depositPercent ||
                  0}
                %)
              </Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellRight]}>
              <Text style={styles.tableCellTextBold}>
                {formatCurrency(
                  contract?.installments?.find((i) => i.type === "DEPOSIT")?.amount ||
                    (contract?.totalPrice * (contract?.depositPercent || 0)) / 100,
                  contract?.currency
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Milestones */}
        {contract?.milestones && contract.milestones.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }, styles.tableHeader]}>
                  <Text style={styles.tableHeaderText}>Milestone</Text>
                </View>
                <View style={[styles.tableCell, { flex: 2 }, styles.tableHeader]}>
                  <Text style={styles.tableHeaderText}>Description</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1 }, styles.tableHeader]}>
                  <Text style={styles.tableHeaderText}>Payment %</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1 }, styles.tableHeader]}>
                  <Text style={styles.tableHeaderText}>SLA Days</Text>
                </View>
              </View>

              {/* Milestone Rows */}
              {contract.milestones
                .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                .map((milestone, idx) => {
                  const installment = contract?.installments?.find(
                    (inst) => inst.milestoneId === milestone.milestoneId
                  );
                  return (
                    <View key={idx} style={styles.tableRow}>
                      <View style={[styles.tableCell, { flex: 2 }]}>
                        <Text style={styles.tableCellTextBold}>
                          {milestone.name || `Milestone ${idx + 1}`}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 2 }]}>
                        <Text style={styles.tableCellText}>
                          {milestone.description || "-"}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableCellText}>
                          {installment?.percent || milestone.paymentPercent || "N/A"}
                          {(installment?.percent || milestone.paymentPercent) ? "%" : ""}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableCellText}>
                          {milestone.milestoneSlaDays || milestone.slaDays || "-"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Timeline & SLA */}
        <Text style={styles.sectionTitle}>Timeline & SLA</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>SLA Days: </Text>
          {contract?.slaDays || 0} days
        </Text>
        {contract?.expectedStartDate && (
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Expected Start: </Text>
            {formatDate(contract.expectedStartDate)}
          </Text>
        )}
        {(() => {
          const lastMilestone = contract?.milestones?.[contract.milestones.length - 1];
          if (lastMilestone?.plannedDueDate) {
            return (
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Due Date: </Text>
                {formatDate(lastMilestone.plannedDueDate)}
              </Text>
            );
          }
          return null;
        })()}

        <View style={styles.divider} />

        {/* Revision Policy */}
        <Text style={styles.sectionTitle}>Revision Policy</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Free Revisions Included: </Text>
          {contract?.freeRevisionsIncluded || 0}
          {contract?.revisionDeadlineDays && (
            <>
              {"\n"}
              <Text style={styles.bold}>Revision Deadline: </Text>
              {contract.revisionDeadlineDays} days after delivery
            </>
          )}
          {contract?.additionalRevisionFeeVnd && (
            <>
              {"\n"}
              <Text style={styles.bold}>Additional Revision Fee: </Text>
              {formatCurrency(contract.additionalRevisionFeeVnd, "VND")}
            </>
          )}
        </Text>

        <View style={styles.divider} />

        {/* Terms & Conditions */}
        {contract?.termsAndConditions && (
          <>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.paragraph}>{contract.termsAndConditions}</Text>
            <View style={styles.divider} />
          </>
        )}

        {/* Special Clauses */}
        {contract?.specialClauses && (
          <>
            <Text style={styles.sectionTitle}>Special Clauses</Text>
            <Text style={styles.paragraph}>{contract.specialClauses}</Text>
            <View style={styles.divider} />
          </>
        )}

        {/* Signatures */}
        <Text style={styles.sectionTitle}>Signatures</Text>
        <View style={styles.signaturesRow}>
          {/* Party A */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Party A Representative</Text>
            {isSigned ? (
              <>
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>
                    [Digital Signature]
                  </Text>
                </View>
                <Text style={styles.signatureName}>CEO - MuTraPro Studio</Text>
                <Text style={styles.signatureDate}>
                  Signed: {formatDate(contract?.signedAt || contract?.sentAt)}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureName}>Name, Title</Text>
              </>
            )}
          </View>

          {/* Party B */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Party B Representative</Text>
            {isSigned ? (
              <>
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>
                    [Digital Signature]
                  </Text>
                </View>
                <Text style={styles.signatureName}>
                  {contract?.nameSnapshot || "Customer"}
                </Text>
                <Text style={styles.signatureDate}>
                  Signed:{" "}
                  {formatDate(
                    contract?.bSignedAt || contract?.signedAt || "Pending"
                  )}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureName}>Name, Title</Text>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated: {dayjs().format("DD/MM/YYYY HH:mm")}
          </Text>
          <Text style={styles.footerText}>
            Contract ID: {contract?.contractNumber || contract?.contractId}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  watermarkContainer: {
    position: "absolute",
    top: 200,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 0,
    opacity: 0.1,
  },
  watermark: {
    fontSize: 60,
    fontWeight: "900",
    color: COLORS.error,
    transform: [{ rotate: "-25deg" }],
  },
  sealContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  seal: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  sealCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.error,
    borderStyle: "dashed",
  },
  sealInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 40,
    padding: SPACING.sm,
  },
  sealText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.error,
    textTransform: "uppercase",
  },
  sealDate: {
    fontSize: FONT_SIZES.xs - 2,
    color: COLORS.error,
    marginTop: 2,
  },
  document: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.text,
  },
  logo: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "700",
    color: COLORS.primary,
  },
  tagline: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  metaLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  metaValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  paragraph: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  bold: {
    fontWeight: "700",
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text,
  },
  tableHeader: {
    backgroundColor: COLORS.gray[200],
  },
  tableSubheaderRow: {
    backgroundColor: COLORS.gray[100],
  },
  tableCell: {
    padding: SPACING.sm,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.text,
  },
  tableCellLeft: {
    flex: 2,
  },
  tableCellRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  tableHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  tableCellText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  tableCellTextBold: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  tableCellDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  signatureBox: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  signatureLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text,
    height: 50,
    marginBottom: SPACING.sm,
  },
  signaturePlaceholder: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  signaturePlaceholderText: {
    fontSize: FONT_SIZES.xs,
    fontStyle: "italic",
    color: COLORS.textSecondary,
  },
  signatureName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  signatureDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  footer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
});

export default ContractPreview;

