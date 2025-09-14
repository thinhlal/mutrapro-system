// src/pages/PricingPage/components/PricingChart/PricingChart.jsx
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import sheetRocketMan from "../../../../assets/images/PricingPage/PricingChart/sheetRocketMan.png";
import sheetShadowSmile from "../../../../assets/images/PricingPage/PricingChart/sheetShadowSmile.png";
import sheetTrumpetSolo from "../../../../assets/images/PricingPage/PricingChart/sheetTrumpetSolo.png";
import audio from "../../../../assets/audio/demo.mp3";
import styles from "./PricingChart.module.css";

const TIERS = [
    {
        key: "easy",
        title: "Easy",
        price: "$21-24",
        currency: "USD",
        ribbonClass: styles.ribbonEasy,
        audioSrc: audio,
    },
    {
        key: "avg",
        title: "Average - Advanced",
        price: "$25-38",
        currency: "USD",
        ribbonClass: styles.ribbonAvg,
        audioSrc: audio,
    },
    {
        key: "diff",
        title: "Difficult",
        price: "$39-49+",
        currency: "USD",
        ribbonClass: styles.ribbonDiff,
        audioSrc: audio,
    },
];

const SHEET_ITEMS = [
    { key: "s1", title: "The Shadow Of Your Smile", img: sheetShadowSmile },
    { key: "s2", title: "Rocket Man", img: sheetRocketMan },
    { key: "s3", title: "Woodchopper’s Ball", img: sheetTrumpetSolo },
];

/* ========== Utils ========== */
const pad = (n) => String(Math.floor(n)).padStart(2, "0");
const fmt = (t) => {
    if (!Number.isFinite(t) || t < 0) return "00:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${pad(m)}:${pad(s)}`;
};

/* ========== Tiny audio player (custom UI) ========== */
function AudioPlayer({ id, src, playingId, setPlayingId }) {
    const audioRef = useRef(null);
    const barRef = useRef(null);
    const volRef = useRef(null);

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [dur, setDur] = useState(NaN);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    const progress = useMemo(() => (dur ? time / dur : 0), [time, dur]);

    // Pause when another player starts
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        if (playingId !== id && !a.paused) {
            a.pause();
            setIsPlaying(false);
        }
    }, [playingId, id]);

    const togglePlay = () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
            a.play().then(() => {
                setPlayingId(id);
                setIsPlaying(true);
            });
        } else {
            a.pause();
            setIsPlaying(false);
        }
    };

    const onLoaded = () => {
        const a = audioRef.current;
        if (!a) return;
        setDur(a.duration);
        setIsReady(true);
    };

    const onTime = () => {
        const a = audioRef.current;
        if (!a) return;
        setTime(a.currentTime);
    };

    const onEnded = () => {
        setIsPlaying(false);
        setTime(0);
    };

    const seek = (e) => {
        const a = audioRef.current;
        const bar = barRef.current;
        if (!a || !bar || !dur) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        a.currentTime = ratio * dur;
    };

    const changeVol = (e) => {
        const a = audioRef.current;
        const bar = volRef.current;
        if (!a || !bar) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        a.volume = ratio;
        setVolume(ratio);
        if (ratio > 0 && a.muted) {
            a.muted = false;
            setMuted(false);
        }
    };

    const toggleMute = () => {
        const a = audioRef.current;
        if (!a) return;
        a.muted = !a.muted;
        setMuted(a.muted);
    };

    return (
        <>
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onLoadedMetadata={onLoaded}
                onTimeUpdate={onTime}
                onEnded={onEnded}
            />
            <div className={styles.audio} aria-live="polite">
                <button
                    type="button"
                    className={`${styles.play} ${isPlaying ? styles.playing : ""}`}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={togglePlay}
                    disabled={!src}
                />
                <span className={styles.time}>{fmt(time)}</span>

                <div
                    ref={barRef}
                    className={styles.track}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={dur || 0}
                    aria-valuenow={time}
                    onClick={seek}
                    title={isReady ? "Seek" : "Loading…"}
                >
                    <span className={styles.fill} style={{ width: `${progress * 100}%` }} />
                </div>

                <span className={styles.time}>{fmt(dur)}</span>

                <button
                    type="button"
                    className={`${styles.vol} ${muted ? styles.muted : ""}`}
                    aria-label={muted ? "Unmute" : "Mute"}
                    onClick={toggleMute}
                    disabled={!src}
                >
                    {muted ? (
                        <VolumeOffIcon sx={{ fontSize: 18, color: '#f29c56' }} />
                    ) : (
                        <VolumeUpIcon sx={{ fontSize: 18, color: '#f29c56' }} />
                    )}
                </button>

                <div
                    ref={volRef}
                    className={styles.trackSm}
                    onClick={changeVol}
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={muted ? 0 : volume}
                    title="Volume"
                >
                    <span className={styles.fill} style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
                </div>
            </div>
        </>
    );
}

function PricingChart() {
    const [playingId, setPlayingId] = useState(null);

    return (
        <section className={styles.section} aria-labelledby="pricing-chart">
            <Container className={styles.container}>
                <div className={styles.header}>
                    <h2 id="pricing-chart" className={styles.title}>
                        Pricing chart
                    </h2>
                    <span className={styles.rule} aria-hidden="true" />
                </div>

                <Row className="g-4 g-lg-5 justify-content-center">
                    {TIERS.map((t) => (
                        <Col key={t.key} lg={4} md={6} sm={12}>
                            <div className={styles.card}>
                                <div className={`${styles.ribbon} ${t.ribbonClass}`}>{t.title}</div>

                                <div className={styles.body}>
                                    <div className={styles.priceRow}>
                                        <span className={styles.price}>{t.price}</span>
                                        <span className={styles.currency}>{t.currency}</span>
                                    </div>
                                    <p className={styles.note}>price per minute of music</p>
                                </div>
                            </div>

                            {/* Trình phát nhạc thật */}
                            <AudioPlayer
                                id={t.key}
                                src={t.audioSrc}
                                playingId={playingId}
                                setPlayingId={setPlayingId}
                            />
                        </Col>
                    ))}
                </Row>
                {/* Hàng mũi tên chỉ xuống (3 cột) */}
                <div className={styles.arrowsGrid} aria-hidden="true">
                    <span className={styles.arrowDown} />
                    <span className={styles.arrowDown} />
                    <span className={styles.arrowDown} />
                </div>

                {/* Hàng dưới: 3 trang sheet */}
                <div className={styles.sheetsGrid}>
                    {SHEET_ITEMS.map((s) => (
                        <figure key={s.key} className={styles.sheetCard}>
                            <div className={styles.sheetPaper}>
                                <img src={s.img} alt={s.title} loading="lazy" />
                            </div>
                            <figcaption className={styles.sheetTitle}>{s.title}</figcaption>
                        </figure>
                    ))}
                </div>
            </Container>
        </section>
    );
}

export default memo(PricingChart);
