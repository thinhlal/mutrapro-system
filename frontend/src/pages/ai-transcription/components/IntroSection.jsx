import React from 'react';
import { Typography } from 'antd';
import styles from './IntroSection.module.css';
import demoVideo from '../../../assets/videos/function_p2n_bt601-1.webm';

const { Title, Paragraph, Text } = Typography;

const IntroSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <Title level={1} className={styles.title}>
          Create your sheet music within seconds!
        </Title>

        <Paragraph className={styles.subtitle}>
          Ideal for turning YouTube videos into sheet music, detecting notes,
          and creating lead sheets or music scores in no time. Our AI-powered
          music transcription apps let you generate professional music notation
          in just a few steps:
        </Paragraph>

        {/* Video Demo */}
        <div className={styles.videoContainer}>
          <video
            className={styles.video}
            src={demoVideo}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        {/* 3 Steps Text Below Video */}
        <div className={styles.stepsRow}>
          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>1.</div>
            <div>
              <Text strong className={styles.stepTitle}>
                Upload your Music
              </Text>
              <Paragraph className={styles.stepText}>
                Record your performance, upload an audio file (like an MP3) or
                use audio from a YouTube link.
              </Paragraph>
            </div>
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>2.</div>
            <div>
              <Text strong className={styles.stepTitle}>
                AI Identifies Notes
              </Text>
              <Paragraph className={styles.stepText}>
                Klangio AI analyzes and performs note detection automatically
                for melody, chords, and rhythm.
              </Paragraph>
            </div>
          </div>

          <div className={styles.stepItem}>
            <div className={styles.stepNumber}>3.</div>
            <div>
              <Text strong className={styles.stepTitle}>
                View, Edit and Download
              </Text>
              <Paragraph className={styles.stepText}>
                Export your transcription as Sheet Music, MIDI, MusicXML or
                Guitar Pro and use the integrated Edit Mode.
              </Paragraph>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;
