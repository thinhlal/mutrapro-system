import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH;
const SLIDER_HEIGHT = 250;

// Dữ liệu slider với hình ảnh local
const SLIDER_DATA = [
  {
    id: '1',
    title: 'Professional Music Transcription',
    subtitle: 'Expert musicians transcribe your music with precision',
    image: require('../assets/images/HomeScreenImages/mobileHome1.png'),
    backgroundColor: COLORS.primary,
  },
  {
    id: '2',
    title: 'Custom Music Arrangements',
    subtitle: 'Transform your music with professional arrangements',
    image: require('../assets/images/HomeScreenImages/mobileHome2.png'),
    backgroundColor: COLORS.secondary,
  },
  {
    id: '3',
    title: 'High-Quality Studio Recording',
    subtitle: 'State-of-the-art recording facilities at your service',
    image: require('../assets/images/HomeScreenImages/mobileHome3.png'),
    backgroundColor: COLORS.success,
  },
  {
    id: '4',
    title: 'Sound Engineering & Mixing',
    subtitle: 'Professional mixing and mastering for your tracks',
    image: require('../assets/images/HomeScreenImages/mobileHome4.png'),
    backgroundColor: COLORS.info,
  },
  {
    id: '5',
    title: 'Music Production Services',
    subtitle: 'Complete music production from start to finish',
    image: require('../assets/images/HomeScreenImages/mobileHome5.png'),
    backgroundColor: COLORS.warning,
  },
];

const ImageSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const autoPlayRef = useRef(null);

  // Auto-play functionality
  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [currentIndex]);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayRef.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % SLIDER_DATA.length;
      scrollToIndex(nextIndex);
    }, 4000); // 4 seconds
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const scrollToIndex = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
      setCurrentIndex(index);
    }
  };

  const onScroll = (event) => {
    const slideIndex = Math.round(
      event.nativeEvent.contentOffset.x / SLIDER_WIDTH
    );
    if (slideIndex !== currentIndex) {
      setCurrentIndex(slideIndex);
    }
  };

  const renderSlide = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.slide}
      onPress={() => {
        // TODO: Navigate to detail or open modal
        console.log('Slide pressed:', item.title);
      }}
    >
      <View style={styles.imageContainer}>
        {/* Background Image */}
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Overlay with gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {SLIDER_DATA.map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => scrollToIndex(index)}
          style={[
            styles.paginationDot,
            index === currentIndex && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDER_DATA}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={stopAutoPlay}
        onScrollEndDrag={startAutoPlay}
        keyExtractor={(item) => item.id}
        getItemLayout={(data, index) => ({
          length: SLIDER_WIDTH,
          offset: SLIDER_WIDTH * index,
          index,
        })}
      />
      {renderPagination()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: SPACING.xl,
    marginHorizontal: -SPACING.lg, // Negative margin để tràn ra ngoài padding của parent
  },
  slide: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    marginHorizontal: 0,
  },
  imageContainer: {
    flex: 1,
    borderRadius: 0, // Bỏ border radius để full màn hình
    overflow: 'hidden',
    backgroundColor: COLORS.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray[100],
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.95,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[400],
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
});

export default ImageSlider;

