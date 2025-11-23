// src/components/FlatEditor.jsx
import { useEffect, useRef, useState } from 'react';
import Embed from 'flat-embed';
import { Button, Card, Space, Upload, message, Alert } from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  FileTextOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import styles from './FlatEditor.module.css';

// Piano C-major 4/4, 2 ô nhịp — demo siêu gọn
const DEMO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="90"/>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <barline location="right"><bar-style>light-heavy</bar-style></barline>
    </measure>
  </part>
</score-partwise>`;

export default function FlatEditor() {
  const hostRef = useRef(null);
  const [embed, setEmbed] = useState(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const instance = new Embed(hostRef.current, {
      embedParams: {
        appId: import.meta.env.VITE_FLAT_APP_ID,
        mode: 'edit',
        controlsPosition: 'bottom',
      },
    });

    instance
      .ready()
      .then(() => setReady(true))
      .catch(e => setErr(e?.message || 'Init failed'));

    setEmbed(instance);
  }, []);

  // ✅ Sửa handler: .mxl là file nén -> đọc bằng arrayBuffer
  const handleUpload = async e => {
    if (!embed) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const name = (file.name || '').toLowerCase();
      if (name.endsWith('.mid') || name.endsWith('.midi')) {
        const buf = new Uint8Array(await file.arrayBuffer());
        await embed.loadMIDI(buf);
      } else if (name.endsWith('.mxl')) {
        // compressed MusicXML
        const buf = new Uint8Array(await file.arrayBuffer());
        await embed.loadMusicXML(buf);
      } else {
        const text = await file.text(); // .musicxml / .xml
        await embed.loadMusicXML(text);
      }
    } catch (e2) {
      alert('Load file lỗi: ' + (e2?.message || String(e2)));
    } finally {
      e.target.value = '';
    }
  };

  const exportXML = async () => {
    const data = await embed.getMusicXML({ compressed: true });
    const blob = new Blob([data], {
      type: 'application/vnd.recordare.musicxml+xml',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'score.musicxml';
    a.click();
  };

  const exportMIDI = async () => {
    const data = await embed.getMIDI();
    const blob = new Blob([data], { type: 'audio/midi' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'score.mid';
    a.click();
  };

  // 👉 NEW: nạp bản demo
  const loadDemo = async () => {
    if (!embed) return;
    await embed.loadMusicXML(DEMO_XML);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.header} bordered={false}>
        <Space wrap>
          <Upload
            accept=".musicxml,.xml,.mxl,.mid,.midi"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={info => {
              const file = info.file.originFileObj || info.file;
              handleUpload({ target: { files: [file] } });
            }}
          >
            <Button icon={<UploadOutlined />} type="primary">
              Upload MusicXML/MIDI
            </Button>
          </Upload>

          <Button onClick={loadDemo}>Load Demo</Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => embed?.play()}
          >
            Play
          </Button>
          <Button icon={<PauseCircleOutlined />} onClick={() => embed?.pause()}>
            Pause
          </Button>
          <Button danger icon={<StopOutlined />} onClick={() => embed?.stop()}>
            Stop
          </Button>
          <Button icon={<FileTextOutlined />} onClick={exportXML}>
            Export XML
          </Button>
          <Button icon={<AudioOutlined />} onClick={exportMIDI}>
            Export MIDI
          </Button>
        </Space>
      </Card>

      {err && (
        <Alert
          message="Error"
          description={err}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {!ready && (
        <Alert
          message="Loading editor..."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card className={styles.editorContainer} bordered={false}>
        <div ref={hostRef} className={styles.iframe} />
      </Card>
    </div>
  );
}
