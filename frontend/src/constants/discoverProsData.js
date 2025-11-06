import ImgMixing from '../assets/images/DiscoverPros/Studio Engineer.jpg';
import ImgSongwriter from '../assets/images/DiscoverPros/Songwriter.jpg';
import ImgBeatmaker from '../assets/images/DiscoverPros/Beatmakers.jpg';
import ImgSession from '../assets/images/DiscoverPros/Session Drummer.jpg';

export const PROS_CATEGORIES = [
  {
    id: 'transcription',
    title: 'Transcription',
    href: '/detail-service',
    serviceType: 'transcription',
    image: ImgMixing,
    description:
      'Transform your audio into professional sheet music. Our experts will transcribe your songs with accuracy and attention to detail.',
  },
  {
    id: 'arrangement',
    title: 'Arrangement',
    href: '/detail-service',
    serviceType: 'arrangement',
    image: ImgSongwriter,
    description:
      'Get professional music arrangements tailored to your needs. Perfect for bringing your musical ideas to life.',
  },
  {
    id: 'arrangement-with-recording',
    title: 'Arrangement with Recording',
    href: '/detail-service',
    serviceType: 'arrangement_with_recording',
    image: ImgBeatmaker,
    description:
      'Complete arrangement service with professional recording. Get both the arrangement and a polished vocal recording.',
  },
  {
    id: 'recording',
    title: 'Recording',
    href: '/detail-service',
    serviceType: 'recording',
    image: ImgSession,
    description:
      'Professional studio recording services with top vocalists. Choose from male or female singers for your track.',
  },
];
