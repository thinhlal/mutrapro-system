import React, { useState, useEffect } from "react";
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
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getVocalists } from "../../services/specialistService";
import { getAvailableArtistsForRequest } from "../../services/studioBookingService";
import { MUSIC_GENRES } from "../../constants/musicOptionsConstants";
import { getItem, setItem } from "../../utils/storage";

const VocalistSelectionScreen = ({ navigation, route }) => {
  const {
    allowMultiple = false,
    maxSelections = 1,
    selectedVocalists = [],
    onSelect,
    fromFlow = false,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
  } = route.params || {};

  const [vocalists, setVocalists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState("ALL"); // ALL, FEMALE, MALE
  const [selectedGenres, setSelectedGenres] = useState([]);
  const selectedVocalist = selectedVocalists?.[0];
  
  const [selectedIds, setSelectedIds] = useState(() => {
    if (allowMultiple && selectedVocalists) {
      return selectedVocalists.map((v) => v.id || v.specialistId || v);
    }
    return selectedVocalist ? [selectedVocalist.id || selectedVocalist.specialistId || selectedVocalist] : [];
  });

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

  // Fetch vocalists with filters
  // Only fetch after booking info is loaded (to avoid fetching all vocalists first)
  useEffect(() => {
    if (bookingInfoLoaded || !fromFlow) {
      fetchVocalists();
    }
  }, [genderFilter, selectedGenres, effectiveBookingDate, effectiveBookingStartTime, effectiveBookingEndTime, bookingInfoLoaded, fromFlow]);

  const fetchVocalists = async () => {
    setLoading(true);
    try {
      const gender = genderFilter !== "ALL" ? genderFilter : null;
      const genres = selectedGenres.length > 0 ? selectedGenres : null;

      // If we have booking date/time, use getAvailableArtistsForRequest to filter by availability
      if (fromFlow && effectiveBookingDate && effectiveBookingStartTime && effectiveBookingEndTime) {
        const response = await getAvailableArtistsForRequest(
          effectiveBookingDate,
          effectiveBookingStartTime,
          effectiveBookingEndTime,
          null, // skillId - null for vocalists
          'VOCAL', // roleType
          genres // genres filter
        );
        
        if (response?.status === 'success' && response?.data) {
          let filteredVocalists = response.data;
          
          // Apply gender filter if needed
          if (gender) {
            filteredVocalists = filteredVocalists.filter(
              v => v.gender === gender
            );
          }
          
          setVocalists(filteredVocalists);
        } else {
          setVocalists([]);
        }
      } else {
        // Fallback: Fetch all vocalists (for arrangement flow or when no booking info)
        const response = await getVocalists(gender, genres);
        if (response?.status === "success" && response?.data) {
          setVocalists(response.data);
        } else if (response?.data) {
          // Handle case where data is directly in response.data
          setVocalists(Array.isArray(response.data) ? response.data : []);
        }
      }
    } catch (error) {
      console.error("Error fetching vocalists:", error);
      Alert.alert("Error", error.message || "Failed to load vocalists");
      setVocalists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (vocalist) => {
    const vocalistId = vocalist.id || vocalist.specialistId;
    const vocalistName = vocalist.name || vocalist.fullName || `Vocalist ${vocalistId}`;

    if (allowMultiple) {
      setSelectedIds((prev) => {
        if (prev.includes(vocalistId)) {
          // Deselect
          return prev.filter((id) => id !== vocalistId);
        } else {
          // Select (check max limit)
          if (prev.length >= maxSelections) {
            Alert.alert("Notice", `You can select up to ${maxSelections} vocalists`);
            return prev;
          }
          return [...prev, vocalistId];
        }
      });
    } else {
      // Single selection
      setSelectedIds([vocalistId]);
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      Alert.alert("Notice", "Please select at least one vocalist");
      return;
    }

    // Get selected vocalists with full info
    const selected = vocalists
      .filter((v) => selectedIds.includes(v.id || v.specialistId))
      .map((v) => ({
        id: v.id || v.specialistId,
        specialistId: v.specialistId || v.id,
        name: v.name || v.fullName || `Vocalist ${v.id || v.specialistId}`,
        fullName: v.fullName || v.name,
        avatar: v.avatar || v.avatarUrl,
        avatarUrl: v.avatarUrl || v.avatar,
        gender: v.gender,
        rating: v.rating,
        experienceYears: v.experienceYears,
        hourlyRate: v.hourlyRate,
      }));

    // If from recording flow, save to storage
    if (fromFlow) {
      try {
        const stored = await getItem('recordingFlowData') || {};
        stored.step2 = {
          ...stored.step2,
          selectedVocalists: selected,
        };
        await setItem('recordingFlowData', stored);
        
        // Navigate back to Booking tab
        navigation.navigate('Booking');
      } catch (error) {
        console.error('Error saving vocalists to flow data:', error);
        // Fallback to callback if storage fails
        if (onSelect) {
          onSelect(selected);
        }
        navigation.goBack();
      }
    } else {
      // Normal flow - use callback
      if (onSelect) {
        onSelect(selected);
      }
      navigation.goBack();
    }
  };

  const isSelected = (vocalist) => {
    const vocalistId = vocalist.id || vocalist.specialistId;
    return selectedIds.includes(vocalistId);
  };

  const availableGenres = MUSIC_GENRES.map((g) => g.value);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Preferred Vocalist</Text>
        <View style={styles.placeholder} />
      </View> */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.filtersCard}>
          <Text style={styles.filterLabel}>Filter by gender:</Text>
          <View style={styles.genderFilterContainer}>
            {["ALL", "FEMALE", "MALE"].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderFilterButton,
                  genderFilter === gender && styles.genderFilterButtonSelected,
                ]}
                onPress={() => setGenderFilter(gender)}
              >
                <Text
                  style={[
                    styles.genderFilterText,
                    genderFilter === gender && styles.genderFilterTextSelected,
                  ]}
                >
                  {gender === "ALL" ? "All" : gender === "FEMALE" ? "Female" : "Male"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterLabel, { marginTop: SPACING.md }]}>
            Filter by genre:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.genresContainer}
          >
            {availableGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreTag,
                    isSelected && styles.genreTagSelected,
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
                    } else {
                      setSelectedGenres([...selectedGenres, genre]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.genreTagText,
                      isSelected && styles.genreTagTextSelected,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.resultCount}>
            ({vocalists.length} vocalist{vocalists.length !== 1 ? "s" : ""})
          </Text>
        </View>

        {/* Vocalists List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading vocalists...</Text>
          </View>
        ) : vocalists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No vocalists found</Text>
          </View>
        ) : (
          <View style={styles.vocalistsList}>
            {vocalists.map((vocalist) => {
              const vocalistId = vocalist.id || vocalist.specialistId;
              const vocalistName = vocalist.name || vocalist.fullName || `Vocalist ${vocalistId}`;
              const avatar = vocalist.avatar || vocalist.avatarUrl;
              const selected = isSelected(vocalist);

              return (
                <View
                  key={vocalistId}
                  style={[
                    styles.vocalistCard,
                    selected && styles.vocalistCardSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.vocalistCardContent}
                    onPress={() => handleSelect(vocalist)}
                  >
                    <View style={styles.vocalistInfo}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={32} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <View style={styles.vocalistDetails}>
                        <Text style={styles.vocalistName}>{vocalistName}</Text>
                        {vocalist.gender && (
                          <Text style={styles.vocalistGender}>
                        {vocalist.gender === "FEMALE" ? "Female" : "Male"}
                          </Text>
                        )}
                      </View>
                    </View>
                    {selected && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => {
                      navigation.navigate("VocalistDetail", {
                        specialistId: vocalistId,
                        vocalist: vocalist,
                      });
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer with Confirm Button */}
      {selectedIds.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.selectedCount}>
            Selected: {selectedIds.length}
            {allowMultiple && maxSelections > 1 ? ` / ${maxSelections}` : ""}
          </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  filtersCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  genderFilterContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  genderFilterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  genderFilterButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderFilterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  genderFilterTextSelected: {
    color: COLORS.white,
  },
  genresContainer: {
    marginTop: SPACING.sm,
  },
  genreTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  genreTagSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  genreTagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  genreTagTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  resultCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  vocalistsList: {
    gap: SPACING.md,
  },
  vocalistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: SPACING.sm,
  },
  vocalistCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  detailButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  vocalistCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  vocalistInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  vocalistDetails: {
    flex: 1,
  },
  vocalistName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  vocalistGender: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  selectedBadge: {
    marginLeft: SPACING.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedCount: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
});

export default VocalistSelectionScreen;

