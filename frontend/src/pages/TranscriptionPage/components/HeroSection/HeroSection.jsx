// src/pages/TranscriptionPage/components/HeroSection/HeroSection.jsx
import styles from "./HeroSection.module.css";

/* ===== 37 ảnh giống ServiceGridSection.jsx ===== */
import pianoTranscriptions from "../../../../assets/images/MusicalInstruments/Piano-300x297.png";
import pianoVocalTranscriptions from "../../../../assets/images/MusicalInstruments/Voice-Piano-300x297.png";
import vocalLeadSheets from "../../../../assets/images/MusicalInstruments/Vocal-Lead-Sheets2-300x297.png";
import vocalEnsemble from "../../../../assets/images/MusicalInstruments/Voice-300x297.png";
import backingVocals from "../../../../assets/images/MusicalInstruments/Backing-Vocals3-300x297.png";
import pianoJazzSolo from "../../../../assets/images/MusicalInstruments/Piano-Jazz-300x297.png";
import pianoBlues from "../../../../assets/images/MusicalInstruments/Piano-Blues-3-300x297.png";
import pianoJazzTrio from "../../../../assets/images/MusicalInstruments/Piano-Trio-300x297.png";
import jazzSolo from "../../../../assets/images/MusicalInstruments/Piano-New-300x297.png";
import rhythmCharts from "../../../../assets/images/MusicalInstruments/Rhythm-charts-1-300x300.png";
import leadSheetTranscriptions from "../../../../assets/images/MusicalInstruments/Cuartet-300x297.png";
import guitarTab from "../../../../assets/images/MusicalInstruments/Guitarra-2-300x297.png";
import bassTranscriptions from "../../../../assets/images/MusicalInstruments/Bass-new-2-300x297.png";
import ukuleleTranscriptions from "../../../../assets/images/MusicalInstruments/Ukulele-300x297.png";
import hornSection from "../../../../assets/images/MusicalInstruments/Horns-300x297.png";
import saxophoneTranscriptions from "../../../../assets/images/MusicalInstruments/Saxo-300x297.png";
import trumpetTranscriptions from "../../../../assets/images/MusicalInstruments/Trumpet-1-300x297.png";
import clarinetTranscriptions from "../../../../assets/images/MusicalInstruments/Clarinet-300x297.png";
import violinTranscriptions from "../../../../assets/images/MusicalInstruments/Violin-300x297.png";
import stringQuartet from "../../../../assets/images/MusicalInstruments/Cuartet2-300x297.png";
import celloTranscriptions from "../../../../assets/images/MusicalInstruments/Double-bass-300x297.png";
import orchestrationServices from "../../../../assets/images/MusicalInstruments/Cuartet2-300x297.png";
import concertBrassBand from "../../../../assets/images/MusicalInstruments/Concert-_-Brass-band-transcriptions-300x297.png";
import marchingBand from "../../../../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import fullBandTranscriptions from "../../../../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import drumsTranscriptions from "../../../../assets/images/MusicalInstruments/Drums-4-300x297.png";
import musicArrangements from "../../../../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import accordionTranscriptions from "../../../../assets/images/MusicalInstruments/Accordion-300x297.png";
import harpTranscriptions from "../../../../assets/images/MusicalInstruments/Harp-300x297.png";
import organTranscriptions from "../../../../assets/images/MusicalInstruments/Organ2-300x297.png";
import synthesiaTranscriptions from "../../../../assets/images/MusicalInstruments/Synstesia-300x297.png";
import chordChartsTranscriptions from "../../../../assets/images/MusicalInstruments/c7sus4-2-300x297.png";
import soundsliceTranscriptions from "../../../../assets/images/MusicalInstruments/Soundslice-300x297.png";
import keyboardTranscriptions from "../../../../assets/images/MusicalInstruments/Piano-300x297.png";
import sheetMusicTransposing from "../../../../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import bigBandArrangements from "../../../../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import musicCopyingDigitizing from "../../../../assets/images/MusicalInstruments/Copying-300x297.png";

