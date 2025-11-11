// Contract Templates - Terms & Conditions and Special Clauses
// Templates for different contract types

// Get default Terms & Conditions based on contract type
export const getDefaultTermsAndConditions = contractType => {
  const termsMap = {
    transcription: `1. SERVICE SCOPE
Party A agrees to provide professional music transcription services, converting audio recordings into musical notation (sheet music) in the format specified by Party B.

2. DELIVERY AND FORMAT
- Party A will deliver the transcription in the agreed format (e.g., PDF, MusicXML, Sibelius, Finale).
- Delivery will be made electronically via the MuTraPro system.
- Party A will ensure the transcription accurately represents the audio recording provided.

3. REVISIONS
- Party B is entitled to {free_revisions_included} free revision(s) within 30 days after delivery.
- Revision requests must be submitted within the specified time period to be eligible for free revisions.
- Additional revisions beyond the free allowance will be charged at {additional_revision_fee_vnd} VND per revision.
- Revision requests must be specific and related to transcription accuracy.

4. PAYMENT TERMS
- Deposit: {deposit_percent}% of total price due upon contract signing.
- Final payment: Remaining {final_amount} VND due upon delivery and acceptance.
- Payment method: Bank transfer or as agreed.

5. INTELLECTUAL PROPERTY
- Party B retains all rights to the original audio recording.
- Party A retains rights to the transcription work until full payment is received.
- Upon full payment, Party B receives full rights to use the transcription.

6. CONFIDENTIALITY
- Party A agrees to maintain confidentiality of all materials provided by Party B.
- Party A will not share, distribute, or use the transcription for any purpose other than delivery to Party B.

7. LIABILITY
- Party A is not responsible for errors in transcription if the source audio is unclear or incomplete.
- Party A's liability is limited to the contract value.

8. TERMINATION
- Either party may terminate this contract with 7 days written notice.
- In case of termination, Party B will pay for work completed to date.`,

    arrangement: `1. SERVICE SCOPE
Party A agrees to provide professional music arrangement services, creating musical arrangements based on the materials provided by Party B.

2. DELIVERY AND FORMAT
- Party A will deliver the arrangement in the agreed format (e.g., PDF, MusicXML, Sibelius, Finale).
- Delivery will be made electronically via the MuTraPro system.
- Party A will ensure the arrangement meets the specifications provided by Party B.

3. REVISIONS
- Party B is entitled to {free_revisions_included} free revision(s) within 45 days after delivery.
- Revision requests must be submitted within the specified time period to be eligible for free revisions.
- Additional revisions beyond the free allowance will be charged at {additional_revision_fee_vnd} VND per revision.
- Revision requests must be specific and within the original scope of work.

4. PAYMENT TERMS
- Deposit: {deposit_percent}% of total price due upon contract signing.
- Final payment: Remaining {final_amount} VND due upon delivery and acceptance.
- Payment method: Bank transfer or as agreed.

5. INTELLECTUAL PROPERTY
- Party B retains all rights to the original composition/materials.
- Party A retains rights to the arrangement work until full payment is received.
- Upon full payment, Party B receives full rights to use the arrangement.

6. CONFIDENTIALITY
- Party A agrees to maintain confidentiality of all materials provided by Party B.
- Party A will not share, distribute, or use the arrangement for any purpose other than delivery to Party B.

7. LIABILITY
- Party A is not responsible for copyright issues if Party B does not own the rights to the original material.
- Party A's liability is limited to the contract value.

8. TERMINATION
- Either party may terminate this contract with 14 days written notice.
- In case of termination, Party B will pay for work completed to date.`,

    arrangement_with_recording: `1. SERVICE SCOPE
Party A agrees to provide professional music arrangement and recording services, including:
- Creating musical arrangements based on materials provided by Party B
- Recording the arranged music in a professional studio setting
- Delivering both the arrangement notation and audio recording

2. DELIVERY AND FORMAT
- Party A will deliver:
  * Arrangement in agreed format (PDF, MusicXML, etc.)
  * Audio recording in agreed format (WAV, MP3, etc.)
- Delivery will be made electronically via the MuTraPro system.
- All deliverables must meet professional quality standards.

3. REVISIONS
- Party B is entitled to {free_revisions_included} free revision(s) within 60 days after delivery.
- Revision requests must be submitted within the specified time period to be eligible for free revisions.
- Additional revisions beyond the free allowance will be charged at {additional_revision_fee_vnd} VND per revision.
- Revision requests must be specific and within the original scope of work.

4. PAYMENT TERMS
- Deposit: {deposit_percent}% of total price due upon contract signing.
- Final payment: Remaining {final_amount} VND due upon delivery and acceptance.
- Payment method: Bank transfer or as agreed.

5. INTELLECTUAL PROPERTY
- Party B retains all rights to the original composition/materials.
- Party A retains rights to the arrangement and recording until full payment is received.
- Upon full payment, Party B receives full rights to use the arrangement and recording.

6. CONFIDENTIALITY
- Party A agrees to maintain confidentiality of all materials provided by Party B.
- Party A will not share, distribute, or use the arrangement/recording for any purpose other than delivery to Party B.

7. LIABILITY
- Party A is not responsible for copyright issues if Party B does not own the rights to the original material.
- Party A's liability is limited to the contract value.

8. TERMINATION
- Either party may terminate this contract with 14 days written notice.
- In case of termination, Party B will pay for work completed to date.`,

    recording: `1. SERVICE SCOPE
Party A agrees to provide professional music recording services in a studio setting, recording the music as specified by Party B.

2. DELIVERY AND FORMAT
- Party A will deliver the recording in the agreed format (WAV, MP3, etc.).
- Delivery will be made electronically via the MuTraPro system.
- Party A will ensure the recording meets professional quality standards.

3. REVISIONS
- Party B is entitled to {free_revisions_included} free revision(s) within 30 days after delivery.
- Revision requests must be submitted within the specified time period to be eligible for free revisions.
- Additional revisions beyond the free allowance will be charged at {additional_revision_fee_vnd} VND per revision.
- Revision requests must be specific and related to recording quality.

4. PAYMENT TERMS
- Deposit: {deposit_percent}% of total price due upon contract signing.
- Final payment: Remaining {final_amount} VND due upon delivery and acceptance.
- Payment method: Bank transfer or as agreed.

5. INTELLECTUAL PROPERTY
- Party B retains all rights to the recorded music.
- Party A retains rights to the recording until full payment is received.
- Upon full payment, Party B receives full rights to use the recording.

6. CONFIDENTIALITY
- Party A agrees to maintain confidentiality of all materials provided by Party B.
- Party A will not share, distribute, or use the recording for any purpose other than delivery to Party B.

7. LIABILITY
- Party A is not responsible for performance quality if Party B's performers are not prepared.
- Party A's liability is limited to the contract value.

8. TERMINATION
- Either party may terminate this contract with 7 days written notice.
- In case of termination, Party B will pay for work completed to date.`,

    bundle: `1. SERVICE SCOPE
Party A agrees to provide comprehensive music services including:
- Transcription: Converting audio recordings into musical notation
- Arrangement: Creating musical arrangements based on provided materials
- Recording: Recording the arranged music in a professional studio setting

2. DELIVERY AND FORMAT
- Party A will deliver:
  * Transcription in agreed format (PDF, MusicXML, etc.)
  * Arrangement in agreed format
  * Audio recording in agreed format (WAV, MP3, etc.)
- Delivery will be made electronically via the MuTraPro system.
- All deliverables must meet professional quality standards.

3. REVISIONS
- Party B is entitled to {free_revisions_included} free revision(s) within 60 days after delivery.
- Revision requests must be submitted within the specified time period to be eligible for free revisions.
- Additional revisions beyond the free allowance will be charged at {additional_revision_fee_vnd} VND per revision.
- Revision requests must be specific and within the original scope of work.

4. PAYMENT TERMS
- Deposit: {deposit_percent}% of total price due upon contract signing.
- Final payment: Remaining {final_amount} VND due upon delivery and acceptance.
- Payment method: Bank transfer or as agreed.

5. INTELLECTUAL PROPERTY
- Party B retains all rights to the original materials and recordings.
- Party A retains rights to all work until full payment is received.
- Upon full payment, Party B receives full rights to use all deliverables.

6. CONFIDENTIALITY
- Party A agrees to maintain confidentiality of all materials provided by Party B.
- Party A will not share, distribute, or use any deliverables for any purpose other than delivery to Party B.

7. LIABILITY
- Party A is not responsible for copyright issues if Party B does not own the rights to the original material.
- Party A's liability is limited to the contract value.

8. TERMINATION
- Either party may terminate this contract with 14 days written notice.
- In case of termination, Party B will pay for work completed to date.`,
  };
  return termsMap[contractType] || termsMap.transcription;
};

