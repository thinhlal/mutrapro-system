// Dữ liệu chung cho các dịch vụ transcription

// Import tất cả images một lần
import pianoTranscriptions from "../assets/images/MusicalInstruments/Piano-300x297.png";
import pianoVocalTranscriptions from "../assets/images/MusicalInstruments/Voice-Piano-300x297.png";
import vocalLeadSheets from "../assets/images/MusicalInstruments/Vocal-Lead-Sheets2-300x297.png";
import vocalEnsemble from "../assets/images/MusicalInstruments/Voice-300x297.png";
import backingVocals from "../assets/images/MusicalInstruments/Backing-Vocals3-300x297.png";
import pianoJazzSolo from "../assets/images/MusicalInstruments/Piano-Jazz-300x297.png";
import pianoBlues from "../assets/images/MusicalInstruments/Piano-Blues-3-300x297.png";
import pianoJazzTrio from "../assets/images/MusicalInstruments/Piano-Trio-300x297.png";
import jazzSolo from "../assets/images/MusicalInstruments/Piano-New-300x297.png";
import rhythmCharts from "../assets/images/MusicalInstruments/Rhythm-charts-1-300x300.png";
import leadSheetTranscriptions from "../assets/images/MusicalInstruments/Cuartet-300x297.png";
import guitarTab from "../assets/images/MusicalInstruments/Guitarra-2-300x297.png";
import bassTranscriptions from "../assets/images/MusicalInstruments/Bass-new-2-300x297.png";
import ukuleleTranscriptions from "../assets/images/MusicalInstruments/Ukulele-300x297.png";
import hornSection from "../assets/images/MusicalInstruments/Horns-300x297.png";
import saxophoneTranscriptions from "../assets/images/MusicalInstruments/Saxo-300x297.png";
import trumpetTranscriptions from "../assets/images/MusicalInstruments/Trumpet-1-300x297.png";
import clarinetTranscriptions from "../assets/images/MusicalInstruments/Clarinet-300x297.png";
import violinTranscriptions from "../assets/images/MusicalInstruments/Violin-300x297.png";
import stringQuartet from "../assets/images/MusicalInstruments/Cuartet2-300x297.png";
import celloTranscriptions from "../assets/images/MusicalInstruments/Double-bass-300x297.png";
import orchestrationServices from "../assets/images/MusicalInstruments/Cuartet2-300x297.png";
import concertBrassBand from "../assets/images/MusicalInstruments/Concert-_-Brass-band-transcriptions-300x297.png";
import marchingBand from "../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import fullBandTranscriptions from "../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import drumsTranscriptions from "../assets/images/MusicalInstruments/Drums-4-300x297.png";
import musicArrangements from "../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import accordionTranscriptions from "../assets/images/MusicalInstruments/Accordion-300x297.png";
import harpTranscriptions from "../assets/images/MusicalInstruments/Harp-300x297.png";
import organTranscriptions from "../assets/images/MusicalInstruments/Organ2-300x297.png";
import synthesiaTranscriptions from "../assets/images/MusicalInstruments/Synstesia-300x297.png";
import chordChartsTranscriptions from "../assets/images/MusicalInstruments/c7sus4-2-300x297.png";
import soundsliceTranscriptions from "../assets/images/MusicalInstruments/Soundslice-300x297.png";
import keyboardTranscriptions from "../assets/images/MusicalInstruments/Piano-300x297.png";
import sheetMusicTransposing from "../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import bigBandArrangements from "../assets/images/MusicalInstruments/Arrangament2-300x297.png";
import musicCopyingDigitizing from "../assets/images/MusicalInstruments/Copying-300x297.png";

