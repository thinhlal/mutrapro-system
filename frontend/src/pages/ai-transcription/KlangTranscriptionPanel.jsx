import React, { useState } from "react";
import {
  Card,
  Upload,
  Button,
  Select,
  Space,
  Typography,
  Tag,
  Alert,
} from "antd";
import { UploadOutlined, PlayCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { KLANG_MODELS } from "../../config/klangConfig.js";
import { useKlangTranscriptionStore } from "../../stores/useKlangTranscriptionStore.js";
import Header from "../../components/common/Header/Header.jsx";

const { Text, Title } = Typography;

const KlangTranscriptionPanel = () => {
  const [file, setFile] = useState(null);

  const {
    model,
    setModel,
    jobId,
    status,
    loading,
    error,
    createTranscription,
    downloadResult,
    reset,
  } = useKlangTranscriptionStore();

  const handleBeforeUpload = (file) => {
    setFile(file);
    reset();
    return false; // không upload lên server, giữ file trong state
  };

  const handleTranscribe = () => {
    if (!file) {
      alert("Chọn file audio trước đã nhé");
      return;
    }
    createTranscription(file);
  };

  const statusColor = {
    CREATING: "default",
    IN_QUEUE: "orange",
    IN_PROGRESS: "processing",
    COMPLETED: "green",
    FAILED: "red",
  }[status];

  return (
    <>
    <Header />
    <Card
      title="Klangio Auto Transcription Demo"
      style={{ maxWidth: 1400, margin: "140px auto" }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={5}>1. Chọn nhạc cụ (Model)</Title>
          <Select
            style={{ width: "100%" }}
            value={model}
            onChange={setModel}
            options={KLANG_MODELS}
          />
          <Text type="secondary">
            Đây là param <code>model</code> trong API: piano, guitar, vocal,
            detect, ...
          </Text>
        </div>

        <div>
          <Title level={5}>2. Chọn file audio (≤ 15s cho free plan)</Title>
          <Upload
            beforeUpload={handleBeforeUpload}
            maxCount={1}
            accept="audio/*"
          >
            <Button icon={<UploadOutlined />}>Chọn file audio</Button>
          </Upload>
          {file && (
            <Text style={{ display: "block", marginTop: 8 }}>
              File đã chọn: <b>{file.name}</b> ({(file.size / 1024).toFixed(1)} KB)
            </Text>
          )}
        </div>

        <div>
          <Title level={5}>3. Gửi lên Klangio để kí âm</Title>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleTranscribe}
            loading={loading}
            disabled={!file}
          >
            Transcribe
          </Button>
        </div>

        {jobId && (
          <div>
            <Title level={5}>4. Trạng thái job</Title>
            <Space direction="vertical">
              <Text>
                Job ID: <code>{jobId}</code>
              </Text>
              {status && (
                <Tag color={statusColor || "default"}>Status: {status}</Tag>
              )}
              {status === "COMPLETED" && (
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadResult("xml")}
                  >
                    Download MusicXML
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadResult("midi")}
                  >
                    Download MIDI
                  </Button>
                </Space>
              )}
            </Space>
          </div>
        )}

        {error && (
          <Alert
            type="error"
            message="Có lỗi xảy ra"
            description={error}
            showIcon
          />
        )}
      </Space>
    </Card>
    </>
  );
};

export default KlangTranscriptionPanel;
