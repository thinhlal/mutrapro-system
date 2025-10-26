// src/pages/FromSoundToSheet/components/QuoteUploader/QuoteUploader.jsx
import { useState, useCallback } from "react";
import { Input, Upload, Button, Tooltip, message, Tag, Space } from "antd";
import {
  InboxOutlined,
  LinkOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./QuoteUploader.module.css";
import { getMediaDurationSec } from "../../../../utils/getMediaDuration";

const { Dragger } = Upload;

const toMMSS = (s = 0) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;
const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "—";

export default function QuoteUploader() {
  const [linkValue, setLinkValue] = useState("");
  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [durationSec, setDurationSec] = useState(null); // null = chưa đo, number = đã đo
  const navigate = useNavigate();

  const beforeUpload = useCallback(() => false, []);

  const onDraggerChange = async ({ fileList }) => {
    const f = fileList?.[0]?.originFileObj || null;
    if (!f) {
      // đã xoá
      clearFile();
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setBlobUrl(url);

    // Đo duration (nếu fail vẫn ok)
    try {
      const sec = await getMediaDurationSec(f);
      setDurationSec(sec);
    } catch {
      setDurationSec(0);
    }
  };

  const clearFile = () => {
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }
    setFile(null);
    setBlobUrl("");
    setDurationSec(null);
  };

  const goQuote = async () => {
    if (!file && !linkValue.trim()) {
      message.warning("Please paste a link or upload a file.");
      return;
    }

    const state = {
      sourceType: file ? "upload" : "url",
      fileName: file ? file.name : "",
      url: file ? "" : linkValue.trim(),
      durationSec: 0,
      blobUrl: "",
    };

    try {
      if (file) {
        // nếu chưa đo xong thì đo nốt; nếu đã có thì dùng luôn
        const sec =
          typeof durationSec === "number"
            ? durationSec
            : await getMediaDurationSec(file);
        state.durationSec = sec || 0;
        state.blobUrl = blobUrl || URL.createObjectURL(file);
      } else if (state.url) {
        state.durationSec = await getMediaDurationSec(state.url);
      }
    } catch {
      // giữ durationSec = 0 rồi điều hướng
    }

    navigate("/transcription/quote", { state });
  };

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

        {/* <Input
          size="large"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          placeholder="Paste your link here..."
          prefix={<LinkOutlined />}
          className={styles.linkInput}
          aria-label="Paste music link"
          disabled={!!file} 
        /> */}

        <div className={styles.dragRow}>
          <Dragger
            name="file"
            multiple={false}
            beforeUpload={beforeUpload}
            accept="audio/*,video/*,.midi,.mid,.musicxml,.xml"
            className={styles.dragger}
            itemRender={() => null}
            onChange={onDraggerChange}
            disabled={!!file} // đã có file thì khoá dragger để tránh nhầm
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

        {/* Hiển thị file đã chọn */}
        {file && (
          <div className={styles.selectedBox} role="status" aria-live="polite">
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <div className={styles.fileLine}>
                <Space wrap>
                  <FileTextOutlined />
                  <b>{file.name}</b>
                  <Tag>{file.type || "unknown"}</Tag>
                  <span>{toSize(file.size)}</span>
                  <span>
                    • Duration:{" "}
                    {durationSec == null ? "…" : toMMSS(durationSec || 0)}
                  </span>
                </Space>
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={clearFile}
                  danger
                  type="text"
                >
                  Remove
                </Button>
              </div>

              {blobUrl &&
                (file.type?.startsWith("audio/") ||
                  file.type?.startsWith("video/")) && (
                  <audio
                    controls
                    src={blobUrl}
                    className={styles.audioPreview}
                    aria-label="Audio preview"
                  />
                )}
            </Space>
          </div>
        )}

        <div className={styles.actionRow}>
          <Tooltip title="Get pricing instantly" zIndex={0}>
            <Button
              type="primary"
              size="large"
              className={styles.ctaBtn}
              onClick={goQuote}
              htmlType="button"
            >
              Get an Instant Quote <ArrowRightOutlined />
            </Button>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}
