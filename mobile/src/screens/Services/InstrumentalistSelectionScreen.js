// InstrumentalistSelectionScreen.js - Select instrumentalist for a specific instrument
import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getAvailableArtistsForRequest } from "../../services/studioBookingService";
import { getItem, setItem } from "../../utils/storage";

const InstrumentalistSelectionScreen = ({ navigation, route }) => {
  const {
    fromFlow = false,
    skillId,
    skillName,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
    selectedInstrumentalistId = null,
  } = route.params || {};

  const [instrumentalists, setInstrumentalists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(selectedInstrumentalistId);

  // Get booking info from storage if not in route params (when fromFlow is true)
  const [effectiveBookingDate, setEffectiveBookingDate] = useState(bookingDate);
  const [effectiveBookingStartTime, setEffectiveBookingStartTime] = useState(bookingStartTime);
  const [effectiveBookingEndTime, setEffectiveBookingEndTime] = useState(bookingEndTime);
  const [bookingInfoLoaded, setBookingInfoLoaded] = useState(false);

  useEffect(() => {
    if (!bookingDate && fromFlow) {
      // Try to load booking info from storage
      const loadBookingInfo = async () => {
        try {
          const stored = await getItem('recordingFlowData');
          if (stored?.step1) {
            setEffectiveBookingDate(stored.step1.bookingDate);
            setEffectiveBookingStartTime(stored.step1.bookingStartTime);
            setEffectiveBookingEndTime(stored.step1.bookingEndTime);
            setBookingInfoLoaded(true);
          } else {
            setBookingInfoLoaded(true); // Mark as loaded even if no step1 data
          }
        } catch (error) {
          console.error('Error reading flow data:', error);
          setBookingInfoLoaded(true);
        }
      };
      loadBookingInfo();
    } else {
      setEffectiveBookingDate(bookingDate);
      setEffectiveBookingStartTime(bookingStartTime);
      setEffectiveBookingEndTime(bookingEndTime);
      setBookingInfoLoaded(true);
    }
  }, [bookingDate, bookingStartTime, bookingEndTime, fromFlow]);

  // Fetch instrumentalists with filters
  // Only fetch after booking info is loaded
  useEffect(() => {
    if (bookingInfoLoaded && skillId && effectiveBookingDate && effectiveBookingStartTime && effectiveBookingEndTime) {
      fetchInstrumentalists();
    }
  }, [skillId, effectiveBookingDate, effectiveBookingStartTime, effectiveBookingEndTime, bookingInfoLoaded]);

  const fetchInstrumentalists = async () => {
    setLoading(true);
    try {
      const response = await getAvailableArtistsForRequest(
        effectiveBookingDate,
        effectiveBookingStartTime,
        effectiveBookingEndTime,
        skillId,
        'INSTRUMENT',
        null // genres - not applicable for instrumentalists
      );
      
      if (response?.status === 'success' && response?.data) {
        setInstrumentalists(response.data);
      } else {
        setInstrumentalists([]);
      }
    } catch (error) {
      console.error("Error fetching instrumentalists:", error);
      Alert.alert("Error", error.message || "Failed to load instrumentalists");
      setInstrumentalists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (instrumentalist) => {
    const instrumentalistId = instrumentalist.id || instrumentalist.specialistId;
    setSelectedId(instrumentalistId);
  };

  const handleConfirm = async () => {
    if (!selectedId) {
      Alert.alert("Notice", "Please select an instrumentalist");
      return;
    }

    // Get selected instrumentalist with full info
    const selected = instrumentalists.find(
      (i) => (i.id || i.specialistId) === selectedId
    );

    if (!selected) {
      Alert.alert("Error", "Selected instrumentalist not found");
      return;
    }

    const selectedInstrumentalist = {
      id: selected.id || selected.specialistId,
      specialistId: selected.specialistId || selected.id,
      name: selected.name || selected.fullName || `Instrumentalist ${selected.id || selected.specialistId}`,
      fullName: selected.fullName || selected.name,
      avatar: selected.avatar || selected.avatarUrl,
      avatarUrl: selected.avatarUrl || selected.avatar,
      gender: selected.gender,
      rating: selected.rating,
      experienceYears: selected.experienceYears,
      hourlyRate: selected.hourlyRate,
    };

    // If from recording flow, save to storage
    if (fromFlow) {
      try {
        const stored = await getItem('recordingFlowData') || {};
        if (!stored.step3) {
          stored.step3 = { instruments: [] };
        }
        if (!stored.step3.instruments) {
          stored.step3.instruments = [];
        }

        // Find and update the instrument with this skillId
        const instrumentIndex = stored.step3.instruments.findIndex(
          inst => inst.skillId === skillId
        );

        const instrumentalistInfo = {
          specialistId: selectedInstrumentalist.specialistId,
          specialistName: selectedInstrumentalist.name,
          hourlyRate: selectedInstrumentalist.hourlyRate || 0,
          avatarUrl: selectedInstrumentalist.avatarUrl,
          rating: selectedInstrumentalist.rating,
          experienceYears: selectedInstrumentalist.experienceYears,
        };

        if (instrumentIndex >= 0) {
          // Update existing instrument
          stored.step3.instruments[instrumentIndex] = {
            ...stored.step3.instruments[instrumentIndex],
            ...instrumentalistInfo,
          };
        } else {
          // Add new instrument entry
          stored.step3.instruments.push({
            skillId,
            skillName,
            performerSource: 'INTERNAL_ARTIST',
            instrumentSource: 'CUSTOMER_SIDE', // Default
            quantity: 1,
            rentalFee: 0,
            ...instrumentalistInfo,
          });
        }

        await setItem('recordingFlowData', stored);
        navigation.navigate('Booking', { screen: 'BookingMain' }); // Navigate back to Booking tab
      } catch (error) {
        console.error('Error saving instrumentalist selection to storage:', error);
        Alert.alert('Error', 'Failed to save instrumentalist selection.');
      }
    } else if (onSelect) {
      onSelect(selectedInstrumentalist);
      navigation.goBack();
    } else {
      navigation.goBack();
    }
  };

  const isSelected = (instrumentalist) => {
    const instrumentalistId = instrumentalist.id || instrumentalist.specialistId;
    return selectedId === instrumentalistId;
  };

  // Set custom back button to navigate to Booking tab
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.navigate('Booking', { screen: 'BookingMain' });
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>Select Instrumentalist</Text>
          <Text style={styles.description}>
            Choose an instrumentalist for {skillName || 'this instrument'}
          </Text>
          
          {effectiveBookingDate && effectiveBookingStartTime && effectiveBookingEndTime && (
            <View style={styles.slotInfo}>
              <Text style={styles.slotInfoTitle}>Selected Slot</Text>
              <View style={styles.slotInfoRow}>
                <Text style={styles.slotInfoLabel}>Date:</Text>
                <Text style={styles.slotInfoValue}>
                  {dayjs(effectiveBookingDate).format('dddd, MMMM DD, YYYY')}
                </Text>
              </View>
              <View style={styles.slotInfoRow}>
                <Text style={styles.slotInfoLabel}>Time:</Text>
                <Text style={styles.slotInfoValue}>
                  {effectiveBookingStartTime} - {effectiveBookingEndTime}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Instrumentalists List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading instrumentalists...</Text>
          </View>
        ) : instrumentalists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No instrumentalists available</Text>
            <Text style={styles.emptySubText}>
              No instrumentalists available for {skillName || 'this instrument'} and the selected time slot
            </Text>
          </View>
        ) : (
          <View style={styles.instrumentalistsList}>
            {instrumentalists.map((instrumentalist) => {
              const instrumentalistId = instrumentalist.id || instrumentalist.specialistId;
              const instrumentalistName = instrumentalist.name || instrumentalist.fullName || `Instrumentalist ${instrumentalistId}`;
              const avatar = instrumentalist.avatar || instrumentalist.avatarUrl;
              const selected = isSelected(instrumentalist);

              return (
                <View
                  key={instrumentalistId}
                  style={[
                    styles.instrumentalistCard,
                    selected && styles.instrumentalistCardSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.instrumentalistCardContent}
                    onPress={() => handleSelect(instrumentalist)}
                  >
                    <View style={styles.instrumentalistInfo}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={32} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <View style={styles.instrumentalistDetails}>
                        <Text style={styles.instrumentalistName}>{instrumentalistName}</Text>
                        {instrumentalist.rating && typeof instrumentalist.rating === 'number' && (
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color={COLORS.warning} />
                            <Text style={styles.ratingText}>
                              {instrumentalist.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {instrumentalist.experienceYears && typeof instrumentalist.experienceYears === 'number' && (
                          <Text style={styles.instrumentalistDetail}>
                            {instrumentalist.experienceYears} years experience
                          </Text>
                        )}
                        {instrumentalist.hourlyRate && typeof instrumentalist.hourlyRate === 'number' && (
                          <Text style={styles.instrumentalistDetail}>
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(instrumentalist.hourlyRate)}
                            /hour
                          </Text>
                        )}
                      </View>
                    </View>
                    {selected && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {instrumentalists.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  slotInfo: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  slotInfoTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  slotInfoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 50,
  },
  slotInfoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  instrumentalistsList: {
    gap: SPACING.md,
  },
  instrumentalistCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instrumentalistCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  instrumentalistCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  instrumentalistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SPACING.md,
    backgroundColor: COLORS.gray[200],
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  instrumentalistDetails: {
    flex: 1,
  },
  instrumentalistName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  ratingText: {
    marginLeft: SPACING.xs / 2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  instrumentalistDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  selectedIndicator: {
    marginLeft: SPACING.sm,
  },
  footer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.white,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
});

export default InstrumentalistSelectionScreen;

