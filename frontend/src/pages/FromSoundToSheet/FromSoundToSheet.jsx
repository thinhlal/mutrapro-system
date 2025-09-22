import React from "react";
import styles from "./FromSoundToSheet.module.css";

import Guitarist from "../../assets/images/FromSoundToSheet/homeBannerTunescribersTeam.webp";
import Grid from "../../assets/images/FromSoundToSheet/homeBannerGridVector.webp";
import SheetLines from "../../assets/images/FromSoundToSheet/SheetMusicLines.75c14829.svg";
import Wave from "../../assets/images/FromSoundToSheet/MusicLines.svg";
import Header from "../../components/common/Header/Header";
import QuoteUploader from "./components/QuoteUploader/QuoteUploader";
import BackToTop from "../../components/common/BackToTop/BackToTop";
import Footer from "../../components/common/Footer/Footer";

export default function FromSoundToSheet() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="fst-title">
        {/* background grid */}
        <Header />
        <img
          src={Grid}
          alt=""
          aria-hidden="true"
          className={styles.grid}
          loading="eager"
        />

        <div className={styles.container}>
          <h1 id="fst-title" className={styles.title}>
            From Sound to Sheet
          </h1>
          <p className={styles.subtitle}>Fast. Accurate. Human.</p>

          {/* CTA pill */}
          <div
            className={styles.ctaPill}
            role="group"
            aria-label="Order transcription"
          >
            <div className={styles.ctaText}>
              <strong>Play it Right!</strong>
              <span>Get your song transcribed by our experts.</span>
            </div>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => {
                const el = document.getElementById("quote-uploader");
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Order Now <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        {/* visual band: waveform + guitarist + sheet lines */}
        <div className={styles.visualBand} aria-hidden="true">
          <img src={Wave} alt="" className={styles.waveLeft} />
          <img
            src={Guitarist}
            alt=""
            className={styles.guitarist}
            loading="lazy"
          />
          <img src={Wave} alt="" className={styles.waveRight} />
          {/* <img src={SheetLines} alt="" className={styles.sheetLines} /> */}
        </div>
      </section>
      <QuoteUploader />
      <Footer />
      <BackToTop />
    </>
  );
}