/* Danh sách đúng thứ tự */
const HERO_STRIP_ITEMS = [
  {
    key: "piano-transcriptions",
    name: "Piano Transcriptions",
    image: pianoTranscriptions,
  },
  {
    key: "piano-vocal-transcriptions",
    name: "Piano & Vocal Transcriptions",
    image: pianoVocalTranscriptions,
  },
  {
    key: "vocal-lead-sheets",
    name: "Vocal Lead Sheet Transcriptions",
    image: vocalLeadSheets,
  },
  {
    key: "vocal-ensemble",
    name: "Vocal Ensemble Transcriptions",
    image: vocalEnsemble,
  },
  {
    key: "backing-vocals",
    name: "Backing Vocals Transcriptions",
    image: backingVocals,
  },
  {
    key: "piano-jazz-solo",
    name: "Piano Jazz Solo Transcriptions",
    image: pianoJazzSolo,
  },
  { key: "piano-blues", name: "Piano Blues Transcriptions", image: pianoBlues },
  {
    key: "piano-jazz-trio",
    name: "Piano Jazz Trio Transcriptions",
    image: pianoJazzTrio,
  },
  { key: "jazz-solo", name: "Jazz Solo Transcriptions", image: jazzSolo },
  {
    key: "rhythm-charts",
    name: "Rhythm Charts Transcriptions",
    image: rhythmCharts,
  },
  {
    key: "lead-sheet",
    name: "Lead Sheet Transcriptions",
    image: leadSheetTranscriptions,
  },
  { key: "guitar-tab", name: "Guitar Tab Transcriptions", image: guitarTab },
  { key: "bass", name: "Bass Transcriptions", image: bassTranscriptions },
  {
    key: "ukulele",
    name: "Ukulele Transcriptions",
    image: ukuleleTranscriptions,
  },
  {
    key: "horn-section",
    name: "Horn Section Transcriptions",
    image: hornSection,
  },
  {
    key: "saxophone",
    name: "Saxophone Transcriptions",
    image: saxophoneTranscriptions,
  },
  {
    key: "trumpet",
    name: "Trumpet Transcriptions",
    image: trumpetTranscriptions,
  },
  {
    key: "clarinet",
    name: "Clarinet Transcriptions",
    image: clarinetTranscriptions,
  },
  { key: "violin", name: "Violin Transcriptions", image: violinTranscriptions },
  {
    key: "string-quartet",
    name: "String Quartet Transcriptions",
    image: stringQuartet,
  },
  { key: "cello", name: "Cello Transcriptions", image: celloTranscriptions },
  {
    key: "orchestration",
    name: "Orchestration Services",
    image: orchestrationServices,
  },
  {
    key: "concert-brass-band",
    name: "Concert & Brass Band Transcriptions",
    image: concertBrassBand,
  },
  {
    key: "marching-band",
    name: "Marching Band Transcriptions",
    image: marchingBand,
  },
  {
    key: "full-band",
    name: "Full Band Transcriptions",
    image: fullBandTranscriptions,
  },
  { key: "drums", name: "Drums Transcriptions", image: drumsTranscriptions },
  { key: "arrangements", name: "Music Arrangements", image: musicArrangements },
  {
    key: "accordion",
    name: "Accordion Transcriptions",
    image: accordionTranscriptions,
  },
  { key: "harp", name: "Harp Transcriptions", image: harpTranscriptions },
  { key: "organ", name: "Organ Transcriptions", image: organTranscriptions },
  {
    key: "synthesia",
    name: "Synthesia Transcriptions",
    image: synthesiaTranscriptions,
  },
  {
    key: "chord-charts",
    name: "Chord Charts Transcriptions",
    image: chordChartsTranscriptions,
  },
  {
    key: "soundslice",
    name: "Soundslice Transcriptions",
    image: soundsliceTranscriptions,
  },
  {
    key: "keyboard",
    name: "Keyboard Transcriptions",
    image: keyboardTranscriptions,
  },
  {
    key: "transposing",
    name: "Sheet Music Transposing",
    image: sheetMusicTransposing,
  },
  {
    key: "big-band",
    name: "Big Band Arrangements",
    image: bigBandArrangements,
  },
  {
    key: "copying-digitizing",
    name: "Music Copying & Digitizing",
    image: musicCopyingDigitizing,
  },
];

/* Lặp 2 lần để tạo hiệu ứng loop vô hạn mượt */
const LOOPED = [...HERO_STRIP_ITEMS, ...HERO_STRIP_ITEMS];

export default function HeroSection() {
  return (
    <section
      className={styles.heroSection}
      aria-label="Music Transcription Services"
    >
      <div className={styles.container}>
        <header className={styles.headerBlock}>
          <h1 className={styles.title}>Music Transcription Service Online</h1>
          <div className={styles.titleDivider} aria-hidden="true" />
          <p className={styles.lead}>Turn audio into sheet music easily!</p>
          <p className={styles.description}>
            Learn more about our music notation services and our range of
            solutions to transform audio recordings into precise and digital
            sheet music.
          </p>
        </header>
      </div>
      <div>
        {/* Marquee chạy ngang (pause khi hover) */}
        <div className={styles.stripWrap}>
          <div className={styles.stripTrack}>
            {LOOPED.map((item, i) => (
              <figure
                key={`${item.key}-${i}`}
                className={styles.stripItem}
                aria-hidden={i >= HERO_STRIP_ITEMS.length}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className={styles.iconImg}
                />
                <figcaption className={styles.itemLabel}>
                  {item.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
