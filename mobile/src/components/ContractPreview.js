import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";
import { getGenreLabel, getPurposeLabel } from "../constants/musicOptionsConstants";
import { getSignatureImage } from "../services/contractService";

/**
 * Contract Preview Component - Document-style view
 * Displays contract content in a formatted, document-like layout
 */
const ContractPreview = ({ contract, requestDetails, pricingBreakdown, bookingData }) => {
  const [exporting, setExporting] = useState(false);
  const [partyBSignatureUrl, setPartyBSignatureUrl] = useState(null); // Base64 data URL from backend

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

  // Format duration from minutes to mm:ss format
  const formatDurationMMSS = (minutes) => {
    if (!minutes) return "00:00";
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Format description duration - replace "X.XX minutes" with mm:ss format
  const formatDescriptionDuration = (description) => {
    if (!description) return description;
    const pattern = /(\d+\.?\d*)\s*(phút|minutes?)/gi;
    return description.replace(pattern, (match, minutes) => {
      const minutesNum = parseFloat(minutes);
      if (!isNaN(minutesNum) && minutesNum > 0) {
        return formatDurationMMSS(minutesNum);
      }
      return match;
    });
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
  // Check if contract is signed or active (same logic as frontend)
  const currentStatus = contract?.status?.toLowerCase() || "";
  const isSigned = currentStatus === "signed";
  const isActive = currentStatus === "active" || currentStatus === "active_pending_assignment";
  const isCompleted = currentStatus === "completed";
  const isCanceled = currentStatus === "canceled_by_customer" || currentStatus === "canceled_by_manager";
  const isExpired = currentStatus === "expired";
  
  // Show seal when contract is signed/active and not canceled/expired/completed (same as frontend canPayMilestones)
  const shouldShowSeal = (isSigned || isActive) && !isCanceled && !isExpired && !isCompleted;
  
  // Show Party A signature when contract is signed/active/completed (same as frontend shouldShowPartyASignature)
  const shouldShowPartyASignature = isSigned || isActive || isCompleted;
  
  // Show Party B signature when customer has signed or contract is signed/active/completed (same as frontend hasSigned)
  const shouldShowPartyBSignature = contract?.customerSignedAt || isSigned || isActive || isCompleted;

  // Fetch signature images when contract is signed/active/completed
  useEffect(() => {
    // Party A signature is loaded from local asset (always available if shouldShowPartyASignature)
    // We don't need to set URL, we'll use require() directly in render

    // Load Party B signature from backend API
    const fetchPartyBSignature = async () => {
      // Fetch signature if contract is signed/active/completed or has customerSignedAt
      if (!contract?.contractId || !shouldShowPartyBSignature) {
        setPartyBSignatureUrl(null);
        return;
      }

      try {
        const signatureResponse = await getSignatureImage(contract.contractId);
        if (signatureResponse?.data) {
          // signatureResponse.data is base64 data URL from backend
          setPartyBSignatureUrl(signatureResponse.data);
        }
      } catch (error) {
        console.error('Error loading Party B signature image:', error);
        setPartyBSignatureUrl(null);
        // Don't show error message - just don't display signature
      }
    };

    fetchPartyBSignature();
  }, [contract?.contractId, shouldShowPartyBSignature]);

  const generateContractHtml = (partyBSignatureDataUrl = null) => {
    const contractNumber = contract?.contractNumber || contract?.contractId || "N/A";
    const contractType = contract?.contractType || "N/A";
    const statusText = statusConfig.text;
    const totalPrice = contract?.totalPrice || 0;
    const currency = contract?.currency || "VND";
    
    // Calculate signature display logic for HTML export (same as component logic)
    const htmlCurrentStatus = contract?.status?.toLowerCase() || "";
    const htmlIsSigned = htmlCurrentStatus === "signed";
    const htmlIsActive = htmlCurrentStatus === "active" || htmlCurrentStatus === "active_pending_assignment";
    const htmlIsCompleted = htmlCurrentStatus === "completed";
    const htmlIsCanceled = htmlCurrentStatus === "canceled_by_customer" || htmlCurrentStatus === "canceled_by_manager";
    const htmlIsExpired = htmlCurrentStatus === "expired";
    const htmlShouldShowSeal = (htmlIsSigned || htmlIsActive) && !htmlIsCanceled && !htmlIsExpired && !htmlIsCompleted;
    const htmlShouldShowPartyASignature = htmlIsSigned || htmlIsActive || htmlIsCompleted;
    const htmlShouldShowPartyBSignature = contract?.customerSignedAt || htmlIsSigned || htmlIsActive || htmlIsCompleted;
    
    // Use provided signature URL or fallback to state
    const htmlPartyBSignatureUrl = partyBSignatureDataUrl || partyBSignatureUrl;
    
    const formatCurrencyHTML = (amount, curr = "VND") => {
      if (curr === "VND") {
        return `${amount?.toLocaleString("vi-VN")} ₫`;
      }
      return `${curr} ${amount?.toLocaleString()}`;
    };

    const formatDateHTML = (dateString) => {
      if (!dateString) return "N/A";
      return dayjs(dateString).format("DD/MM/YYYY HH:mm");
    };

    // Calculate instruments total
    const instrumentsTotal = pricingBreakdown?.instruments?.reduce((sum, instr) => sum + (instr.basePrice || 0), 0) || 0;
    
    // Get deposit info
    const depositInstallment = contract?.installments?.find(inst => inst.type === "DEPOSIT");
    const depositPercent = depositInstallment?.percent || contract?.depositPercent || 0;
    const depositAmount = depositInstallment?.amount || (totalPrice * depositPercent / 100);

    // Get last milestone due date
    const lastMilestone = contract?.milestones && contract.milestones.length > 0 
      ? contract.milestones[contract.milestones.length - 1] 
      : null;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract ${contractNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      width: 100%;
    }
    @media print {
      body {
        padding: 15px;
      }
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #f97316;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .meta {
      margin: 10px 0;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .table th, .table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    .table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .table-subheader {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      height: 50px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .divider {
      height: 1px;
      background-color: #ddd;
      margin: 20px 0;
    }
    .milestone-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .milestone-table th, .milestone-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    .milestone-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .watermark {
      position: fixed;
      top: 300px;
      left: 50%;
      transform: translateX(-50%) rotate(-25deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(239, 68, 68, 0.15);
      z-index: 1;
      pointer-events: none;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .seal {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 120px;
      height: 120px;
      z-index: 10;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .seal-circle {
      position: absolute;
      width: 120px;
      height: 120px;
      border-radius: 60px;
      border: 3px dashed #dc2626;
    }
    .seal-inner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(255, 255, 255, 0.95);
      border-radius: 50px;
      padding: 15px;
      text-align: center;
    }
    .seal-text {
      font-size: 12px;
      font-weight: 700;
      color: #dc2626;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .seal-date {
      font-size: 10px;
      color: #dc2626;
      margin-top: 4px;
    }
    .signature-image {
      max-height: 60px;
      max-width: 200px;
      margin: 10px 0;
      display: block;
    }
    .section {
      page-break-inside: avoid;
    }
    .table {
      page-break-inside: avoid;
    }
    .signature-section {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  ${!htmlShouldShowSeal ? `
  <div class="watermark">${statusText}</div>
  ` : ''}
  
  ${htmlShouldShowSeal ? `
  <div class="seal">
    <div class="seal-circle"></div>
    <div class="seal-inner">
      <div class="seal-text">MuTraPro</div>
      <div class="seal-text">Official</div>
      <div class="seal-date">${contract?.signedAt ? dayjs(contract.signedAt).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD")}</div>
    </div>
  </div>
  ` : ''}
  
  <div class="header">
    <div class="logo">MuTraPro</div>
    <div style="font-size: 14px; color: #666;">Contract Document</div>
  </div>

  <div class="title">${getContractTitle(contractType)}</div>

  <div class="meta">
    <strong>Contract Number:</strong> ${contractNumber}<br>
    <strong>Status:</strong> ${statusText}<br>
    ${contract?.expectedStartDate ? `<strong>Expected Start:</strong> ${formatDateHTML(contract.expectedStartDate)}<br>` : ''}
    ${contract?.sentToCustomerAt ? `<strong>Sent At:</strong> ${formatDateHTML(contract.sentToCustomerAt)}<br>` : ''}
    ${contract?.signedAt ? `<strong>Signed At:</strong> ${formatDateHTML(contract.signedAt)}<br>` : ''}
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">Parties</div>
    <p><strong>Party A (Provider):</strong> MuTraPro Studio Co., Ltd</p>
    <p><strong>Party B (Customer):</strong> ${contract?.nameSnapshot || "N/A"}</p>
    ${contract?.phoneSnapshot ? `<p>Phone: ${contract.phoneSnapshot}</p>` : ''}
    ${contract?.emailSnapshot ? `<p>Email: ${contract.emailSnapshot}</p>` : ''}
  </div>

  <div class="divider"></div>

  ${requestDetails && (requestDetails.title || requestDetails.description) ? `
  <div class="section">
    <div class="section-title">Request Summary</div>
    ${requestDetails.title ? `<p><strong>Title:</strong> ${requestDetails.title}</p>` : ''}
    ${requestDetails.description ? `<p>${requestDetails.description.replace(/\n/g, '<br>')}</p>` : ''}
    ${(requestDetails.requestType === 'arrangement' || requestDetails.requestType === 'arrangement_with_recording') ? `
      ${requestDetails.genres && requestDetails.genres.length > 0 ? `<p><strong>Genres:</strong> ${requestDetails.genres.map(g => {
        const genreMap = { 'Pop': 'Pop', 'Rock': 'Rock', 'Jazz': 'Jazz', 'Classical': 'Classical', 'Country': 'Country', 'R&B': 'R&B', 'Hip-Hop': 'Hip-Hop', 'Electronic': 'Electronic', 'Folk': 'Folk', 'Blues': 'Blues', 'Reggae': 'Reggae', 'Metal': 'Metal', 'Latin': 'Latin', 'World': 'World', 'Other': 'Other' };
        return genreMap[g] || g;
      }).join(', ')}</p>` : ''}
      ${requestDetails.purpose ? `<p><strong>Purpose:</strong> ${
        requestDetails.purpose === 'karaoke_cover' ? 'Karaoke Cover' :
        requestDetails.purpose === 'performance' ? 'Performance' :
        requestDetails.purpose === 'recording' ? 'Recording' :
        requestDetails.purpose === 'education' ? 'Education' :
        requestDetails.purpose === 'commercial' ? 'Commercial Use' :
        requestDetails.purpose === 'personal' ? 'Personal Use' :
        requestDetails.purpose === 'other' ? 'Other' :
        requestDetails.purpose
      }</p>` : ''}
      ${requestDetails.requestType === 'arrangement_with_recording' && requestDetails.preferredSpecialists && requestDetails.preferredSpecialists.length > 0 ? `<p><strong>Preferred Vocalists:</strong> ${requestDetails.preferredSpecialists.map(s => s.name || `Vocalist ${s.specialistId}`).join(', ')}</p>` : ''}
    ` : ''}
  </div>
  <div class="divider"></div>
  ` : ''}

  ${contract?.contractType === 'recording' && bookingData ? `
  <div class="section">
    <p><strong>Studio Booking:</strong> ${bookingData.bookingDate || 'N/A'} | ${bookingData.startTime && bookingData.endTime ? `${bookingData.startTime} - ${bookingData.endTime}` : 'N/A'} (${bookingData.durationHours}h)</p>
  </div>
  <div class="divider"></div>
  ` : ''}

  <div class="section">
    <div class="section-title">Pricing & Payment</div>
    <table class="table">
      <tr>
        <th>Item</th>
        <th>Amount (${currency})</th>
      </tr>
      ${pricingBreakdown?.transcriptionDetails?.breakdown?.map(item => {
        const formatDesc = (desc) => {
          if (!desc) return desc;
          const pattern = /(\d+\.?\d*)\s*(phút|minutes?)/gi;
          return desc.replace(pattern, (match, minutes) => {
            const minutesNum = parseFloat(minutes);
            if (!isNaN(minutesNum) && minutesNum > 0) {
              const totalSeconds = Math.round(minutesNum * 60);
              const mins = Math.floor(totalSeconds / 60);
              const secs = totalSeconds % 60;
              return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            return match;
          });
        };
        return `
      <tr>
        <td>${item.label}${item.description ? ` (${formatDesc(item.description)})` : ''}</td>
        <td>${item.amount?.toLocaleString("vi-VN")}</td>
      </tr>
      `;
      }).join('') || ''}
      ${requestDetails?.servicePrice && (requestDetails.requestType === 'arrangement' || requestDetails.requestType === 'arrangement_with_recording') ? `
      <tr>
        <td>${requestDetails.requestType === 'arrangement_with_recording' ? 'Arrangement with Recording' : 'Arrangement Service'}</td>
        <td>${Number(requestDetails.servicePrice)?.toLocaleString("vi-VN") ?? requestDetails.servicePrice}</td>
      </tr>
      ` : ''}
      ${contract?.contractType === 'recording' && bookingData?.participants && bookingData.participants.length > 0 ? `
      <tr class="table-subheader">
        <td colspan="2">Recording Participants:</td>
      </tr>
      ${bookingData.participants.map(p => `
      <tr>
        <td style="padding-left: 24px;">• ${p.specialistName || 'Unnamed'} (${p.roleType}) - ${p.participantFee?.toLocaleString("vi-VN")} VND/hour × ${bookingData.durationHours} hours</td>
        <td>${((p.participantFee || 0) * (bookingData.durationHours || 1)).toLocaleString("vi-VN")}</td>
      </tr>
      `).join('')}
      <tr class="table-subheader">
        <td>Participant Total:</td>
        <td>${bookingData.participants.reduce((sum, p) => sum + (p.participantFee || 0) * (bookingData.durationHours || 1), 0).toLocaleString("vi-VN")}</td>
      </tr>
      ` : ''}
      ${contract?.contractType === 'recording' && bookingData?.requiredEquipment && bookingData.requiredEquipment.length > 0 ? `
      <tr class="table-subheader">
        <td colspan="2">Studio Equipment Rental:</td>
      </tr>
      ${bookingData.requiredEquipment.map(eq => `
      <tr>
        <td style="padding-left: 24px;">• ${eq.equipmentName || 'Unnamed'} × ${eq.quantity} - ${eq.rentalFeePerUnit?.toLocaleString("vi-VN")} VND/hour × ${bookingData.durationHours} hours</td>
        <td>${((eq.rentalFeePerUnit || 0) * (eq.quantity || 1) * (bookingData.durationHours || 1)).toLocaleString("vi-VN")}</td>
      </tr>
      `).join('')}
      <tr class="table-subheader">
        <td>Equipment Total:</td>
        <td>${bookingData.requiredEquipment.reduce((sum, eq) => sum + (eq.rentalFeePerUnit || 0) * (eq.quantity || 1) * (bookingData.durationHours || 1), 0).toLocaleString("vi-VN")}</td>
      </tr>
      ` : ''}
      ${pricingBreakdown?.instruments?.length > 0 ? `
      <tr class="table-subheader">
        <td colspan="2">Instruments Surcharge:</td>
      </tr>
      ${pricingBreakdown.instruments.map(instr => `
      <tr>
        <td style="padding-left: 24px;">• ${instr.instrumentName}${instr.isMain && (contract?.contractType === 'arrangement' || contract?.contractType === 'arrangement_with_recording') ? ' (Main)' : ''}</td>
        <td>${(instr.basePrice || 0).toLocaleString("vi-VN")}</td>
      </tr>
      `).join('')}
      <tr class="table-subheader">
        <td>Instruments Total:</td>
        <td>${instrumentsTotal.toLocaleString("vi-VN")}</td>
      </tr>
      ` : ''}
      <tr style="background-color: #f0f0f0; font-weight: bold;">
        <td>Total Price</td>
        <td>${formatCurrencyHTML(totalPrice, currency)}</td>
      </tr>
      <tr style="background-color: #fff3cd;">
        <td>Deposit (${depositPercent}%)</td>
        <td>${formatCurrencyHTML(depositAmount, currency)}</td>
      </tr>
    </table>
  </div>

  <div class="divider"></div>

  ${contract?.contractType?.toLowerCase() === 'transcription' && requestDetails?.tempoPercentage ? `
  <div class="section">
    <div class="section-title">Transcription Preferences</div>
    <p><strong>Tempo Reference:</strong> ${requestDetails.tempoPercentage}%${requestDetails?.durationMinutes ? ` | <strong>Source Duration:</strong> ${(() => {
      const totalSeconds = Math.round(requestDetails.durationMinutes * 60);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    })()}` : ''}</p>
  </div>
  <div class="divider"></div>
  ` : ''}

  ${contract?.milestones && contract.milestones.length > 0 ? `
  <div class="section">
    <div class="section-title">Milestones</div>
    <table class="milestone-table">
      <tr>
        <th>Milestone</th>
        <th>Description</th>
        <th>Payment %</th>
        <th>SLA Days</th>
      </tr>
      ${contract.milestones.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)).map(milestone => {
        const installment = contract?.installments?.find(inst => inst.milestoneId === milestone.milestoneId);
        return `
      <tr>
        <td>${milestone.name || `Milestone ${milestone.orderIndex || 0}`}</td>
        <td>${milestone.description || "-"}</td>
        <td>${installment?.percent || milestone.paymentPercent || "N/A"}${(installment?.percent || milestone.paymentPercent) ? "%" : ""}</td>
        <td>${milestone.milestoneSlaDays || milestone.slaDays || "-"}</td>
      </tr>
        `;
      }).join('')}
    </table>
  </div>

  <div class="divider"></div>
  ` : ''}

  <div class="section">
    <div class="section-title">Timeline & SLA</div>
    <p><strong>SLA Days (Service Level Agreement):</strong> ${contract?.slaDays || 0} days${contract?.slaDays > 0 ? ` | <strong>Due:</strong> After ${contract?.slaDays || 0} days if payment is on time` : ''}</p>
    ${contract?.expectedStartDate ? `<p><strong>Expected Start:</strong> ${formatDateHTML(contract.expectedStartDate)}</p>` : '<p><strong>Expected Start:</strong> <em>Not scheduled (will be set when work starts)</em></p>'}
    ${lastMilestone?.targetDeadline || lastMilestone?.plannedDueDate ? `<p><strong>Due Date:</strong> ${formatDateHTML(lastMilestone.targetDeadline || lastMilestone.plannedDueDate)}</p>` : ''}
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">Revision Policy</div>
    <p><strong>Free Revisions Included:</strong> ${contract?.freeRevisionsIncluded || 0}</p>
    ${contract?.revisionDeadlineDays ? `<p><strong>Revision Deadline:</strong> ${contract.revisionDeadlineDays} days after delivery</p>` : ''}
    ${contract?.additionalRevisionFeeVnd ? `<p><strong>Additional Revision Fee:</strong> ${formatCurrencyHTML(contract.additionalRevisionFeeVnd, "VND")}</p>` : ''}
  </div>

  <div class="divider"></div>

  ${contract?.termsAndConditions ? `
  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <p>${contract.termsAndConditions.replace(/\n/g, '<br>')}</p>
  </div>
  <div class="divider"></div>
  ` : ''}

  ${contract?.specialClauses ? `
  <div class="section">
    <div class="section-title">Special Clauses</div>
    <p>${contract.specialClauses.replace(/\n/g, '<br>')}</p>
  </div>
  <div class="divider"></div>
  ` : ''}

  <div class="section">
    <div class="section-title">Signatures</div>
    <div class="signature-section">
      <div class="signature-box">
        <p><strong>Party A Representative</strong></p>
        ${htmlShouldShowPartyASignature ? `
        <div style="margin: 20px 0;">
          <p style="font-style: italic; color: #666; margin-bottom: 10px;">[Digital Signature]</p>
          <p style="font-weight: 600; margin: 8px 0;">CEO - MuTraPro Studio Co., Ltd</p>
          <p style="font-size: 12px; color: #666;">Signed: ${formatDateHTML(contract?.signedAt || contract?.sentAt)}</p>
        </div>
        ` : `
        <div class="signature-line"></div>
        <p>Name, Title</p>
        `}
      </div>
      <div class="signature-box">
        <p><strong>Party B Representative</strong></p>
        ${htmlShouldShowPartyBSignature ? `
        <div style="margin: 20px 0;">
          ${htmlPartyBSignatureUrl ? `
          <img src="${htmlPartyBSignatureUrl}" alt="Party B Signature" class="signature-image" />
          ` : `
          <p style="font-style: italic; color: #666; margin-bottom: 10px;">[Digital Signature]</p>
          `}
          <p style="font-weight: 600; margin: 8px 0;">${contract?.nameSnapshot || "Customer"}</p>
          <p style="font-size: 12px; color: #666;">Signed: ${formatDateHTML(contract?.customerSignedAt || contract?.signedAt || "Pending")}</p>
        </div>
        ` : `
        <div class="signature-line"></div>
        <p>Name, Title</p>
        `}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Generated: ${dayjs().format("DD/MM/YYYY HH:mm")}</p>
    <p>Contract ID: ${contractNumber}</p>
  </div>
</body>
</html>
    `;
  };

  const handleExportPdf = async () => {
    if (!contract?.contractId) {
      Alert.alert("Error", "Contract ID not available");
      return;
    }

    try {
      setExporting(true);
      
      // Fetch Party B signature if needed for export
      let signatureDataUrl = partyBSignatureUrl;
      if (shouldShowPartyBSignature && !signatureDataUrl && contract?.contractId) {
        try {
          const signatureResponse = await getSignatureImage(contract.contractId);
          if (signatureResponse?.data) {
            signatureDataUrl = signatureResponse.data;
          }
        } catch (error) {
          console.error('Error loading signature for export:', error);
          // Continue without signature image
        }
      }
      
      // Generate HTML from contract data with signature
      const htmlContent = generateContractHtml(signatureDataUrl);
      
      // Generate filename
      const contractNumber = contract?.contractNumber || contract?.contractId || "contract";
      const filename = `contract-${contractNumber}-${dayjs().format("YYYYMMDD")}.pdf`;
      
      // Create PDF from HTML using expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 595, // A4 width in points (210mm)
        height: 842, // A4 height in points (297mm)
      });

      // Move PDF to a better location with proper filename
      const newUri = FileSystem.documentDirectory + filename;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Share the PDF file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(newUri, {
          mimeType: "application/pdf",
          dialogTitle: "Save Contract PDF",
          UTI: "com.adobe.pdf", // iOS
        });
        Alert.alert(
          "Success", 
          "Contract PDF exported successfully!",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Success", `Contract PDF saved to: ${newUri}`);
      }
    } catch (error) {
      console.error("Error exporting contract:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to export contract PDF. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Export PDF Button */}
      <View style={styles.exportButtonContainer}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportPdf}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.exportButtonText}>Exporting...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color={COLORS.white} />
              <Text style={styles.exportButtonText}>Download</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.document}>
        {/* Watermark for non-signed contracts - inside document to ensure proper layering */}
        {!shouldShowSeal && (
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermark}>{statusConfig.text}</Text>
          </View>
        )}

        {/* Official Seal for signed contracts */}
        {shouldShowSeal && (
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
            
            {/* Arrangement-specific fields */}
            {(requestDetails.requestType === 'arrangement' ||
              requestDetails.requestType === 'arrangement_with_recording') && (
              <>
                {requestDetails.genres &&
                  requestDetails.genres.length > 0 && (
                    <Text style={styles.paragraph}>
                      <Text style={styles.bold}>Genres: </Text>
                      {requestDetails.genres
                        .map(genre => getGenreLabel(genre))
                        .join(', ')}
                    </Text>
                  )}
                {requestDetails.purpose && (
                  <Text style={styles.paragraph}>
                    <Text style={styles.bold}>Purpose: </Text>
                    {getPurposeLabel(requestDetails.purpose)}
                  </Text>
                )}
                {requestDetails.requestType === 'arrangement_with_recording' &&
                  requestDetails.preferredSpecialists &&
                  requestDetails.preferredSpecialists.length > 0 && (
                    <Text style={styles.paragraph}>
                      <Text style={styles.bold}>Preferred Vocalists: </Text>
                      {requestDetails.preferredSpecialists
                        .map(s => s.name || `Vocalist ${s.specialistId}`)
                        .join(', ')}
                    </Text>
                  )}
              </>
            )}
            
            <View style={styles.divider} />
          </>
        )}

        {/* Studio Booking Information for Recording */}
        {contract?.contractType === 'recording' && bookingData && (
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Studio Booking: </Text>
            {bookingData.bookingDate || 'N/A'} |{' '}
            {bookingData.startTime && bookingData.endTime
              ? `${bookingData.startTime} - ${bookingData.endTime}`
              : 'N/A'}{' '}
            ({bookingData.durationHours}h)
          </Text>
        )}

        {/* Pricing & Payment */}
        <Text style={styles.sectionTitle}>Pricing & Payment</Text>

        {/* Pricing Table */}
        {(pricingBreakdown?.transcriptionDetails || 
          pricingBreakdown?.instruments?.length > 0 ||
          (requestDetails?.servicePrice &&
            (requestDetails.requestType === 'arrangement' ||
              requestDetails.requestType === 'arrangement_with_recording')) ||
          (contract?.contractType === 'recording' && bookingData)) && (
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
                    <Text style={styles.tableCellDescription}>
                      ({formatDescriptionDuration(item.description)})
                    </Text>
                  )}
                </View>
                <View style={[styles.tableCell, styles.tableCellRight]}>
                  <Text style={styles.tableCellTextBold}>
                    {item.amount?.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}

            {/* Service Price for Arrangement */}
            {requestDetails?.servicePrice &&
              (requestDetails.requestType === 'arrangement' ||
                requestDetails.requestType === 'arrangement_with_recording') && (
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.tableCellLeft]}>
                    <Text style={styles.tableCellTextBold}>
                      {requestDetails.requestType === 'arrangement_with_recording'
                        ? 'Arrangement with Recording'
                        : 'Arrangement Service'}
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellRight]}>
                    <Text style={styles.tableCellTextBold}>
                      {Number(requestDetails.servicePrice)?.toLocaleString() ??
                        requestDetails.servicePrice}
                    </Text>
                  </View>
                </View>
              )}

            {/* Recording Participants */}
            {contract?.contractType === 'recording' &&
              bookingData?.participants &&
              bookingData.participants.length > 0 && (
                <>
                  <View style={[styles.tableRow, styles.tableSubheaderRow]}>
                    <View style={[styles.tableCell, styles.tableCellLeft]}>
                      <Text style={styles.tableCellTextBold}>Recording Participants:</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellRight]} />
                  </View>
                  {bookingData.participants.map((participant, idx) => (
                    <View key={`participant-${idx}`} style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.tableCellLeft, { paddingLeft: 24 }]}>
                        <Text style={styles.tableCellText}>
                          • {participant.specialistName || 'Unnamed'} ({participant.roleType}) -{' '}
                          {participant.participantFee?.toLocaleString()} VND/hour ×{' '}
                          {bookingData.durationHours} hours
                        </Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellRight]}>
                        <Text style={styles.tableCellTextBold}>
                          {(
                            (participant.participantFee || 0) *
                            (bookingData.durationHours || 1)
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <View style={[styles.tableRow, styles.tableSubheaderRow]}>
                    <View style={[styles.tableCell, styles.tableCellLeft]}>
                      <Text style={styles.tableCellTextBold}>Participant Total:</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellRight]}>
                      <Text style={styles.tableCellTextBold}>
                        {bookingData.participants
                          .reduce(
                            (sum, p) =>
                              sum +
                              (p.participantFee || 0) * (bookingData.durationHours || 1),
                            0
                          )
                          .toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              )}

            {/* Studio Equipment Rental */}
            {contract?.contractType === 'recording' &&
              bookingData?.requiredEquipment &&
              bookingData.requiredEquipment.length > 0 && (
                <>
                  <View style={[styles.tableRow, styles.tableSubheaderRow]}>
                    <View style={[styles.tableCell, styles.tableCellLeft]}>
                      <Text style={styles.tableCellTextBold}>Studio Equipment Rental:</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellRight]} />
                  </View>
                  {bookingData.requiredEquipment.map((equipment, idx) => (
                    <View key={`equipment-${idx}`} style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.tableCellLeft, { paddingLeft: 24 }]}>
                        <Text style={styles.tableCellText}>
                          • {equipment.equipmentName || 'Unnamed'} × {equipment.quantity} -{' '}
                          {equipment.rentalFeePerUnit?.toLocaleString()} VND/hour ×{' '}
                          {bookingData.durationHours} hours
                        </Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellRight]}>
                        <Text style={styles.tableCellTextBold}>
                          {(
                            (equipment.rentalFeePerUnit || 0) *
                            (equipment.quantity || 1) *
                            (bookingData.durationHours || 1)
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <View style={[styles.tableRow, styles.tableSubheaderRow]}>
                    <View style={[styles.tableCell, styles.tableCellLeft]}>
                      <Text style={styles.tableCellTextBold}>Equipment Total:</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellRight]}>
                      <Text style={styles.tableCellTextBold}>
                        {bookingData.requiredEquipment
                          .reduce(
                            (sum, eq) =>
                              sum +
                              (eq.rentalFeePerUnit || 0) *
                                (eq.quantity || 1) *
                                (bookingData.durationHours || 1),
                            0
                          )
                          .toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              )}

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
                      <Text style={styles.tableCellText}>
                        • {instr.instrumentName}
                        {instr.isMain &&
                          (contract?.contractType === 'arrangement' ||
                            contract?.contractType === 'arrangement_with_recording') &&
                          ' (Main)'}
                      </Text>
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

        {/* Transcription Preferences */}
        {contract?.contractType?.toLowerCase() === 'transcription' &&
          requestDetails?.tempoPercentage && (
            <>
              <Text style={styles.sectionTitle}>Transcription Preferences</Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Tempo Reference: </Text>
                {requestDetails.tempoPercentage}%
                {requestDetails?.durationMinutes && (
                  <>
                    {' '}| <Text style={styles.bold}>Source Duration: </Text>
                    {formatDurationMMSS(requestDetails.durationMinutes)}
                  </>
                )}
              </Text>
              <View style={styles.divider} />
            </>
          )}

        {/* Milestones */}
        {contract?.milestones && contract.milestones.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Milestones</Text>
            {contract.milestones
              .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
              .map((milestone, idx) => {
                const installment = contract?.installments?.find(
                  (inst) => inst.milestoneId === milestone.milestoneId
                );
                const paymentPercent = installment?.percent || milestone.paymentPercent || "N/A";
                const slaDays = milestone.milestoneSlaDays || milestone.slaDays || "-";
                
                return (
                  <View key={idx} style={styles.milestoneCard}>
                    {/* Milestone Name with Type Tag */}
                    <View style={styles.milestoneCardHeader}>
                      <Text style={styles.milestoneCardTitle}>
                        {milestone.name || `Milestone ${idx + 1}`}
                      </Text>
                      {milestone.milestoneType && (
                        <View style={styles.milestoneTypeTag}>
                          <Text style={styles.milestoneTypeTagText}>
                            {milestone.milestoneType === 'transcription'
                              ? 'Transcription'
                              : milestone.milestoneType === 'arrangement'
                              ? 'Arrangement'
                              : milestone.milestoneType === 'recording'
                              ? 'Recording'
                              : milestone.milestoneType}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Description */}
                    {milestone.description && (
                      <Text style={styles.milestoneCardDescription}>
                        {milestone.description}
                      </Text>
                    )}
                    
                    {/* Payment % and SLA Days Row */}
                    <View style={styles.milestoneCardMetaRow}>
                      <View style={styles.milestoneCardMetaItem}>
                        <Text style={styles.milestoneCardMetaLabel}>Payment:</Text>
                        <Text style={styles.milestoneCardMetaValue}>
                          {paymentPercent}{typeof paymentPercent === 'number' ? "%" : ""}
                        </Text>
                      </View>
                      <View style={styles.milestoneCardMetaItem}>
                        <Text style={styles.milestoneCardMetaLabel}>SLA:</Text>
                        <Text style={styles.milestoneCardMetaValue}>
                          {slaDays} {typeof slaDays === 'number' ? "days" : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            <View style={styles.divider} />
          </>
        )}

        {/* Timeline & SLA */}
        <Text style={styles.sectionTitle}>Timeline & SLA</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>SLA Days (Service Level Agreement): </Text>
          {contract?.slaDays || 0} days
          {contract?.slaDays > 0 && (
            <>
              {' '}| <Text style={styles.bold}>Due: </Text>After {contract?.slaDays || 0} days if payment is on time
            </>
          )}
        </Text>
        {contract?.expectedStartDate ? (
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Expected Start: </Text>
            {formatDate(contract.expectedStartDate)}
          </Text>
        ) : (
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Expected Start: </Text>
            <Text style={styles.italicText}>Not scheduled (will be set when work starts)</Text>
          </Text>
        )}
        {(() => {
          const lastMilestone = contract?.milestones?.[contract.milestones.length - 1];
          if (lastMilestone?.plannedDueDate || lastMilestone?.targetDeadline) {
            return (
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>Due Date: </Text>
                {formatDate(lastMilestone.targetDeadline || lastMilestone.plannedDueDate)}
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
            {shouldShowPartyASignature ? (
              <>
                <Image
                  source={require("../../assets/images/signature.png")}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
                <Text style={styles.signatureName}>CEO - MuTraPro Studio Co., Ltd</Text>
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
            {shouldShowPartyBSignature ? (
              <>
                {partyBSignatureUrl ? (
                  <Image
                    source={{ uri: partyBSignatureUrl }}
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.signaturePlaceholder}>
                    <Text style={styles.signaturePlaceholderText}>
                      [Digital Signature]
                    </Text>
                  </View>
                )}
                <Text style={styles.signatureName}>
                  {contract?.nameSnapshot || "Customer"}
                </Text>
                <Text style={styles.signatureDate}>
                  Signed:{" "}
                  {formatDate(
                    contract?.customerSignedAt || contract?.signedAt || "Pending"
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  exportButtonContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  exportButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
  watermarkContainer: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    opacity: 0.15,
    pointerEvents: "none",
  },
  watermark: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.error,
    transform: [{ rotate: "-25deg" }],
  },
  sealContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    pointerEvents: "none",
  },
  seal: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  sealCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.error,
    borderStyle: "dashed",
  },
  sealInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 35,
    padding: SPACING.xs,
  },
  sealText: {
    fontSize: FONT_SIZES.xs - 2,
    fontWeight: "700",
    color: COLORS.error,
    textTransform: "uppercase",
  },
  sealDate: {
    fontSize: FONT_SIZES.xs - 4,
    color: COLORS.error,
    marginTop: 1,
  },
  document: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: "relative",
    overflow: "visible",
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.text,
  },
  logo: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.primary,
  },
  tagline: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: SPACING.xs / 2,
    flexWrap: "wrap",
  },
  metaLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.xs / 2,
  },
  metaValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  paragraph: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  bold: {
    fontWeight: "700",
  },
  italicText: {
    fontStyle: "italic",
    color: COLORS.textSecondary,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text,
    minHeight: 40,
  },
  tableHeader: {
    backgroundColor: COLORS.gray[200],
  },
  tableSubheaderRow: {
    backgroundColor: COLORS.gray[100],
  },
  tableCell: {
    padding: SPACING.xs,
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
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.text,
  },
  tableCellText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    lineHeight: 16,
  },
  tableCellTextBold: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.text,
  },
  tableCellDescription: {
    fontSize: FONT_SIZES.xs - 2,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 14,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  signatureBox: {
    flex: 1,
    marginHorizontal: SPACING.xs / 2,
  },
  signatureLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
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
  signatureImage: {
    height: 40,
    width: "100%",
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs / 2,
  },
  signaturePlaceholderText: {
    fontSize: FONT_SIZES.xs - 2,
    fontStyle: "italic",
    color: COLORS.textSecondary,
  },
  signatureName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  signatureDate: {
    fontSize: FONT_SIZES.xs - 2,
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
  milestoneCard: {
    backgroundColor: COLORS.background,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  milestoneCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  milestoneCardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  milestoneTypeTag: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  milestoneTypeTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  milestoneCardDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  milestoneCardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  milestoneCardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs / 2,
  },
  milestoneCardMetaLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  milestoneCardMetaValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
});

export default ContractPreview;

