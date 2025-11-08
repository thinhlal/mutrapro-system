// src/pages/TranscriptionPage/components/MusicSheetSection/MusicSheetSection.jsx
import { useState, memo } from 'react';
import styles from './MusicSheetSection.module.css';

/* ====== ASSETS ====== */
import commonThumb from '../../../../../assets/images/Thumnail/Video-Thumbnail-MSMT-1.jpg';
import sheetRocketMan from '../../../../../assets/images/Transcript/Rocket-man-724x1024.png';
import sheetShadowSmile from '../../../../../assets/images/Transcript/s145-724x1024.png';
import sheetTrumpetSolo from '../../../../../assets/images/Transcript/Woodchoppers-ball-trumpet-solo-1-724x1024.png';

/* ====== HELPERS ====== */
function extractYouTubeId(input) {
  if (!input) return null;
  const cleaned = String(input).trim();

  // Nếu đã là ID 11 ký tự (lọc ký tự thừa như & ...)
  const idLike = cleaned.replace(/[^a-zA-Z0-9_-]/g, '');
  if (/^[a-zA-Z0-9_-]{11}$/.test(idLike) && !cleaned.startsWith('http')) {
    return idLike;
  }

  // Nếu là URL
  try {
    const u = new URL(cleaned);
    // youtu.be/<id>
    if (u.hostname.includes('youtu.be')) {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
    }
    // /watch?v=<id>
    const v = u.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

    // /embed/<id> hoặc /shorts/<id>
    const m = u.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[2];
  } catch {}
  return null;
}

/* ====== CONFIG ======*/
const VIDEO_ITEMS = [
  {
    key: 'v1',
    label: 'Piano & Vocal Score',
    youtube: 'https://www.youtube.com/watch?v=LmnejiLlR-M&t=2s',
  },
  {
    key: 'v2',
    label: 'Piano Cover Transcription',
    youtube: 'https://www.youtube.com/watch?v=750BWuHGBNI',
  },
  {
    key: 'v3',
    label: 'Trumpet Jazz Solo',
    youtube: 'https://www.youtube.com/watch?v=4OcySBum734&t=117s',
  },
];

const SHEET_ITEMS = [
  { key: 's1', title: 'The Shadow Of Your Smile', img: sheetShadowSmile },
  { key: 's2', title: 'Rocket Man', img: sheetRocketMan },
  { key: 's3', title: 'Woodchopper’s Ball', img: sheetTrumpetSolo },
];

/* ====== SUB-COMPONENTS ====== */

function VideoCard({ label, youtube, playing, onPlay, onClose, thumb }) {
  const id = extractYouTubeId(youtube);

  return (
    <figure className={styles.mediaCard} aria-label={label}>
      <figcaption className={styles.mediaLabel}>{label}</figcaption>

      {!playing ? (
        <button
          className={styles.thumbButton}
          onClick={onPlay}
          aria-label={`Play ${label}`}
        >
          <img
            src={thumb}
            alt={`${label} thumbnail`}
            className={styles.thumbImg}
            loading="lazy"
          />
          <span className={styles.playBadge} aria-hidden="true" />
          <span className={styles.playHint}>
            Play to compare with the sheet music
          </span>
        </button>
      ) : id ? (
        <div
          className={styles.playerFrame}
          role="region"
          aria-label={`${label} player`}
        >
          <iframe
            title={label}
            className={styles.iframe}
            src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close video"
          >
            ×
          </button>
        </div>
      ) : (
        // Fallback khi không bóc được ID hợp lệ
        <a
          className={styles.thumbButton}
          href={typeof youtube === 'string' ? youtube : '#'}
          target="_blank"
          rel="noreferrer"
          title="Open on YouTube"
        >
          <img
            src={thumb}
            alt={`${label} thumbnail`}
            className={styles.thumbImg}
          />
          <span className={styles.playBadge} aria-hidden="true" />
          <span className={styles.playHint}>Open on YouTube</span>
        </a>
      )}
    </figure>
  );
}

function SheetCard({ title, img }) {
  return (
    <figure className={styles.sheetCard}>
      <div className={styles.sheetPaper}>
        <img src={img} alt={title} loading="lazy" />
      </div>
      <figcaption className={styles.sheetTitle}>{title}</figcaption>
    </figure>
  );
}

function MusicSheetSection() {
  const [playingMap, setPlayingMap] = useState(() =>
    Object.fromEntries(VIDEO_ITEMS.map(v => [v.key, false]))
  );

  const handlePlay = key => setPlayingMap(prev => ({ ...prev, [key]: true }));

  const handleClose = key => setPlayingMap(prev => ({ ...prev, [key]: false }));

  return (
    <section className={styles.section} aria-label="Sample Transcriptions">
      <div className={styles.container}>
        {/* Hàng trên: 3 video */}
        <div className={styles.mediaGrid}>
          {VIDEO_ITEMS.map(v => (
            <VideoCard
              key={v.key}
              label={v.label}
              youtube={v.youtube}
              thumb={commonThumb}
              playing={!!playingMap[v.key]}
              onPlay={() => handlePlay(v.key)}
              onClose={() => handleClose(v.key)}
            />
          ))}
        </div>

        {/* Mũi tên chỉ xuống */}
        <div className={styles.arrowsGrid} aria-hidden="true">
          <span className={styles.arrowDown} />
          <span className={styles.arrowDown} />
          <span className={styles.arrowDown} />
        </div>

        {/* Hàng dưới: 3 trang sheet */}
        <div className={styles.sheetsGrid}>
          {SHEET_ITEMS.map(s => (
            <SheetCard key={s.key} title={s.title} img={s.img} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(MusicSheetSection);
