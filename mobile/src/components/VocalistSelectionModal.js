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
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";
import { getVocalists, getSpecialistDetail } from "../services/specialistService";
import { getAvailableArtistsForRequest } from "../services/studioBookingService";
import { MUSIC_GENRES } from "../constants/musicOptionsConstants";
import { Audio } from "expo-av";
import { getSpecialistAverageRating, getSpecialistReviews } from "../services/reviewService";

const VocalistSelectionModal = ({
  visible,
  onClose,
  onConfirm,
  allowMultiple = false,
  maxSelections = 10,
  selectedVocalists = [],
  bookingDate,
  bookingStartTime,
  bookingEndTime,
}) => {
  const [vocalists, setVocalists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => {
    if (allowMultiple && selectedVocalists) {
      return selectedVocalists.map((v) => v.specialistId || v.id || v);
    }
    return selectedVocalists?.[0] ? [selectedVocalists[0].specialistId || selectedVocalists[0].id] : [];
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVocalistForDetail, setSelectedVocalistForDetail] = useState(null);

  // Sync selectedIds with selectedVocalists prop when modal opens or prop changes
  useEffect(() => {
    if (visible) {
      if (allowMultiple && selectedVocalists) {
        const newSelectedIds = selectedVocalists.map((v) => v.specialistId || v.id || v);
        setSelectedIds(newSelectedIds);
      } else {
        const newSelectedIds = selectedVocalists?.[0] 
          ? [selectedVocalists[0].specialistId || selectedVocalists[0].id] 
          : [];
        setSelectedIds(newSelectedIds);
      }
    }
  }, [visible, selectedVocalists, allowMultiple]);

  // Fetch vocalists with filters
  useEffect(() => {
    if (visible) {
      fetchVocalists();
    }
  }, [genderFilter, selectedGenres, bookingDate, bookingStartTime, bookingEndTime, visible]);

  const fetchVocalists = async () => {
    setLoading(true);
    try {
      const gender = genderFilter !== "ALL" ? genderFilter : null;
      const genres = selectedGenres.length > 0 ? selectedGenres : null;

      // If we have booking date/time, use getAvailableArtistsForRequest to filter by availability
      if (bookingDate && bookingStartTime && bookingEndTime) {
        const response = await getAvailableArtistsForRequest(
          bookingDate,
          bookingStartTime,
          bookingEndTime,
          null, // skillId - null for vocalists
          "VOCAL", // roleType
          genres // genres filter
        );

        if (response?.status === "success" && response?.data) {
          let filteredVocalists = response.data;
          if (gender) {
            filteredVocalists = filteredVocalists.filter((v) => v.gender === gender);
          }
          setVocalists(filteredVocalists);
        } else {
          setVocalists([]);
        }
      } else {
        // Fallback: Fetch all vocalists
        const response = await getVocalists(gender, genres);
        if (response?.data) {
          setVocalists(response.data);
        }
      }
    } catch (error) {
      console.error("Error fetching vocalists:", error);
      Alert.alert("Error", error.message || "Unable to load vocalists list");
      setVocalists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (vocalistId) => {
    if (allowMultiple) {
      setSelectedIds((prev) => {
        if (prev.includes(vocalistId)) {
          return prev.filter((id) => id !== vocalistId);
        } else {
          if (prev.length >= maxSelections) {
            Alert.alert("Notice", `You can only select up to ${maxSelections} vocalist${maxSelections > 1 ? "s" : ""}`);
            return prev;
          }
          return [...prev, vocalistId];
        }
      });
    } else {
      setSelectedIds([vocalistId]);
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      Alert.alert("Notice", "Please select at least one vocalist");
      return;
    }

    const selected = vocalists
      .filter((v) => selectedIds.includes(v.id || v.specialistId))
      .map((v) => ({
        specialistId: v.specialistId || v.id,
        name: v.name || v.fullName || `Vocalist ${v.id || v.specialistId}`,
        fullName: v.fullName || v.name,
        avatarUrl: v.avatarUrl || v.avatar,
        rating: v.rating,
        experienceYears: v.experienceYears,
        hourlyRate: v.hourlyRate || 0,
        genres: v.genres || [],
      }));

    onConfirm(selected);
  };

  const handleViewDetail = (vocalist) => {
    setSelectedVocalistForDetail(vocalist);
    setShowDetailModal(true);
  };

  const isSelected = (vocalistId) => {
    return selectedIds.includes(vocalistId);
  };

  const availableGenres = MUSIC_GENRES.map((g) => g.value);

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
            <Text style={styles.headerTitle}>Select Vocalist{allowMultiple ? "s" : ""}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <Text style={styles.filterLabel}>Filter by gender:</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterButton, genderFilter === "ALL" && styles.filterButtonActive]}
                onPress={() => setGenderFilter("ALL")}
              >
                <Text style={[styles.filterButtonText, genderFilter === "ALL" && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, genderFilter === "FEMALE" && styles.filterButtonActive]}
                onPress={() => setGenderFilter("FEMALE")}
              >
                <Text style={[styles.filterButtonText, genderFilter === "FEMALE" && styles.filterButtonTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, genderFilter === "MALE" && styles.filterButtonActive]}
                onPress={() => setGenderFilter("MALE")}
              >
                <Text style={[styles.filterButtonText, genderFilter === "MALE" && styles.filterButtonTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { marginTop: SPACING.md }]}>Filter by genre:</Text>
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
                    style={[styles.genreTag, isSelected && styles.genreTagSelected]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedGenres(selectedGenres.filter((g) => g !== genre));
                      } else {
                        setSelectedGenres([...selectedGenres, genre]);
                      }
                    }}
                  >
                    <Text
                      style={[styles.genreTagText, isSelected && styles.genreTagTextSelected]}
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
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
              vocalists.map((vocalist) => {
                const vocalistId = vocalist.id || vocalist.specialistId;
                const isVocalistSelected = isSelected(vocalistId);
                const avatar = vocalist.avatarUrl || vocalist.avatar;

                return (
                  <View
                    key={vocalistId}
                    style={[styles.vocalistCard, isVocalistSelected && styles.vocalistCardSelected]}
                  >
                    {/* Khối trên: Avatar + Info */}
                    <View style={styles.vocalistTopSection}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={30} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <View style={styles.vocalistInfo}>
                        <Text style={styles.vocalistName}>
                          {vocalist.name || vocalist.fullName || `Vocalist ${vocalistId}`}
                        </Text>
                        {vocalist.gender && (
                          <Text style={styles.experience}>
                            <Text style={styles.label}>Gender: </Text>
                            {vocalist.gender === "FEMALE" ? "Female" : "Male"}
                          </Text>
                        )}
                        {vocalist.experienceYears && (
                          <Text style={styles.experience}>
                            <Text style={styles.label}>Experience: </Text>
                            {vocalist.experienceYears} years
                          </Text>
                        )}
                        {vocalist.rating && (
                          <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color={COLORS.warning} />
                            <Text style={styles.rating}>
                              <Text style={styles.label}>Rating: </Text>
                              {vocalist.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        {vocalist.hourlyRate && (
                          <Text style={styles.rate}>
                            <Text style={styles.label}>Rate: </Text>
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(vocalist.hourlyRate)}
                            /hour
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Khối dưới: Description + Genres + Buttons (full width) */}
                    <View style={styles.vocalistBottomSection}>
                      {/* Description */}
                      {vocalist.bio && (
                        <Text style={styles.vocalistDescription} numberOfLines={2} ellipsizeMode="tail">
                          {vocalist.bio}
                        </Text>
                      )}
                      {/* Genres */}
                      {vocalist.genres && vocalist.genres.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.vocalistGenresContainer}
                          contentContainerStyle={styles.vocalistGenresContent}
                        >
                          {vocalist.genres.map((genre, idx) => (
                            <View key={idx} style={styles.vocalistGenreTag}>
                              <Text style={styles.vocalistGenreText}>{genre}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                      {/* Action Buttons */}
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[
                            styles.selectButton,
                            isVocalistSelected && styles.selectButtonSelected
                          ]}
                          onPress={() => handleSelect(vocalistId)}
                        >
                          {isVocalistSelected ? (
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
                          onPress={() => handleViewDetail(vocalist)}
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
          {selectedIds.length > 0 && (
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>
                  Confirm ({selectedIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Vocalist Detail Modal */}
      {showDetailModal && selectedVocalistForDetail && (
        <VocalistDetailModal
          visible={showDetailModal}
          vocalist={selectedVocalistForDetail}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedVocalistForDetail(null);
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

// VocalistDetailModal Component
const VocalistDetailModal = ({ visible, vocalist, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [playingDemoId, setPlayingDemoId] = useState(null);
  const [sound, setSound] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    if (visible && vocalist) {
      fetchDetail();
    }
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, vocalist]);

  const fetchDetail = async () => {
    const id = vocalist?.id || vocalist?.specialistId;
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

  if (!vocalist) return null;

  const specialist = detailData?.specialist || vocalist;
  const allSkills = detailData?.skills || [];
  const vocalSkills = allSkills.filter(s => s.skill?.recordingCategory === 'VOCAL');
  const instrumentSkills = allSkills.filter(s => s.skill?.recordingCategory === 'INSTRUMENT');
  const demos = detailData?.demos || [];
  const genres = specialist.genres || [];
  const credits = specialist.credits || [];
  const bio = specialist.bio || "";
  const avatar = specialist.avatarUrl || specialist.avatar || vocalist.avatarUrl || vocalist.avatar;

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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vocalist Details</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.detailContent}>
            {/* Profile Section */}
            <View style={styles.detailCard}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.detailAvatar} />
              ) : (
                <View style={styles.detailAvatarPlaceholder}>
                  <Ionicons name="person" size={60} color={COLORS.textSecondary} />
                </View>
              )}
              <Text style={styles.detailName}>
                {specialist.name || specialist.fullName || `Vocalist ${specialist.id || specialist.specialistId}`}
              </Text>

              {specialist.gender && (
                <Text style={styles.detailText}>
                  Gender: {specialist.gender === "FEMALE" ? "Female" : "Male"}
                </Text>
              )}

              {specialist.rating && (
                <View style={styles.detailRating}>
                  <Ionicons name="star" size={20} color={COLORS.warning} />
                  <Text style={styles.detailRatingText}>{specialist.rating.toFixed(1)}</Text>
                </View>
              )}

              {specialist.experienceYears && (
                <Text style={styles.detailText}>
                  Experience: {specialist.experienceYears} years
                </Text>
              )}

              {specialist.hourlyRate && (
                <Text style={styles.detailText}>
                  Rate: {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(specialist.hourlyRate)}
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

                  {instrumentSkills.length > 0 && (
                    <View style={styles.skillsContainer}>
                      <Text style={styles.detailLabel}>Instrument Skills:</Text>
                      <View style={styles.skillsTags}>
                        {instrumentSkills.map((skillItem, idx) => {
                          const skill = skillItem.skill || skillItem;
                          if (!skill) return null;
                          return (
                            <View key={skill.skillId || idx} style={[styles.skillTag, styles.skillTagBlue]}>
                              <Text style={[styles.skillTagText, styles.skillTagTextBlue]}>
                                {skill.skillName || skill.name}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
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
  filtersContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  genresContainer: {
    marginTop: SPACING.xs,
  },
  genreTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreTagSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreTagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  genreTagTextSelected: {
    color: COLORS.white,
    fontWeight: "600",
  },
  resultCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
  },
  vocalistCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  vocalistTopSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  vocalistBottomSection: {
    width: "100%",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vocalistCardSelected: {
    borderColor: COLORS.primary,
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
  vocalistInfo: {
    flex: 1,
  },
  vocalistName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  label: {
    fontWeight: "600",
    color: COLORS.text,
  },
  vocalistGenresContainer: {
    marginBottom: SPACING.sm,
  },
  vocalistGenresContent: {
    paddingRight: SPACING.xs,
  },
  vocalistGenreTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.xs,
  },
  vocalistGenreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: "500",
  },
  vocalistDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
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
  // Detail Modal Styles
  detailContent: {
    padding: SPACING.md,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
  },
  detailAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.md,
  },
  detailAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray[200],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  detailName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  detailRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  detailRatingText: {
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
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
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
  noPreviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: SPACING.xs,
  },
  skillTagOrange: {
    backgroundColor: COLORS.primary,
  },
  skillTagBlue: {
    backgroundColor: COLORS.primary,
  },
  skillTagTextOrange: {
    color: COLORS.white,
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
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  genresList: {
    width: "100%",
    marginTop: SPACING.md,
  },
  genresTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.xs,
  },
  bioContainer: {
    width: "100%",
    marginTop: SPACING.md,
  },
  bioText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
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
  demosContainer: {
    width: "100%",
    marginTop: SPACING.md,
  },
  demoItem: {
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  demoTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  demoDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  audioButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
    fontWeight: "500",
  },
});

export default VocalistSelectionModal;

