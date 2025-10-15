import { useState, useCallback } from "react";
import { Input, Upload, Button, Tooltip } from "antd";
import {
  InboxOutlined,
  LinkOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import styles from "./QuoteUploader.module.css";

const { Dragger } = Upload;

export default function QuoteUploader() {
  const [linkValue, setLinkValue] = useState("");

  const beforeUpload = useCallback(() => false, []);

  return (
    <section
      id="quote-uploader"
      className={styles.wrapper}
      aria-labelledby="quote-title"
    >
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.iconBadge} aria-hidden>
            <span className={styles.musicIcon}>♪</span>
          </div>
          <div className={styles.headings}>
            <h2 id="quote-title" className={styles.title}>
              Sheet Music Transcription
            </h2>
            <p className={styles.desc}>
              We convert your song into precise sheet music for your chosen
              instruments.
            </p>
          </div>
        </div>

        <p className={styles.supportText}>
          We support multiple platforms like Soundcloud, Spotify, YouTube, etc.
        </p>

        <Input
          size="large"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          placeholder="Paste your link here..."
          prefix={<LinkOutlined />}
          className={styles.linkInput}
          aria-label="Paste music link"
        />

        <div className={styles.dragRow}>
          <Dragger
            name="file"
            multiple
            beforeUpload={beforeUpload}
            accept="audio/*,video/*"
            className={styles.dragger}
            itemRender={() => null}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Drag & drop your music files to upload
            </p>
            <p className="ant-upload-hint">or click to browse</p>
          </Dragger>
        </div>

        <div className={styles.actionRow}>
          <Tooltip title="Get pricing instantly" zIndex={0}>
            <Button type="primary" size="large" className={styles.ctaBtn}>
              Get an Instant Quote <ArrowRightOutlined />
            </Button>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}
