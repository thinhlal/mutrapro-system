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

const VocalistDetailScreen = ({ navigation, route }) => {
  const { specialistId, vocalist } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [playingDemoId, setPlayingDemoId] = useState(null);
  const [sound, setSound] = useState(null);

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
      }
    } catch (error) {
      console.error("Error fetching specialist detail:", error);
      Alert.alert("Error", error.message || "Unable to load vocalist information");
    } finally {
      setLoading(false);
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
  const bio = specialist.bio || "";
  const experienceYears = specialist.experienceYears;

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
          <View style={styles.profileHeader}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={COLORS.textSecondary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{specialistName}</Text>
              {gender && (
                <View style={styles.genderBadge}>
                  <Ionicons
                    name={gender === "FEMALE" ? "female" : "male"}
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.genderText}>
                    {gender === "FEMALE" ? "Female" : "Male"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Genres */}
          {genres.length > 0 && (
            <View style={styles.genresContainer}>
              <Text style={styles.sectionLabel}>Genres:</Text>
              <View style={styles.genresList}>
                {genres.map((genre, index) => (
                  <View key={`genre-${genre}-${index}`} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Experience */}
          {experienceYears && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>
                {experienceYears} years of experience
              </Text>
            </View>
          )}

          {/* Bio */}
          {bio && (
            <View style={styles.bioSection}>
              <Text style={styles.sectionLabel}>About:</Text>
              <Text style={styles.bioText}>{bio}</Text>
            </View>
          )}

          {/* Vocal Skills */}
          {vocalSkills.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={styles.sectionLabel}>Vocal Skills:</Text>
              <View style={styles.skillsList}>
                {vocalSkills.map((specialistSkill, index) => {
                  const skill = specialistSkill.skill || specialistSkill;
                  if (!skill) return null;
                  return (
                    <View key={skill.skillId || skill.id || `vocal-skill-${index}`} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>
                        {skill.skillName || skill.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          
          {/* Instrument Skills */}
          {instrumentSkills.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={styles.sectionLabel}>Instrument Skills:</Text>
              <View style={styles.skillsList}>
                {instrumentSkills.map((specialistSkill, index) => {
                  const skill = specialistSkill.skill || specialistSkill;
                  if (!skill) return null;
                  return (
                    <View key={skill.skillId || skill.id || `instrument-skill-${index}`} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>
                        {skill.skillName || skill.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Demos Section */}
        <View style={styles.demosCard}>
          <View style={styles.demosHeader}>
            <Ionicons name="musical-notes" size={24} color={COLORS.primary} />
            <Text style={styles.demosTitle}>
              Demos ({demos.length})
            </Text>
          </View>

          {demos.length === 0 ? (
            <View style={styles.emptyDemos}>
              <Ionicons name="musical-note-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyDemosText}>No demos available</Text>
            </View>
          ) : (
            <View style={styles.demosList}>
              {demos.map((demo, index) => {
                const isPlaying = playingDemoId === demo.demoId;
                return (
                  <View key={demo.demoId || demo.id || `demo-${index}`} style={styles.demoCard}>
                    <View style={styles.demoHeader}>
                      <View style={styles.demoInfo}>
                        <Text style={styles.demoTitle}>{demo.title || "Untitled"}</Text>
                        {demo.description && (
                          <Text style={styles.demoDescription} numberOfLines={2}>
                            {demo.description}
                          </Text>
                        )}
                        
                        {/* Demo Genres */}
                        {demo.genres && demo.genres.length > 0 && (
                          <View style={styles.demoGenres}>
                            {demo.genres.map((genre, index) => (
                              <View key={`demo-genre-${demo.demoId || index}-${genre}-${index}`} style={styles.demoGenreTag}>
                                <Text style={styles.demoGenreText}>{genre}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Demo Skill */}
                        {demo.skill && (
                          <View style={styles.demoSkill}>
                            <Ionicons
                              name={
                                demo.recordingRole === "VOCALIST"
                                  ? "mic"
                                  : "musical-note"
                              }
                              size={14}
                              color={COLORS.primary}
                            />
                            <Text style={styles.demoSkillText}>
                              {demo.skill.skillName || demo.skill.name}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Audio Player */}
                    {demo.previewUrl ? (
                      <TouchableOpacity
                        style={styles.audioPlayer}
                        onPress={() => playAudio(demo)}
                      >
                        <View style={styles.audioPlayerContent}>
                          <Ionicons
                            name={isPlaying ? "pause-circle" : "play-circle"}
                            size={40}
                            color={COLORS.primary}
                          />
                          <View style={styles.audioPlayerInfo}>
                            <Text style={styles.audioPlayerText}>
                              {isPlaying ? "Playing..." : "Tap to play demo"}
                            </Text>
                            {isPlaying && (
                              <View style={styles.playingIndicator}>
                                <View style={styles.playingDot} />
                                <View style={styles.playingDot} />
                                <View style={styles.playingDot} />
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.noAudio}>
                        <Ionicons name="ban" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.noAudioText}>No audio preview</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
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
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
    gap: SPACING.xs / 2,
  },
  genderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  genresContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  genresList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  genreTag: {
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  genreTagText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  bioSection: {
    marginTop: SPACING.md,
  },
  bioText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  skillsSection: {
    marginTop: SPACING.md,
  },
  skillsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  skillTag: {
    backgroundColor: COLORS.info + "15",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  skillTagText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.info,
  },
  demosCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demosHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  demosTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyDemos: {
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyDemosText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  demosList: {
    gap: SPACING.md,
  },
  demoCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  demoHeader: {
    marginBottom: SPACING.md,
  },
  demoInfo: {
    gap: SPACING.xs,
  },
  demoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  demoDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  demoGenres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  demoGenreTag: {
    backgroundColor: COLORS.warning + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  demoGenreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    fontWeight: "600",
  },
  demoSkill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
    gap: SPACING.xs / 2,
  },
  demoSkillText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  audioPlayer: {
    marginTop: SPACING.sm,
  },
  audioPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  audioPlayerInfo: {
    flex: 1,
  },
  audioPlayerText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  playingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs / 2,
    gap: 4,
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  noAudio: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  noAudioText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
});

export default VocalistDetailScreen;