// Danh sách đầy đủ các dịch vụ transcription
export const TRANSCRIPTION_SERVICES = [
  {
    id: 1,
    name: "Piano Transcriptions",
    image: pianoTranscriptions,
    category: "Piano",
    key: "piano-transcriptions",
  },
  {
    id: 2,
    name: "Piano & Vocal Transcriptions",
    image: pianoVocalTranscriptions,
    category: "Piano & Vocal",
    key: "piano-vocal-transcriptions",
  },
  {
    id: 3,
    name: "Vocal Lead Sheet Transcriptions",
    image: vocalLeadSheets,
    category: "Vocal",
    key: "vocal-lead-sheets",
  },
  {
    id: 4,
    name: "Vocal Ensemble Transcriptions",
    image: vocalEnsemble,
    category: "Vocal",
    key: "vocal-ensemble",
  },
  {
    id: 5,
    name: "Backing Vocals Transcriptions",
    image: backingVocals,
    category: "Vocal",
    key: "backing-vocals",
  },
  {
    id: 6,
    name: "Piano Jazz Solo Transcriptions",
    image: pianoJazzSolo,
    category: "Jazz",
    key: "piano-jazz-solo",
  },
  {
    id: 7,
    name: "Piano Blues Transcriptions",
    image: pianoBlues,
    category: "Blues",
    key: "piano-blues",
  },
  {
    id: 8,
    name: "Piano Jazz Trio Transcriptions",
    image: pianoJazzTrio,
    category: "Jazz",
    key: "piano-jazz-trio",
  },
  {
    id: 9,
    name: "Jazz Solo Transcriptions",
    image: jazzSolo,
    category: "Jazz",
    key: "jazz-solo",
  },
  {
    id: 10,
    name: "Rhythm Charts Transcriptions",
    image: rhythmCharts,
    category: "Charts",
    key: "rhythm-charts",
  },
  {
    id: 11,
    name: "Lead Sheet Transcriptions",
    image: leadSheetTranscriptions,
    category: "Lead Sheets",
    key: "lead-sheet",
  },
  {
    id: 12,
    name: "Guitar Tab Transcriptions",
    image: guitarTab,
    category: "Guitar",
    key: "guitar-tab",
  },
  {
    id: 13,
    name: "Bass Transcriptions",
    image: bassTranscriptions,
    category: "Bass",
    key: "bass",
  },
  {
    id: 14,
    name: "Ukulele Transcriptions",
    image: ukuleleTranscriptions,
    category: "Ukulele",
    key: "ukulele",
  },
  {
    id: 15,
    name: "Horn Section Transcriptions",
    image: hornSection,
    category: "Brass",
    key: "horn-section",
  },
  {
    id: 16,
    name: "Saxophone Transcriptions",
    image: saxophoneTranscriptions,
    category: "Woodwind",
    key: "saxophone",
  },
  {
    id: 17,
    name: "Trumpet Transcriptions",
    image: trumpetTranscriptions,
    category: "Brass",
    key: "trumpet",
  },
  {
    id: 18,
    name: "Clarinet Transcriptions",
    image: clarinetTranscriptions,
    category: "Woodwind",
    key: "clarinet",
  },
  {
    id: 19,
    name: "Violin Transcriptions",
    image: violinTranscriptions,
    category: "Strings",
    key: "violin",
  },
  {
    id: 20,
    name: "String Quartet Transcriptions",
    image: stringQuartet,
    category: "Strings",
    key: "string-quartet",
  },
  {
    id: 21,
    name: "Cello Transcriptions",
    image: celloTranscriptions,
    category: "Strings",
    key: "cello",
  },
  {
    id: 22,
    name: "Orchestration Services",
    image: orchestrationServices,
    category: "Orchestra",
    key: "orchestration",
  },
  {
    id: 23,
    name: "Concert & Brass Band Transcriptions",
    image: concertBrassBand,
    category: "Band",
    key: "concert-brass-band",
  },
  {
    id: 24,
    name: "Marching Band Transcriptions",
    image: marchingBand,
    category: "Band",
    key: "marching-band",
  },
  {
    id: 25,
    name: "Full Band Transcriptions",
    image: fullBandTranscriptions,
    category: "Band",
    key: "full-band",
  },
  {
    id: 26,
    name: "Drums Transcriptions",
    image: drumsTranscriptions,
    category: "Percussion",
    key: "drums",
  },
  {
    id: 27,
    name: "Music Arrangements",
    image: musicArrangements,
    category: "Arrangements",
    key: "arrangements",
  },
  {
    id: 28,
    name: "Accordion Transcriptions",
    image: accordionTranscriptions,
    category: "Accordion",
    key: "accordion",
  },
  {
    id: 29,
    name: "Harp Transcriptions",
    image: harpTranscriptions,
    category: "Harp",
    key: "harp",
  },
  {
    id: 30,
    name: "Organ Transcriptions",
    image: organTranscriptions,
    category: "Organ",
    key: "organ",
  },
  {
    id: 31,
    name: "Synthesia Transcriptions",
    image: synthesiaTranscriptions,
    category: "Digital",
    key: "synthesia",
  },
  {
    id: 32,
    name: "Chord Charts Transcriptions",
    image: chordChartsTranscriptions,
    category: "Charts",
    key: "chord-charts",
  },
  {
    id: 33,
    name: "Soundslice Transcriptions",
    image: soundsliceTranscriptions,
    category: "Digital",
    key: "soundslice",
  },
  {
    id: 34,
    name: "Keyboard Transcriptions",
    image: keyboardTranscriptions,
    category: "Keyboard",
    key: "keyboard",
  },
  {
    id: 35,
    name: "Sheet Music Transposing",
    image: sheetMusicTransposing,
    category: "Services",
    key: "transposing",
  },
  {
    id: 36,
    name: "Big Band Arrangements",
    image: bigBandArrangements,
    category: "Big Band",
    key: "big-band",
  },
  {
    id: 37,
    name: "Music Copying & Digitizing",
    image: musicCopyingDigitizing,
    category: "Services",
    key: "copying-digitizing",
  },
];
