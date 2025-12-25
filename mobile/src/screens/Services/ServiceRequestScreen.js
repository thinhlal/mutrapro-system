import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import FileUploader from "../../components/FileUploader";
import InstrumentPicker from "../../components/InstrumentPicker";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { MUSIC_GENRES, MUSIC_PURPOSES, getGenreLabel, getPurposeLabel } from "../../constants/musicOptionsConstants";
import { getAvailableSlots } from "../../services/studioBookingService";

const SERVICE_TYPE_LABELS = {
  transcription: "Transcription (Sound → Sheet)",
  arrangement: "Arrangement",
  arrangement_with_recording: "Arrangement + Recording (with Vocalist)",
  recording: "Recording (Studio Booking)",
};

const ServiceRequestScreen = ({ route, navigation }) => {
  const { serviceType } = route.params || {};
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState(user?.fullName || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [tempoPercentage, setTempoPercentage] = useState("100");

  // Recording-specific state
  const [bookingDate, setBookingDate] = useState(null); // YYYY-MM-DD
  const [bookingStartTime, setBookingStartTime] = useState(null); // HH:mm
  const [bookingEndTime, setBookingEndTime] = useState(null); // HH:mm
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  
  // Instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [mainInstrumentId, setMainInstrumentId] = useState(null);
  const [availableInstruments, setAvailableInstruments] = useState([]);
  
  // Arrangement-specific fields
  const [genres, setGenres] = useState([]);
  const [purpose, setPurpose] = useState(null);
  
  // Preferred vocalists (for arrangement_with_recording) - max 2
  const [preferredVocalists, setPreferredVocalists] = useState([]);
  
  // File upload
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Validation errors
  const [errors, setErrors] = useState({});
  
  // View mode for genres and purpose (horizontal or vertical)
  const [genresViewMode, setGenresViewMode] = useState('horizontal');
  const [purposeViewMode, setPurposeViewMode] = useState('horizontal');
  
  // Check if arrangement service
  const isArrangement = serviceType === "arrangement" || serviceType === "arrangement_with_recording";
  const isArrangementWithRecording = serviceType === "arrangement_with_recording";
  
  // Load instruments for main instrument selection
  useEffect(() => {
    if (isArrangement && selectedInstruments.length > 0) {
      // Load instrument details to get names
      const loadInstrumentDetails = async () => {
        try {
          const { getNotationInstrumentsByIds } = require("../../services/instrumentService");
          const response = await getNotationInstrumentsByIds(selectedInstruments);
          if (response?.status === "success" && response?.data) {
            setAvailableInstruments(response.data);
          }
        } catch (error) {
          console.error("Error loading instrument details:", error);
        }
      };
      loadInstrumentDetails();
    } else {
      setAvailableInstruments([]);
    }
  }, [selectedInstruments, isArrangement]);

  // Determine if service needs instruments and multiple selection
  const needsInstruments = serviceType && serviceType !== "recording";
  const multipleInstruments =
    serviceType === "arrangement" || serviceType === "arrangement_with_recording";
  const needsRecordingSlot = serviceType === "recording";

  useEffect(() => {
    if (needsRecordingSlot && bookingDate) {
      fetchAvailableSlots(bookingDate);
    }
  }, [needsRecordingSlot, bookingDate]);

  const fetchAvailableSlots = async (date) => {
    try {
      setSlotLoading(true);
      const resp = await getAvailableSlots(date);
      if (resp?.status === "success" && resp?.data) {
        setAvailableSlots(resp.data);
      } else if (resp?.data) {
        setAvailableSlots(resp.data);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
      Alert.alert("Error", error?.message || "Failed to load available slots");
      setAvailableSlots([]);
    } finally {
      setSlotLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations for all services
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!contactName.trim()) {
      newErrors.contactName = "Contact name is required";
    }

    if (!contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }

    if (!contactPhone.trim()) {
      newErrors.contactPhone = "Contact phone is required";
    }

    // Service-specific validations
    if (serviceType === "transcription") {
      // Transcription: exactly 1 instrument required
      if (selectedInstruments.length !== 1) {
        newErrors.instruments = "Please select exactly one instrument for transcription";
      }

      // Transcription: validate tempo
      const tempo = parseInt(tempoPercentage);
      if (isNaN(tempo) || tempo < 50 || tempo > 200) {
        newErrors.tempo = "Tempo must be between 50-200%";
      }

      // Transcription: file must be audio/video
      if (!selectedFile) {
        newErrors.file = "Please upload an audio/video file";
      }
    } else if (serviceType === "arrangement" || serviceType === "arrangement_with_recording") {
      // Arrangement: at least 1 instrument required
      if (selectedInstruments.length === 0) {
        newErrors.instruments = "Please select at least one instrument";
      }

      // Arrangement: main instrument required
      if (!mainInstrumentId) {
        newErrors.mainInstrument = "Please select a main instrument for your arrangement";
      }

      // Arrangement: file must be notation file
      if (!selectedFile) {
        newErrors.file = "Please upload a notation file (MusicXML, MIDI, or PDF)";
      }

      // Arrangement: genres required (at least one)
      if (!genres || genres.length === 0) {
        newErrors.genres = "Please select at least one music genre";
      }

      // Arrangement: purpose required
      if (!purpose) {
        newErrors.purpose = "Please select the purpose of this arrangement";
      }
    } else if (serviceType === "recording") {
      // Recording: no instruments required (they're selected in a different flow)
      
      // Recording: booking slot required
      if (!bookingDate || !bookingStartTime || !bookingEndTime) {
        newErrors.slot = "Please choose booking date and time";
      } else {
        const start = bookingStartTime;
        const end = bookingEndTime;
        if (start >= end) {
          newErrors.slot = "End time must be after start time";
        }
      }

      // Recording: file required
      if (!selectedFile) {
        newErrors.file = "Please upload an audio/video file";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields correctly.");
      return;
    }

    // Navigate to quote screen with form data
    navigation.navigate("ServiceQuote", {
      formData: {
        requestType: serviceType,
        title: title.trim(),
        description: description.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        tempoPercentage: serviceType === "transcription" ? parseInt(tempoPercentage) : undefined,
        instrumentIds: selectedInstruments,
        mainInstrumentId: mainInstrumentId,
        genres: isArrangement ? genres : null,
        purpose: isArrangement ? purpose : null,
        preferredSpecialists: isArrangementWithRecording && preferredVocalists.length > 0
          ? preferredVocalists.map((v) => ({
              specialistId: v.id || v.specialistId,
              name: v.name || v.fullName || `Vocalist ${v.id || v.specialistId}`,
              role: "VOCALIST", // Mặc định là VOCALIST cho arrangement_with_recording
            }))
          : null,
        durationMinutes: serviceType === "transcription" ? (selectedFile?.duration || 0) : undefined,
        bookingDate,
        bookingStartTime,
        bookingEndTime,
      },
      uploadedFile: selectedFile,
      serviceType: serviceType,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Service Request</Text>
          <Text style={styles.headerSubtitle}>
            Tell us what you need. After filling the form, please upload your files.
          </Text>
          
          {/* Service Type Badge */}
          <View style={styles.serviceTypeBadge}>
            <Ionicons name="musical-note" size={16} color={COLORS.primary} />
            <Text style={styles.serviceTypeText}>
              {SERVICE_TYPE_LABELS[serviceType] || serviceType}
            </Text>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g., Transcribe Song ABC"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) {
                setErrors({ ...errors, title: null });
              }
            }}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Description Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Describe your request in detail..."
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) {
                setErrors({ ...errors, description: null });
              }
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Contact Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Contact Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.contactName && styles.inputError]}
            placeholder="Your full name"
            value={contactName}
            onChangeText={(text) => {
              setContactName(text);
              if (errors.contactName) {
                setErrors({ ...errors, contactName: null });
              }
            }}
          />
          {errors.contactName && <Text style={styles.errorText}>{errors.contactName}</Text>}
        </View>

        {/* Contact Email */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Contact Email <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            placeholder="you@example.com"
            value={contactEmail}
            editable={false}
          />
          {errors.contactEmail && <Text style={styles.errorText}>{errors.contactEmail}</Text>}
        </View>

        {/* Contact Phone */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Contact Phone <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.contactPhone && styles.inputError]}
            placeholder="+84 ..."
            value={contactPhone}
            onChangeText={(text) => {
              setContactPhone(text);
              if (errors.contactPhone) {
                setErrors({ ...errors, contactPhone: null });
              }
            }}
            keyboardType="phone-pad"
          />
          {errors.contactPhone && <Text style={styles.errorText}>{errors.contactPhone}</Text>}
        </View>

        {/* Tempo Percentage - Only for transcription */}
        {serviceType === "transcription" && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Tempo Percentage
            </Text>
            <View style={styles.tempoContainer}>
              <TouchableOpacity
                style={styles.tempoButton}
                onPress={() => {
                  const newTempo = Math.max(50, parseInt(tempoPercentage) - 5);
                  setTempoPercentage(String(newTempo));
                }}
              >
                <Ionicons name="remove" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.tempoInput, errors.tempo && styles.inputError]}
                value={`${tempoPercentage}%`}
                onChangeText={(text) => {
                  const value = text.replace(/[^0-9]/g, "");
                  setTempoPercentage(value);
                  if (errors.tempo) {
                    setErrors({ ...errors, tempo: null });
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
              <TouchableOpacity
                style={styles.tempoButton}
                onPress={() => {
                  const newTempo = Math.min(200, parseInt(tempoPercentage) + 5);
                  setTempoPercentage(String(newTempo));
                }}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Adjust playback speed (100 = normal speed)</Text>
            {errors.tempo && <Text style={styles.errorText}>{errors.tempo}</Text>}
          </View>
        )}

        {/* Instrument Selection */}
        {needsInstruments && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Instrument{multipleInstruments ? "s" : ""} <Text style={styles.required}>*</Text>
            </Text>
            <InstrumentPicker
              serviceType={serviceType}
              selectedInstruments={selectedInstruments}
              onSelectInstruments={(instruments) => {
                setSelectedInstruments(instruments);
                // Reset mainInstrumentId if it's not in the new selection
                if (mainInstrumentId && !instruments.includes(mainInstrumentId)) {
                  setMainInstrumentId(null);
                }
                if (errors.instruments) {
                  setErrors({ ...errors, instruments: null });
                }
              }}
              multipleSelection={multipleInstruments}
            />
            {errors.instruments && <Text style={styles.errorText}>{errors.instruments}</Text>}
            
            {/* Main Instrument Selection - Only for arrangement */}
            {isArrangement && selectedInstruments.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Main Instrument <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.mainInstrumentContainer}>
                  {selectedInstruments.map((instId) => {
                    const instrument = availableInstruments.find((inst) => inst.instrumentId === instId);
                    const instrumentName = instrument?.instrumentName || instId.substring(0, 8) + "...";
                    const isSelected = mainInstrumentId === instId;
                    return (
                      <TouchableOpacity
                        key={instId}
                        style={[
                          styles.mainInstrumentButton,
                          isSelected && styles.mainInstrumentButtonSelected,
                        ]}
                        onPress={() => {
                          setMainInstrumentId(instId);
                          if (errors.mainInstrument) {
                            setErrors({ ...errors, mainInstrument: null });
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.mainInstrumentButtonText,
                            isSelected && styles.mainInstrumentButtonTextSelected,
                          ]}
                        >
                          {instrumentName}
                          {isSelected && " (Main)"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.mainInstrument && <Text style={styles.errorText}>{errors.mainInstrument}</Text>}
              </View>
            )}
          </View>
        )}

        {/* Recording Slot */}
        {needsRecordingSlot && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Booking Date & Time <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.slot && styles.inputError]}
              placeholder="YYYY-MM-DD"
              value={bookingDate || ""}
              onChangeText={(text) => {
                setBookingDate(text);
                if (errors.slot) setErrors({ ...errors, slot: null });
              }}
            />
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
              <TextInput
                style={[styles.input, { flex: 1 }, errors.slot && styles.inputError]}
                placeholder="Start (HH:mm)"
                value={bookingStartTime || ""}
                onChangeText={(text) => {
                  setBookingStartTime(text);
                  if (errors.slot) setErrors({ ...errors, slot: null });
                }}
              />
              <TextInput
                style={[styles.input, { flex: 1 }, errors.slot && styles.inputError]}
                placeholder="End (HH:mm)"
                value={bookingEndTime || ""}
                onChangeText={(text) => {
                  setBookingEndTime(text);
                  if (errors.slot) setErrors({ ...errors, slot: null });
                }}
              />
            </View>
            {slotLoading && <Text style={styles.helperText}>Loading available slots...</Text>}
            {availableSlots.length > 0 && (
              <Text style={styles.helperText}>
                Available slots:{" "}
                {availableSlots.map((s) => `${s.start} - ${s.end}`).join(", ")}
              </Text>
            )}
            {errors.slot && <Text style={styles.errorText}>{errors.slot}</Text>}
          </View>
        )}
        
        {/* Genres Selection - Only for arrangement */}
        {isArrangement && (
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Music Genres <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.viewModeToggle}
                onPress={() =>
                  setGenresViewMode(
                    genresViewMode === 'horizontal' ? 'vertical' : 'horizontal'
                  )
                }
              >
                <Ionicons
                  name={
                    genresViewMode === 'horizontal'
                      ? 'list-outline'
                      : 'grid-outline'
                  }
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
            {genresViewMode === 'horizontal' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genresContainer}>
                {MUSIC_GENRES.map((genre) => {
                  const isSelected = genres.includes(genre.value);
                  return (
                    <TouchableOpacity
                      key={genre.value}
                      style={[styles.genreTag, isSelected && styles.genreTagSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setGenres(genres.filter((g) => g !== genre.value));
                        } else {
                          setGenres([...genres, genre.value]);
                        }
                        if (errors.genres) {
                          setErrors({ ...errors, genres: null });
                        }
                      }}
                    >
                      <Text style={[styles.genreTagText, isSelected && styles.genreTagTextSelected]}>
                        {genre.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.genresContainerVertical}>
                {MUSIC_GENRES.map((genre) => {
                  const isSelected = genres.includes(genre.value);
                  return (
                    <TouchableOpacity
                      key={genre.value}
                      style={[styles.genreTagVertical, isSelected && styles.genreTagSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setGenres(genres.filter((g) => g !== genre.value));
                        } else {
                          setGenres([...genres, genre.value]);
                        }
                        if (errors.genres) {
                          setErrors({ ...errors, genres: null });
                        }
                      }}
                    >
                      <Text style={[styles.genreTagText, isSelected && styles.genreTagTextSelected]}>
                        {genre.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}
          </View>
        )}
        
        {/* Purpose Selection - Only for arrangement */}
        {isArrangement && (
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Purpose <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.viewModeToggle}
                onPress={() =>
                  setPurposeViewMode(
                    purposeViewMode === 'horizontal' ? 'vertical' : 'horizontal'
                  )
                }
              >
                <Ionicons
                  name={
                    purposeViewMode === 'horizontal'
                      ? 'list-outline'
                      : 'grid-outline'
                  }
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
            {purposeViewMode === 'horizontal' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.purposeContainer}>
                {MUSIC_PURPOSES.map((p) => {
                  const isSelected = purpose === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.purposeButton, isSelected && styles.purposeButtonSelected]}
                      onPress={() => {
                        setPurpose(isSelected ? null : p.value);
                        if (errors.purpose) {
                          setErrors({ ...errors, purpose: null });
                        }
                      }}
                    >
                      <Text style={[styles.purposeButtonText, isSelected && styles.purposeButtonTextSelected]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.purposeContainerVertical}>
                {MUSIC_PURPOSES.map((p) => {
                  const isSelected = purpose === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.purposeButtonVertical, isSelected && styles.purposeButtonSelected]}
                      onPress={() => {
                        setPurpose(isSelected ? null : p.value);
                        if (errors.purpose) {
                          setErrors({ ...errors, purpose: null });
                        }
                      }}
                    >
                      <Text style={[styles.purposeButtonText, isSelected && styles.purposeButtonTextSelected]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {errors.purpose && <Text style={styles.errorText}>{errors.purpose}</Text>}
          </View>
        )}

        {/* Preferred Vocalists - Only for arrangement_with_recording */}
        {isArrangementWithRecording && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Preferred Vocalists (Optional)
            </Text>
            <Text style={styles.hintText}>
              Note: This is a preference suggestion, not a commitment. We will try to book the vocalist you choose. If they are not available, the manager will suggest similar options.
            </Text>
            
            {/* Selected Vocalists Table */}
            {preferredVocalists.length > 0 && (
              <View style={styles.vocalistsTableContainer}>
                <View style={styles.vocalistsTableHeader}>
                  <Text style={styles.vocalistsTableHeaderText}>Vocalist Name</Text>
                </View>
                {preferredVocalists.map((vocalist, index) => (
                  <View key={vocalist.id || vocalist.specialistId} style={styles.vocalistsTableRow}>
                    <Text style={styles.vocalistsTableCell}>
                      {vocalist.name || vocalist.fullName || `Vocalist ${vocalist.id || vocalist.specialistId}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.vocalistsTableAction}
                      onPress={() => {
                        setPreferredVocalists(
                          preferredVocalists.filter(
                            (v) => (v.id || v.specialistId) !== (vocalist.id || vocalist.specialistId)
                          )
                        );
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Vocalist Button */}
            <TouchableOpacity
              style={[
                styles.addVocalistButton,
                preferredVocalists.length >= 2 && styles.addVocalistButtonDisabled,
              ]}
              onPress={() => {
                if (preferredVocalists.length < 2) {
                  navigation.navigate("VocalistSelection", {
                    allowMultiple: true,
                    maxSelections: 2,
                    selectedVocalists: preferredVocalists,
                    onSelect: (selected) => {
                      setPreferredVocalists(selected);
                    },
                  });
                }
              }}
              disabled={preferredVocalists.length >= 2}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.addVocalistButtonText}>
                {preferredVocalists.length === 0
                  ? "Add Preferred Vocalist (max 2)"
                  : preferredVocalists.length === 1
                  ? "Add Second Vocalist"
                  : "2 vocalists selected"}
              </Text>
            </TouchableOpacity>
            
            {preferredVocalists.length === 0 && (
              <Text style={styles.hintText}>
                Or leave empty for manager to suggest suitable vocalists
              </Text>
            )}
          </View>
        )}

        {/* File Upload */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {isArrangement 
              ? "Notation File (MusicXML, MIDI, PDF)" 
              : "Audio/Video File"} <Text style={styles.required}>*</Text>
          </Text>
          <FileUploader
            onFileSelect={(file) => {
              setSelectedFile(file);
              if (errors.file) {
                setErrors({ ...errors, file: null });
              }
            }}
            selectedFile={selectedFile}
            onClearFile={() => setSelectedFile(null)}
            allowedFileTypes={isArrangement ? ["xml", "musicxml", "mid", "midi", "pdf"] : null}
          />
          {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Continue to Quote</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  serviceTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: "flex-start",
  },
  serviceTypeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  viewModeToggle: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary + "15",
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  inputDisabled: {
    backgroundColor: COLORS.gray[100],
    color: COLORS.gray[600],
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    minHeight: 100,
  },
  tempoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tempoButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  tempoInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginHorizontal: SPACING.md,
    minWidth: 80,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  mainInstrumentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  mainInstrumentButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  mainInstrumentButtonSelected: {
    backgroundColor: COLORS.warning + "20",
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  mainInstrumentButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  mainInstrumentButtonTextSelected: {
    color: COLORS.warning,
    fontWeight: "600",
  },
  genresContainer: {
    marginTop: SPACING.sm,
  },
  genresContainerVertical: {
    flexDirection: "column",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  genreTagVertical: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    width: "100%",
  },
  genreTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.xs,
  },
  genreTagSelected: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  genreTagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  genreTagTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  purposeContainer: {
    marginTop: SPACING.sm,
  },
  purposeContainerVertical: {
    flexDirection: "column",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  purposeButtonVertical: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    width: "100%",
  },
  purposeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.xs,
  },
  purposeButtonSelected: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  purposeButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  purposeButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  hintText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  vocalistsTableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  vocalistsTableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary + "15",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vocalistsTableHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  vocalistsTableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vocalistsTableCell: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    flex: 1,
  },
  vocalistsTableAction: {
    padding: SPACING.xs,
  },
  addVocalistButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  addVocalistButtonDisabled: {
    opacity: 0.5,
    borderColor: COLORS.gray[300],
  },
  addVocalistButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

export default ServiceRequestScreen;

