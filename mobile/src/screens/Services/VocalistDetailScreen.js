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
import { Audio } from "expo-av";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getSpecialistDetail } from "../../services/specialistService";
import { getSpecialistAverageRating, getSpecialistReviews } from "../../services/reviewService";

const VocalistDetailScreen = ({ navigation, route }) => {
  const { specialistId, vocalist } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [playingDemoId, setPlayingDemoId] = useState(null);
  const [sound, setSound] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  const specialist = detailData?.specialist || vocalist;
  const allSkills = detailData?.skills || [];
  // Filter skills by recordingCategory like frontend
  const vocalSkills = allSkills.filter(
    s => s.skill?.recordingCategory === 'VOCAL'
  );
  const instrumentSkills = allSkills.filter(
    s => s.skill?.recordingCategory === 'INSTRUMENT'
  );
  const demos = detailData?.demos || [];

  useEffect(() => {
    fetchDetail();
    
    // Cleanup sound on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [specialistId]);

  const fetchDetail = async () => {
    const id = specialistId || vocalist?.id || vocalist?.specialistId;
    if (!id) {
      Alert.alert("Error", "Vocalist information not found");
      navigation.goBack();
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
      Alert.alert("Error", error.message || "Unable to load vocalist information");
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

      // Handle playback finish
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

  const stopAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setPlayingDemoId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vocalist information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!specialist) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Vocalist information not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const specialistName = specialist.name || specialist.fullName || "Unknown";
  const avatar = specialist.avatar || specialist.avatarUrl;
  const gender = specialist.gender;
  const genres = specialist.genres || [];
  const credits = specialist.credits || [];
  const bio = specialist.bio || "";
  const experienceYears = specialist.experienceYears;
  const hourlyRate = specialist.hourlyRate;

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            stopAudio();
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vocalist Details</Text>
        <View style={styles.placeholder} />
      </View> */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileCard}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={60} color={COLORS.textSecondary} />
            </View>
          )}
          <Text style={styles.name}>
            {specialistName}
          </Text>

          {gender && (
            <Text style={styles.detailText}>
              Gender: {gender === "FEMALE" ? "Female" : "Male"}
            </Text>
          )}

          {displayRating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color={COLORS.warning} />
              <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
              <Text style={styles.reviewsCount}>({displayReviewsCount} reviews)</Text>
            </View>
          )}

          {experienceYears && (
            <Text style={styles.detailText}>
              Experience: {experienceYears} years
            </Text>
          )}

          {hourlyRate && (
            <Text style={styles.detailText}>
              Rate: {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(hourlyRate)}
              /hour
            </Text>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === '1' && styles.tabActive]}
              onPress={() => setActiveTab('1')}
            >
              <Text style={[styles.tabText, activeTab === '1' && styles.tabTextActive]}>
                Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === '2' && styles.tabActive]}
              onPress={() => setActiveTab('2')}
            >
              <Text style={[styles.tabText, activeTab === '2' && styles.tabTextActive]}>
                Reviews ({displayReviewsCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === '3' && styles.tabActive]}
              onPress={() => setActiveTab('3')}
            >
              <Text style={[styles.tabText, activeTab === '3' && styles.tabTextActive]}>
                Demos ({demos.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === '1' && (
            <View style={styles.tabContent}>
              {/* Bio */}
              {bio && (
                <View style={styles.bioContainer}>
                  <Text style={styles.detailLabel}>About</Text>
                  <Text style={styles.bioText}>{bio}</Text>
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
                <View style={styles.skillsContainer}>
                  <Text style={styles.detailLabel}>Credits:</Text>
                  <View style={styles.skillsTags}>
                    {credits.map((credit, idx) => (
                      <View key={idx} style={styles.skillTag}>
                        <Text style={styles.skillTagText}>{credit}</Text>
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
            <View style={styles.tabContent}>
              {reviewsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : reviews.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No reviews yet</Text>
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => (
                    <View key={review.reviewId} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewRating}>
                          <Ionicons name="star" size={16} color={COLORS.warning} />
                          <Text style={styles.reviewRatingText}>{review.rating} / 5</Text>
                        </View>
                        {review.specialistName && (
                          <Text style={styles.reviewAuthor}>by {review.specialistName}</Text>
                        )}
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      )}
                      {review.reviewType && (
                        <Text style={styles.reviewType}>
                          {review.reviewType === 'TASK' ? 'Task Review' : 'Participant Review'}
                        </Text>
                      )}
                      {review.createdAt && (
                        <Text style={styles.reviewDate}>
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
            <View style={styles.tabContent}>
              {demos.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="musical-note-outline" size={48} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>No demos available</Text>
                </View>
              ) : (
                <View style={styles.demosList}>
                  {demos.map((demo, idx) => {
                    const isPlaying = playingDemoId === demo.demoId;
                    return (
                      <View key={demo.demoId || idx} style={styles.demoItem}>
                        <View style={styles.demoHeader}>
                          <Text style={styles.demoTitle}>{demo.title || "Untitled"}</Text>
                          {demo.skill && (
                            <View style={[
                              styles.demoSkillTag,
                              demo.recordingRole === 'VOCALIST' && styles.demoSkillTagOrange
                            ]}>
                              <Text style={[
                                styles.demoSkillText,
                                demo.recordingRole === 'VOCALIST' && styles.demoSkillTextOrange
                              ]}>
                                {demo.skill.skillName || demo.skill.name}
                              </Text>
                            </View>
                          )}
                        </View>
                        {demo.description && (
                          <Text style={styles.demoDescription}>{demo.description}</Text>
                        )}
                        {demo.genres && demo.genres.length > 0 && (
                          <View style={styles.demoGenres}>
                            {demo.genres.map((genre, genreIdx) => (
                              <View key={genreIdx} style={styles.demoGenreTag}>
                                <Text style={styles.demoGenreText}>{genre}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {demo.previewUrl ? (
                          <TouchableOpacity
                            style={styles.audioButton}
                            onPress={() => playAudio(demo)}
                          >
                            <Ionicons
                              name={isPlaying ? "pause-circle" : "play-circle"}
                              size={24}
                              color={COLORS.primary}
                            />
                            <Text style={styles.audioButtonText}>
                              {isPlaying ? "Playing..." : "Play demo"}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.noPreviewText}>No preview available</Text>
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
    </SafeAreaView>
  );
};

// ExpandableTagsSection Component
const ExpandableTagsSection = ({ title, items, tagStyle, textStyle }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <View style={styles.expandableSection}>
      <View style={styles.expandableHeader}>
        <Text style={styles.expandableTitle}>{title}:</Text>
        <TouchableOpacity
          style={styles.viewModeToggle}
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
          style={styles.expandableHorizontalScroll}
          contentContainerStyle={styles.expandableHorizontalContent}
        >
          {items.map((item, idx) => (
            <View key={idx} style={[styles.expandableTagButton, tagStyle]}>
              <Text style={[styles.expandableTagText, textStyle]}>{item}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        // Expanded List View (Vertical)
        <View style={styles.expandableList}>
          {items.map((item, idx) => (
            <View key={idx} style={[styles.expandableTagButtonVertical, tagStyle]}>
              <Text style={[styles.expandableTagText, textStyle]}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    padding: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  bioContainer: {
    width: "100%",
    marginTop: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  bioText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  skillsContainer: {
    width: "100%",
    marginTop: SPACING.md,
  },
  skillsTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.xs,
  },
  skillTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  skillTagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: "500",
  },
  skillTagBlue: {
    backgroundColor: COLORS.primary,
  },
  skillTagTextBlue: {
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

export default VocalistDetailScreen;

