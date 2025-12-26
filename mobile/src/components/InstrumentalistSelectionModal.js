import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Audio } from "expo-av";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";
import { getAvailableArtistsForRequest } from "../services/studioBookingService";
import { getSpecialistDetail } from "../services/specialistService";
import { getSpecialistAverageRating, getSpecialistReviews } from "../services/reviewService";

const InstrumentalistSelectionModal = ({
  visible,
  onClose,
  onConfirm,
  skillId,
  skillName,
  bookingDate,
  bookingStartTime,
  bookingEndTime,
  selectedInstrumentalistId = null,
}) => {
  const [instrumentalists, setInstrumentalists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(selectedInstrumentalistId);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInstrumentalistForDetail, setSelectedInstrumentalistForDetail] = useState(null);

  // Sync selectedId with selectedInstrumentalistId prop when modal opens or prop changes
  useEffect(() => {
    if (visible) {
      setSelectedId(selectedInstrumentalistId);
    }
  }, [visible, selectedInstrumentalistId]);

  // Fetch instrumentalists
  useEffect(() => {
    if (visible && skillId && bookingDate && bookingStartTime && bookingEndTime) {
      fetchInstrumentalists();
    }
  }, [visible, skillId, bookingDate, bookingStartTime, bookingEndTime]);

  const fetchInstrumentalists = async () => {
    setLoading(true);
    try {
      const response = await getAvailableArtistsForRequest(
        bookingDate,
        bookingStartTime,
        bookingEndTime,
        skillId,
        "INSTRUMENT",
        null // genres - not applicable for instrumentalists
      );

      if (response?.status === "success" && response?.data) {
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

  const handleSelect = (instrumentalistId) => {
    setSelectedId(instrumentalistId);
  };

  const handleConfirm = () => {
    if (!selectedId) {
      Alert.alert("Notice", "Please select an instrumentalist");
      return;
    }

    const selected = instrumentalists.find((i) => (i.id || i.specialistId) === selectedId);

    if (!selected) {
      Alert.alert("Error", "Selected instrumentalist not found");
      return;
    }

    const selectedInstrumentalist = {
      specialistId: selected.specialistId || selected.id,
      specialistName: selected.name || selected.fullName || `Instrumentalist ${selected.id || selected.specialistId}`,
      hourlyRate: selected.hourlyRate || 0,
      avatarUrl: selected.avatarUrl || selected.avatar,
      rating: selected.rating,
      experienceYears: selected.experienceYears,
    };

    onConfirm(selectedInstrumentalist);
  };

  const handleViewDetail = (instrumentalist) => {
    setSelectedInstrumentalistForDetail(instrumentalist);
    setShowDetailModal(true);
  };

  const isSelected = (instrumentalistId) => {
    return selectedId === instrumentalistId;
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Instrumentalist</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Instrumentalists List */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
            instrumentalists.map((instrumentalist) => {
              const instrumentalistId = instrumentalist.id || instrumentalist.specialistId;
              const isInstrumentalistSelected = isSelected(instrumentalistId);
              const avatar = instrumentalist.avatarUrl || instrumentalist.avatar;

              return (
                <View
                  key={instrumentalistId}
                  style={[
                    styles.instrumentalistCard,
                    isInstrumentalistSelected && styles.instrumentalistCardSelected,
                  ]}
                >
                  {/* Khối trên: Avatar + Info */}
                  <View style={styles.instrumentalistTopSection}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={30} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <View style={styles.instrumentalistInfo}>
                      <Text style={styles.instrumentalistName}>
                        {instrumentalist.name || instrumentalist.fullName || `Instrumentalist ${instrumentalistId}`}
                      </Text>
                      {instrumentalist.gender && (
                        <Text style={styles.experience}>
                          <Text style={styles.label}>Gender: </Text>
                          {instrumentalist.gender === "FEMALE" ? "Female" : "Male"}
                        </Text>
                      )}
                      {instrumentalist.rating && (
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color={COLORS.warning} />
                          <Text style={styles.rating}>
                            <Text style={styles.label}>Rating: </Text>
                            {instrumentalist.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                      {instrumentalist.experienceYears && (
                        <Text style={styles.experience}>
                          <Text style={styles.label}>Experience: </Text>
                          {instrumentalist.experienceYears} years
                        </Text>
                      )}
                      {instrumentalist.hourlyRate && (
                        <Text style={styles.rate}>
                          <Text style={styles.label}>Rate: </Text>
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(instrumentalist.hourlyRate)}
                          /hour
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Khối dưới: Description + Genres + Buttons (full width) */}
                  <View style={styles.instrumentalistBottomSection}>
                    {/* Description */}
                    {instrumentalist.bio && (
                      <Text style={styles.instrumentalistDescription} numberOfLines={2} ellipsizeMode="tail">
                        {instrumentalist.bio}
                      </Text>
                    )}
                    {/* Genres */}
                    {instrumentalist.genres && instrumentalist.genres.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.instrumentalistGenresContainer}
                        contentContainerStyle={styles.instrumentalistGenresContent}
                      >
                        {instrumentalist.genres.map((genre, idx) => (
                          <View key={idx} style={styles.instrumentalistGenreTag}>
                            <Text style={styles.instrumentalistGenreText}>{genre}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    {/* Action Buttons */}
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[
                          styles.selectButton,
                          isInstrumentalistSelected && styles.selectButtonSelected
                        ]}
                        onPress={() => handleSelect(instrumentalistId)}
                      >
                        {isInstrumentalistSelected ? (
                          <>
                            <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                            <Text style={styles.selectButtonTextSelected}>Selected</Text>
                          </>
                        ) : (
                          <Text style={styles.selectButtonText}>Select</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.detailButton}
                        onPress={() => handleViewDetail(instrumentalist)}
                      >
                        <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.detailButtonText}>Detail</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Action Buttons */}
        {selectedId && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>

      {/* Instrumentalist Detail Modal */}
      {showDetailModal && selectedInstrumentalistForDetail && (
        <InstrumentalistDetailModal
          visible={showDetailModal}
          instrumentalist={selectedInstrumentalistForDetail}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInstrumentalistForDetail(null);
          }}
        />
      )}
    </>
  );
};

// ExpandableTagsSection Component
const ExpandableTagsSection = ({ title, items, tagStyle, textStyle }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <View style={detailStyles.expandableSection}>
      <View style={detailStyles.expandableHeader}>
        <Text style={detailStyles.expandableTitle}>{title}:</Text>
        <TouchableOpacity
          style={detailStyles.viewModeToggle}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Ionicons
            name={isExpanded ? "grid-outline" : "list-outline"}
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>
      
      {!isExpanded ? (
        // Horizontal Scroll View
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={detailStyles.expandableHorizontalScroll}
          contentContainerStyle={detailStyles.expandableHorizontalContent}
        >
          {items.map((item, idx) => (
            <View key={idx} style={[detailStyles.expandableTagButton, tagStyle]}>
              <Text style={[detailStyles.expandableTagText, textStyle]}>{item}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        // Expanded List View (Vertical)
        <View style={detailStyles.expandableList}>
          {items.map((item, idx) => (
            <View key={idx} style={[detailStyles.expandableTagButtonVertical, tagStyle]}>
              <Text style={[detailStyles.expandableTagText, textStyle]}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// InstrumentalistDetailModal Component
const InstrumentalistDetailModal = ({ visible, instrumentalist, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [playingDemoId, setPlayingDemoId] = useState(null);
  const [sound, setSound] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    if (visible && instrumentalist) {
      fetchDetail();
    }
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, instrumentalist]);

  const fetchDetail = async () => {
    const id = instrumentalist?.id || instrumentalist?.specialistId;
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getSpecialistDetail(id);
      const apiResponse = response?.data || response;
      const data = apiResponse?.data || apiResponse;
      
      if (data) {
        setDetailData(data);
        // Load rating and reviews
        const specialistId = data.specialist?.specialistId || id;
        if (specialistId) {
          loadRatingAndReviews(specialistId);
        }
      }
    } catch (error) {
      console.error("Error fetching specialist detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRatingAndReviews = async (specialistId) => {
    try {
      // Load average rating
      const ratingValue = await getSpecialistAverageRating(specialistId);
      if (ratingValue !== null && ratingValue !== undefined && !isNaN(ratingValue)) {
        setAverageRating(ratingValue);
      } else {
        setAverageRating(null);
      }

      // Load reviews
      setReviewsLoading(true);
      const reviewsResponse = await getSpecialistReviews(specialistId, {
        page: 0,
        size: 10,
      });
      if (reviewsResponse?.status === 'success' && reviewsResponse?.data) {
        if (reviewsResponse.data.content) {
          setReviews(reviewsResponse.data.content);
        } else if (Array.isArray(reviewsResponse.data)) {
          setReviews(reviewsResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading rating and reviews:', error);
      setAverageRating(null);
    } finally {
      setReviewsLoading(false);
    }
  };

  const playAudio = async (demo) => {
    if (!demo.previewUrl) {
      Alert.alert("Notification", "This demo has no audio preview");
      return;
    }

    try {
      // Stop current audio if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // If clicking the same demo, stop it
      if (playingDemoId === demo.demoId) {
        setPlayingDemoId(null);
        return;
      }

      // Play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: demo.previewUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingDemoId(demo.demoId);

      // Auto stop when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingDemoId(null);
          setSound(null);
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert("Error", "Unable to play audio");
    }
  };

  if (!instrumentalist) return null;

  const specialist = detailData?.specialist || instrumentalist;
  const allSkills = detailData?.skills || [];
  const vocalSkills = allSkills.filter(s => s.skill?.recordingCategory === 'VOCAL');
  const instrumentSkills = allSkills.filter(s => s.skill?.recordingCategory === 'INSTRUMENT');
  const demos = detailData?.demos || [];
  const genres = specialist.genres || [];
  const credits = specialist.credits || [];
  const bio = specialist.bio || "";
  const avatar = specialist.avatarUrl || specialist.avatar || instrumentalist.avatarUrl || instrumentalist.avatar;

  // Use average rating from review service if available, otherwise fallback to specialist.rating
  const displayRating =
    averageRating !== null
      ? averageRating
      : specialist?.rating
        ? parseFloat(specialist.rating)
        : 0;
  const displayReviewsCount =
    reviews.length > 0 ? reviews.length : specialist?.reviews || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={detailStyles.container}>
        <View style={detailStyles.header}>
          <TouchableOpacity style={detailStyles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={detailStyles.headerTitle}>Instrumentalist Details</Text>
          <View style={detailStyles.placeholder} />
        </View>

        {loading ? (
          <View style={detailStyles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={detailStyles.loadingText}>Loading details...</Text>
          </View>
        ) : (
          <ScrollView style={detailStyles.scrollView} contentContainerStyle={detailStyles.content}>
            {/* Profile Section */}
            <View style={detailStyles.profileCard}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={detailStyles.avatar} />
              ) : (
                <View style={detailStyles.avatarPlaceholder}>
                  <Ionicons name="person" size={60} color={COLORS.textSecondary} />
                </View>
              )}
              <Text style={detailStyles.name}>
                {specialist.name || specialist.fullName || `Instrumentalist ${specialist.id || specialist.specialistId}`}
              </Text>

              {specialist.gender && (
                <Text style={detailStyles.detailText}>
                  Gender: {specialist.gender === "FEMALE" ? "Female" : "Male"}
                </Text>
              )}

              {displayRating > 0 && (
                <View style={detailStyles.ratingContainer}>
                  <Ionicons name="star" size={20} color={COLORS.warning} />
                  <Text style={detailStyles.ratingText}>{displayRating.toFixed(1)}</Text>
                  <Text style={detailStyles.reviewsCount}>({displayReviewsCount} reviews)</Text>
                </View>
              )}

              {specialist.experienceYears && (
                <Text style={detailStyles.detailText}>
                  Experience: {specialist.experienceYears} years
                </Text>
              )}

              {specialist.hourlyRate && (
                <Text style={detailStyles.detailText}>
                  Rate: {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(specialist.hourlyRate)}
                  /hour
                </Text>
              )}

              {/* Tabs */}
              <View style={detailStyles.tabsContainer}>
                <TouchableOpacity
                  style={[detailStyles.tab, activeTab === '1' && detailStyles.tabActive]}
                  onPress={() => setActiveTab('1')}
                >
                  <Text style={[detailStyles.tabText, activeTab === '1' && detailStyles.tabTextActive]}>
                    Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[detailStyles.tab, activeTab === '2' && detailStyles.tabActive]}
                  onPress={() => setActiveTab('2')}
                >
                  <Text style={[detailStyles.tabText, activeTab === '2' && detailStyles.tabTextActive]}>
                    Reviews ({displayReviewsCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[detailStyles.tab, activeTab === '3' && detailStyles.tabActive]}
                  onPress={() => setActiveTab('3')}
                >
                  <Text style={[detailStyles.tabText, activeTab === '3' && detailStyles.tabTextActive]}>
                    Demos ({demos.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTab === '1' && (
                <View style={detailStyles.tabContent}>
                  {/* Bio */}
                  {bio && (
                    <View style={detailStyles.section}>
                      <Text style={detailStyles.sectionTitle}>About</Text>
                      <Text style={detailStyles.bioText}>{bio}</Text>
                    </View>
                  )}

                  {/* Genres - Expandable */}
                  {genres.length > 0 && (
                    <ExpandableTagsSection
                      title="Genres"
                      items={genres}
                    />
                  )}

                  {/* Credits */}
                  {credits.length > 0 && (
                    <View style={detailStyles.section}>
                      <Text style={detailStyles.sectionTitle}>Credits</Text>
                      <View style={detailStyles.tagsContainer}>
                        {credits.map((credit, idx) => (
                          <View key={idx} style={detailStyles.tag}>
                            <Text style={detailStyles.tagText}>{credit}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Vocal Skills - Expandable */}
                  {vocalSkills.length > 0 && (
                    <ExpandableTagsSection
                      title="Vocal Skills"
                      items={vocalSkills.map(skillItem => {
                        const skill = skillItem.skill || skillItem;
                        return skill ? (skill.skillName || skill.name) : null;
                      }).filter(Boolean)}
                    />
                  )}

                  {/* Instrument Skills - Expandable */}
                  {instrumentSkills.length > 0 && (
                    <ExpandableTagsSection
                      title="Instrument Skills"
                      items={instrumentSkills.map(skillItem => {
                        const skill = skillItem.skill || skillItem;
                        return skill ? (skill.skillName || skill.name) : null;
                      }).filter(Boolean)}
                    />
                  )}
                </View>
              )}

              {/* Reviews Tab */}
              {activeTab === '2' && (
                <View style={detailStyles.tabContent}>
                  {reviewsLoading ? (
                    <View style={detailStyles.loadingContainer}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                  ) : reviews.length === 0 ? (
                    <View style={detailStyles.emptyContainer}>
                      <Text style={detailStyles.emptyText}>No reviews yet</Text>
                    </View>
                  ) : (
                    <View style={detailStyles.reviewsList}>
                      {reviews.map((review) => (
                        <View key={review.reviewId} style={detailStyles.reviewItem}>
                          <View style={detailStyles.reviewHeader}>
                            <View style={detailStyles.reviewRating}>
                              <Ionicons name="star" size={16} color={COLORS.warning} />
                              <Text style={detailStyles.reviewRatingText}>{review.rating} / 5</Text>
                            </View>
                            {review.specialistName && (
                              <Text style={detailStyles.reviewAuthor}>by {review.specialistName}</Text>
                            )}
                          </View>
                          {review.comment && (
                            <Text style={detailStyles.reviewComment}>{review.comment}</Text>
                          )}
                          {review.reviewType && (
                            <Text style={detailStyles.reviewType}>
                              {review.reviewType === 'TASK' ? 'Task Review' : 'Participant Review'}
                            </Text>
                          )}
                          {review.createdAt && (
                            <Text style={detailStyles.reviewDate}>
                              {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Demos Tab */}
              {activeTab === '3' && (
                <View style={detailStyles.tabContent}>
                  {demos.length === 0 ? (
                    <View style={detailStyles.emptyContainer}>
                      <Ionicons name="musical-note-outline" size={48} color={COLORS.textSecondary} />
                      <Text style={detailStyles.emptyText}>No demos available</Text>
                    </View>
                  ) : (
                    <View style={detailStyles.demosList}>
                      {demos.map((demo, idx) => {
                        const isPlaying = playingDemoId === demo.demoId;
                        return (
                          <View key={demo.demoId || idx} style={detailStyles.demoItem}>
                            <View style={detailStyles.demoHeader}>
                              <Text style={detailStyles.demoTitle}>{demo.title || "Untitled"}</Text>
                              {demo.skill && (
                                <View style={[
                                  detailStyles.demoSkillTag,
                                  demo.recordingRole === 'VOCALIST' && detailStyles.demoSkillTagOrange
                                ]}>
                                  <Text style={[
                                    detailStyles.demoSkillText,
                                    demo.recordingRole === 'VOCALIST' && detailStyles.demoSkillTextOrange
                                  ]}>
                                    {demo.skill.skillName || demo.skill.name}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {demo.description && (
                              <Text style={detailStyles.demoDescription}>{demo.description}</Text>
                            )}
                            {demo.genres && demo.genres.length > 0 && (
                              <View style={detailStyles.demoGenres}>
                                {demo.genres.map((genre, genreIdx) => (
                                  <View key={genreIdx} style={detailStyles.demoGenreTag}>
                                    <Text style={detailStyles.demoGenreText}>{genre}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                            {demo.previewUrl ? (
                              <TouchableOpacity
                                style={detailStyles.audioButton}
                                onPress={() => playAudio(demo)}
                              >
                                <Ionicons
                                  name={isPlaying ? "pause-circle" : "play-circle"}
                                  size={24}
                                  color={COLORS.primary}
                                />
                                <Text style={detailStyles.audioButtonText}>
                                  {isPlaying ? "Playing..." : "Play demo"}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={detailStyles.noPreviewText}>No preview available</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
  slotInfoCard: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  slotInfoTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  slotInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  skillName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.md,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  instrumentalistCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  instrumentalistCardSelected: {
    borderColor: COLORS.primary,
  },
  instrumentalistTopSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  instrumentalistBottomSection: {
    width: "100%",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.gray[200],
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  instrumentalistInfo: {
    flex: 1,
  },
  instrumentalistName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  rating: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  experience: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  rate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionContainer: {
    flexDirection: "row",
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
  label: {
    fontWeight: "600",
    color: COLORS.text,
  },
  instrumentalistGenresContainer: {
    marginBottom: SPACING.sm,
  },
  instrumentalistGenresContent: {
    paddingRight: SPACING.xs,
  },
  instrumentalistGenreTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.xs,
  },
  instrumentalistGenreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: "500",
  },
  instrumentalistDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  selectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs / 2,
  },
  selectButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.text,
  },
  selectButtonTextSelected: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.white,
  },
  detailButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs / 2,
  },
  detailButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

// Detail Modal Styles
const detailStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: SPACING.xl,
    },
    loadingText: {
      marginTop: SPACING.md,
      fontSize: FONT_SIZES.base,
      color: COLORS.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: SPACING.md,
    },
    profileCard: {
      backgroundColor: COLORS.white,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.lg,
      alignItems: "center",
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: SPACING.md,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: COLORS.gray[200],
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.md,
    },
    name: {
      fontSize: FONT_SIZES.lg,
      fontWeight: "700",
      color: COLORS.text,
      marginBottom: SPACING.sm,
      textAlign: "center",
    },
    detailText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      marginBottom: SPACING.xs,
      textAlign: "center",
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: SPACING.md,
    },
    ratingText: {
      fontSize: FONT_SIZES.base,
      fontWeight: "600",
      color: COLORS.text,
      marginLeft: SPACING.xs,
    },
    reviewsCount: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      marginLeft: SPACING.xs,
    },
    tabsContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.sm,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: COLORS.primary,
    },
    tabText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
    },
    tabTextActive: {
      color: COLORS.primary,
      fontWeight: "600",
    },
    tabContent: {
      width: "100%",
      marginTop: SPACING.md,
    },
    section: {
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: "600",
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    bioText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: SPACING.xs,
    },
    tag: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: COLORS.primary,
      marginRight: SPACING.xs,
      marginBottom: SPACING.xs,
    },
    tagOrange: {
      backgroundColor: COLORS.primary,
    },
    tagBlue: {
      backgroundColor: COLORS.primary,
    },
    tagText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.white,
    },
    tagTextOrange: {
      color: COLORS.white,
    },
    tagTextBlue: {
      color: COLORS.white,
    },
    expandableSection: {
      width: "100%",
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    expandableHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.sm,
    },
    expandableTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: "700",
      color: COLORS.text,
      flex: 1,
    },
    viewModeToggle: {
      padding: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.primary + "15",
    },
    expandableHorizontalScroll: {
      marginTop: SPACING.xs,
    },
    expandableHorizontalContent: {
      flexDirection: "row",
      paddingVertical: SPACING.xs,
      paddingRight: SPACING.md,
    },
    expandableTagButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.primary,
      borderWidth: 1,
      borderColor: COLORS.primary,
      marginRight: SPACING.sm,
    },
    expandableTagButtonVertical: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.primary,
      borderWidth: 1,
      borderColor: COLORS.primary,
      width: "100%",
      marginBottom: SPACING.sm,
    },
    expandableTagText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: "400",
      color: COLORS.white,
    },
    expandableList: {
      flexDirection: "column",
      marginTop: SPACING.xs,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: SPACING.xl,
    },
    emptyText: {
      fontSize: FONT_SIZES.base,
      color: COLORS.textSecondary,
      marginTop: SPACING.md,
    },
    reviewsList: {
      marginTop: SPACING.md,
    },
    reviewItem: {
      padding: SPACING.md,
      backgroundColor: COLORS.gray[50],
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: SPACING.xs,
    },
    reviewRating: {
      flexDirection: "row",
      alignItems: "center",
    },
    reviewRatingText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: "600",
      color: COLORS.text,
      marginLeft: SPACING.xs,
    },
    reviewAuthor: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      marginLeft: SPACING.md,
    },
    reviewComment: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    reviewType: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      marginTop: SPACING.xs,
    },
    reviewDate: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      marginTop: SPACING.xs,
    },
    demosList: {
      marginTop: SPACING.md,
    },
    demoItem: {
      padding: SPACING.md,
      backgroundColor: COLORS.gray[50],
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    },
    demoHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.xs,
    },
    demoTitle: {
      fontSize: FONT_SIZES.sm,
      fontWeight: "600",
      color: COLORS.text,
      flex: 1,
    },
    demoSkillTag: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs / 2,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.primary,
    },
    demoSkillTagOrange: {
      backgroundColor: COLORS.primary,
    },
    demoSkillText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.white,
    },
    demoSkillTextOrange: {
      color: COLORS.white,
    },
    demoDescription: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      marginBottom: SPACING.sm,
    },
    demoGenres: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: SPACING.sm,
    },
    demoGenreTag: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs / 2,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.primary,
      marginRight: SPACING.xs,
      marginBottom: SPACING.xs,
    },
    demoGenreText: {
      fontSize: FONT_SIZES.xs,
      color: COLORS.white,
    },
    audioButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: SPACING.sm,
      backgroundColor: COLORS.white,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.primary,
      marginTop: SPACING.xs,
    },
    audioButtonText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.primary,
      marginLeft: SPACING.xs,
      fontWeight: "500",
    },
    noPreviewText: {
      fontSize: FONT_SIZES.sm,
      color: COLORS.textSecondary,
      fontStyle: "italic",
      marginTop: SPACING.xs,
    },
  });

export default InstrumentalistSelectionModal;

