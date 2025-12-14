import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../../config/constants';
import { useRecordingFlow } from '../../context/RecordingFlowContext';
import { getAvailableArtistsForRequest } from '../../services/studioBookingService';

const VOCAL_CHOICES = {
  NONE: 'NONE',
  CUSTOMER_SELF: 'CUSTOMER_SELF',
  INTERNAL_ARTIST: 'INTERNAL_ARTIST',
  BOTH: 'BOTH',
};

const RecordingVocalScreen = ({ navigation }) => {
  const { state, update } = useRecordingFlow();
  const { bookingDate, bookingStartTime, bookingEndTime, step2 } = state;

  const [vocalChoice, setVocalChoice] = useState(step2?.vocalChoice || VOCAL_CHOICES.NONE);
  const [loading, setLoading] = useState(false);
  const [vocalists, setVocalists] = useState([]);
  const [selectedIds, setSelectedIds] = useState(
    step2?.selectedVocalists?.map((v) => v.specialistId) || []
  );
  const [selectedVocalists, setSelectedVocalists] = useState(step2?.selectedVocalists || []);

  // Fetch available vocalists when user chooses to hire internal artists
  useEffect(() => {
    const needsVocalists =
      vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICES.BOTH;

    if (!needsVocalists) {
      setVocalists([]);
      return;
    }

    if (!bookingDate || !bookingStartTime || !bookingEndTime) {
      setVocalists([]);
      return;
    }

    const fetchVocalists = async () => {
      try {
        setLoading(true);
        const response = await getAvailableArtistsForRequest(
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          null, // skillId = null for vocalists
          'VOCAL', // roleType
          null // genres (optional)
        );

        if (response?.status === 'success' && response?.data) {
          setVocalists(response.data);
        } else if (Array.isArray(response?.data)) {
          setVocalists(response.data);
        } else {
          setVocalists([]);
        }
      } catch (error) {
        console.error('Error fetching vocalists:', error);
        Alert.alert('Error', error?.message || 'Failed to load vocalist list');
        setVocalists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVocalists();
  }, [vocalChoice, bookingDate, bookingStartTime, bookingEndTime]);

  const toggleSelect = (v) => {
    const id = v.specialistId || v.id;
    const exists = selectedIds.includes(id);
    if (exists) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleContinue = () => {
    if (
      (vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST || vocalChoice === VOCAL_CHOICES.BOTH) &&
      selectedIds.length === 0
    ) {
      Alert.alert('Validation', 'Please select at least one vocalist.');
      return;
    }
    const selectedVocalistsMapped =
      vocalists
        .filter((v) => selectedIds.includes(v.specialistId || v.id))
        .map((v) => ({
          specialistId: v.specialistId || v.id,
          name: v.name || v.fullName || `Vocalist ${v.specialistId || v.id}`,
          hourlyRate: v.hourlyRate,
          isAvailable: v.isAvailable !== false,
        })) || selectedVocalists;

    update({
      step2: {
        vocalChoice,
        selectedVocalists: selectedVocalistsMapped,
      },
      hasVocalist: vocalChoice !== VOCAL_CHOICES.NONE,
    });
    navigation.navigate('RecordingInstrument');
  };

  const openSelectionScreen = () => {
    navigation.navigate('RecordingVocalistSelect', {
      allowMultiple: true,
      maxSelections: 5,
      selectedVocalists,
      onSelect: (selected) => {
        setSelectedVocalists(selected);
        setSelectedIds(selected.map((v) => v.specialistId || v.id));
      },
    });
  };

  const choiceCard = (value, title, description) => (
    <TouchableOpacity
      style={[
        styles.choiceCard,
        vocalChoice === value && styles.choiceCardSelected,
      ]}
      onPress={() => setVocalChoice(value)}
    >
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceDesc}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vocal Setup</Text>
      <Text style={styles.subtitle}>Who will sing in this session?</Text>

      <View style={styles.section}>
        {choiceCard(VOCAL_CHOICES.NONE, 'No vocal', 'Instrumental / playback only')}
        {choiceCard(VOCAL_CHOICES.CUSTOMER_SELF, 'I will sing', 'Self-performance')}
        {choiceCard(VOCAL_CHOICES.INTERNAL_ARTIST, 'Hire in-house vocalist', 'We will book a vocalist')}
        {choiceCard(
          VOCAL_CHOICES.BOTH,
          'I sing + hire vocalist(s)',
          'Combine your vocal with backing/duet'
        )}
      </View>

      {(vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
        vocalChoice === VOCAL_CHOICES.BOTH) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Vocalist</Text>
          <Text style={styles.helperText}>
            {vocalChoice === VOCAL_CHOICES.BOTH
              ? 'Select vocalists to support you (backing/duet)'
              : 'Choose a professional vocalist for the session'}
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={openSelectionScreen}>
            <Text style={styles.secondaryButtonText}>Browse & Select</Text>
          </TouchableOpacity>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.helperText}>Loading vocalists...</Text>
            </View>
          ) : vocalists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.helperText}>No vocalists available for this slot</Text>
            </View>
          ) : (
            <>
              <View style={styles.successAlert}>
                <Text style={styles.successText}>
                  Found {vocalists.length} vocalist{vocalists.length > 1 ? 's' : ''} available
                </Text>
              </View>
              {vocalists.map((vocalist) => {
                const id = vocalist.specialistId || vocalist.id;
                const selected = selectedIds.includes(id);
                const isAvailable = vocalist.isAvailable !== false;
                const name = vocalist.name || vocalist.fullName || `Vocalist ${id}`;

                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.vocalistCard,
                      selected && styles.vocalistCardSelected,
                      !isAvailable && styles.vocalistCardUnavailable,
                    ]}
                    onPress={() => isAvailable && toggleSelect(vocalist)}
                    disabled={!isAvailable}
                  >
                    <View style={styles.vocalistHeader}>
                      {vocalist.avatarUrl ? (
                        <Image
                          source={{ uri: vocalist.avatarUrl }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <View style={styles.vocalistInfo}>
                        <View style={styles.vocalistNameRow}>
                          <Text style={styles.vocalistName}>{name}</Text>
                          {selected && (
                            <Ionicons name="checkmark-circle" size={20} color="#52c41a" />
                          )}
                          {!isAvailable && (
                            <View style={styles.busyTag}>
                              <Text style={styles.busyTagText}>Busy</Text>
                            </View>
                          )}
                        </View>
                        {vocalist.role && (
                          <Text style={styles.vocalistDetail}>Role: {vocalist.role}</Text>
                        )}
                        {vocalist.experienceYears && (
                          <Text style={styles.vocalistDetail}>
                            Experience: {vocalist.experienceYears} years
                          </Text>
                        )}
                        {vocalist.genres && vocalist.genres.length > 0 && (
                          <View style={styles.genresContainer}>
                            {vocalist.genres.slice(0, 3).map((genre, idx) => (
                              <View key={idx} style={[styles.genreTag, idx > 0 && { marginLeft: SPACING.xs }]}>
                                <Text style={styles.genreText}>{genre}</Text>
                              </View>
                            ))}
                            {vocalist.genres.length > 3 && (
                              <Text style={[styles.genreMore, { marginLeft: SPACING.xs }]}>+{vocalist.genres.length - 3}</Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.vocalistFooter}>
                      <View style={styles.vocalistStats}>
                        {vocalist.rating != null && (
                          <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={16} color="#faad14" />
                            <Text style={styles.ratingText}>
                              {typeof vocalist.rating === 'number' 
                                ? vocalist.rating.toFixed(1) 
                                : parseFloat(vocalist.rating || 0).toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {vocalist.totalProjects && (
                          <Text style={[styles.projectsText, vocalist.rating && { marginLeft: SPACING.sm }]}>
                            {vocalist.totalProjects} projects
                          </Text>
                        )}
                      </View>
                      <Text style={styles.hourlyRate}>
                        {vocalist.hourlyRate != null && vocalist.hourlyRate > 0
                          ? `${Number(vocalist.hourlyRate).toLocaleString('vi-VN')} VND/hr`
                          : '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {selectedIds.length > 0 && (
                <View style={styles.selectedSummary}>
                  <Text style={styles.selectedSummaryTitle}>
                    Selected Vocalist{selectedIds.length > 1 ? 's' : ''} ({selectedIds.length}):
                  </Text>
                  <View style={styles.selectedTags}>
                    {vocalists
                      .filter((v) => selectedIds.includes(v.specialistId || v.id))
                      .map((v) => (
                        <View key={v.specialistId || v.id} style={styles.selectedTag}>
                          <Text style={styles.selectedTagText}>
                            {v.name || v.fullName || `Vocalist ${v.specialistId || v.id}`}
                          </Text>
                          <TouchableOpacity
                            onPress={() => toggleSelect(v)}
                            style={styles.removeTagButton}
                          >
                            <Ionicons name="close" size={16} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
            vocalChoice === VOCAL_CHOICES.BOTH) &&
            (loading || selectedIds.length === 0) && { opacity: 0.5 },
        ]}
        onPress={handleContinue}
        disabled={
          (vocalChoice === VOCAL_CHOICES.INTERNAL_ARTIST ||
            vocalChoice === VOCAL_CHOICES.BOTH) &&
          (loading || selectedIds.length === 0)
        }
      >
        <Text style={styles.primaryButtonText}>Continue to Instrument Setup</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  choiceCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  choiceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  choiceTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  choiceDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  vocalistRow: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vocalistRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  vocalistName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successAlert: {
    backgroundColor: '#f6ffed',
    borderColor: '#b7eb8f',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: '#52c41a',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  vocalistCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  vocalistCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  vocalistCardUnavailable: {
    opacity: 0.6,
  },
  vocalistHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  vocalistInfo: {
    flex: 1,
  },
  vocalistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  vocalistName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  busyTag: {
    backgroundColor: '#ff4d4f',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  busyTagText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  vocalistDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  genreTag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  genreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
  },
  genreMore: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    alignSelf: 'center',
  },
  vocalistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vocalistStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  projectsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  hourlyRate: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectedSummary: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
  },
  selectedSummaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectedTagText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  removeTagButton: {
    padding: 2,
  },
});

export default RecordingVocalScreen;