// Get default Special Clauses based on contract type
export const getDefaultSpecialClauses = contractType => {
  const clausesMap = {
    transcription: `- Party B warrants that they have the right to transcribe the provided audio recording.
- Party A will maintain backup copies of the transcription for 90 days after delivery.
- Revision requests must be submitted within 30 days after delivery to be eligible for free revisions.
- Any disputes regarding transcription accuracy must be raised within 30 days of delivery.`,

    arrangement: `- Party B warrants that they have the right to arrange the provided composition/materials.
- Party A will maintain backup copies of the arrangement for 90 days after delivery.
- Revision requests must be submitted within 45 days after delivery to be eligible for free revisions.
- Any disputes regarding arrangement quality must be raised within 45 days of delivery.
- Party B may request changes to instrumentation or style, subject to additional fees.`,

    arrangement_with_recording: `- Party B warrants that they have the right to arrange and record the provided composition/materials.
- Party A will maintain backup copies of both arrangement and recording for 90 days after delivery.
- Revision requests must be submitted within 60 days after delivery to be eligible for free revisions.
- Any disputes regarding arrangement or recording quality must be raised within 60 days of delivery.
- Party B may request changes to instrumentation, style, or recording approach, subject to additional fees.
- Studio time is included in the contract price. Additional studio time may be required for complex arrangements.`,

    recording: `- Party B warrants that they have the right to record the provided composition/materials.
- Party A will maintain backup copies of the recording for 90 days after delivery.
- Revision requests must be submitted within 30 days after delivery to be eligible for free revisions.
- Any disputes regarding recording quality must be raised within 30 days of delivery.
- Studio time is included in the contract price. Additional studio time may be required.`,

    bundle: `- Party B warrants that they have the right to transcribe, arrange, and record the provided materials.
- Party A will maintain backup copies of all deliverables for 90 days after delivery.
- Revision requests must be submitted within 60 days after delivery to be eligible for free revisions.
- Any disputes regarding any deliverable quality must be raised within 60 days of delivery.
- Party B may request changes to any aspect of the work, subject to additional fees.
- Studio time is included in the contract price. Additional studio time may be required for complex arrangements.`,
  };
  return clausesMap[contractType] || clausesMap.transcription;
};

// Replace template variables in terms & conditions
export const replaceTemplateVariables = (text, formValues) => {
  if (!text) return text;
  return text
    .replace(/\{free_revisions_included\}/g, formValues?.free_revisions_included || 1)
    .replace(/\{additional_revision_fee_vnd\}/g, formValues?.additional_revision_fee_vnd || 0)
    .replace(/\{deposit_percent\}/g, formValues?.deposit_percent || 40)
    .replace(/\{final_amount\}/g, formValues?.final_amount?.toLocaleString() || '0');
};

