// Discover Pros Categories Data
import ImgMastering from '../assets/images/DiscoverPros/Mastering Engineers.jpg';
import ImgSongwriter from '../assets/images/DiscoverPros/Songwriter.jpg';
import ImgBeatmaker from '../assets/images/DiscoverPros/Beatmakers.jpg';
import ImgProducer from '../assets/images/DiscoverPros/Producer.jpg';

export const PROS_CATEGORIES = [
  {
    id: 'transcription',
    title: 'Transcription',
    serviceType: 'transcription',
    image: ImgMastering,
    description:
      'Transform your audio into professional sheet music. Our experts will transcribe your songs.',
  },
  {
    id: 'arrangement',
    title: 'Arrangement',
    serviceType: 'arrangement',
    image: ImgSongwriter,
    description:
      'Get professional music arrangements tailored to your needs. Perfect for bringing your musical ideas to life.',
  },
  {
    id: 'arrangement-with-recording',
    title: 'Arrangement + Record',
    serviceType: 'arrangement_with_recording',
    image: ImgBeatmaker,
    description:
      'Complete arrangement service with recording. Get both the arrangement and a vocal recording.',
  },
];

