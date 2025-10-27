// src/pages/ServiceRequest/components/RecordingUploader/RecordingUploader.jsx
import { useState } from "react";
import { Upload, Space, Tag, Button, message } from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./RecordingUploader.module.css";
const { Dragger } = Upload;

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "—";

export default function RecordingUploader() {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();

  const beforeUpload = () => false;
  const onChange = ({ fileList }) => {
    setFiles(fileList.map((it) => it.originFileObj).filter(Boolean));
  };
  const clearAll = () => setFiles([]);

  const onContinue = () => {
    const payload = files.map((f) => ({
      fileName: f.name,
      fileType: f.type || "unknown",
      size: f.size || 0,
    }));
    navigate("/recording/quote", { state: { files: payload } });
  };

  return (
    <section
      id="recording-uploader"
      className={styles.wrapper}
      aria-labelledby="rec-title"
    >
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.iconBadge} aria-hidden>
            <span className={styles.musicIcon}>♪</span>
          </div>
          <div className={styles.headings}>
            <h2 id="rec-title" className={styles.title}>
              Recording: Reference Uploads (Optional)
            </h2>
            <p className={styles.desc}>
              You may upload lyrics / guide audio / notation to help the session
              run smoothly.
            </p>
          </div>
        </div>

        <div className={styles.dragRow}>
          <Dragger
            name="files"
            multiple
            beforeUpload={beforeUpload}
            accept="audio/*,video/*,.midi,.mid,.musicxml,.xml,.pdf,.txt"
            className={styles.dragger}
            itemRender={() => null}
            onChange={onChange}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Drag & drop optional references</p>
            <p className="ant-upload-hint">Lyrics / guide audio / notation</p>
          </Dragger>
        </div>

        {files.length > 0 && (
          <div className={styles.selectedBox} role="status" aria-live="polite">
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {files.map((f, idx) => (
                <div className={styles.fileLine} key={idx}>
                  <Space wrap>
                    <FileTextOutlined />
                    <b>{f.name}</b>
                    <Tag>{f.type || "unknown"}</Tag>
                    <span>{toSize(f.size)}</span>
                  </Space>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={clearAll}
                  danger
                  type="text"
                >
                  Remove all
                </Button>
              </div>
            </Space>
          </div>
        )}

        <div className={styles.actionRow}>
          <Button
            type="primary"
            size="large"
            className={styles.ctaBtn}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </section>
  );
}
