import { useEffect, useRef, useState } from 'react';
import Embed from 'flat-embed';
import { Button, Card, Space, Upload, Alert, Form, Input, Select, InputNumber, Typography, Divider, Modal } from 'antd';
import { UploadOutlined, PlayCircleOutlined, PauseCircleOutlined, StopOutlined, FileTextOutlined, FileImageOutlined, PlusOutlined, CloseOutlined, AudioOutlined } from '@ant-design/icons';
import styles from './FlatDemo.module.css';

export default function FlatDemo() {
  const hostRef = useRef(null);
  const fileRef = useRef(null);
  const [embed, setEmbed] = useState(null);
  const [ready, setReady] = useState(false);

  // ==== form Create ====
  const [modalVisible, setModalVisible] = useState(false);
  const [instruments, setInstruments] = useState(['Piano']);
  const [beats, setBeats] = useState('4');
  const [beatType, setBeatType] = useState('4');
  const [tempo, setTempo] = useState('90');
  const [keyFifths, setKeyFifths] = useState('0');

  useEffect(() => {
    if (!hostRef.current) return;

    const instance = new Embed(hostRef.current, {
      height: '500px',
      embedParams: {
        appId: import.meta.env.VITE_FLAT_APP_ID,
        mode: 'edit',
        controlsPosition: 'top',
        branding: false,
      },
    });

    instance
      .ready()
      .then(() => {
        setEmbed(instance);
        setReady(true);
      })
      .catch(e => console.error('Embed init failed:', e));
  }, []);

  // ================== CREATE FLOW ==================

  const INSTRUMENTS = {
    Piano: {
      staves: 2,
      parts: [
        { clef: { sign: 'G', line: 2 } },
        { clef: { sign: 'F', line: 4 } },
      ],
      midi: 1,
      partName: 'Piano',
    },
    Violin: {
      staves: 1,
      parts: [{ clef: { sign: 'G', line: 2 } }],
      midi: 41,
      partName: 'Violin',
    },
    Flute: {
      staves: 1,
      parts: [{ clef: { sign: 'G', line: 2 } }],
      midi: 74,
      partName: 'Flute',
    },
    Guitar: {
      staves: 1,
      parts: [{ clef: { sign: 'G', line: 2 } }],
      midi: 25,
      partName: 'Guitar',
    },
    Bass: {
      staves: 1,
      parts: [{ clef: { sign: 'F', line: 4 } }],
      midi: 33,
      partName: 'Bass',
    },
    Drums: {
      staves: 1,
      parts: [{ clef: { sign: 'percussion', line: 2 } }],
      midi: 118,
      partName: 'Drumset',
    },
  };

  // Tạo MusicXML rỗng (1 ô nhịp) theo lựa chọn nhiều nhạc cụ
  const makeMusicXML = () => {
    const partsList = instruments
      .map((name, idx) => {
        const info = INSTRUMENTS[name] || INSTRUMENTS.Piano;
        const id = `P${idx + 1}`;
        return `
      <score-part id="${id}">
        <part-name>${info.partName}</part-name>
        <score-instrument id="${id}-I1"><instrument-name>${info.partName}</instrument-name></score-instrument>
        <midi-instrument id="${id}-I1"><midi-program>${info.midi}</midi-program></midi-instrument>
      </score-part>`;
      })
      .join('');

    const partsBody = instruments
      .map((name, idx) => {
        const info = INSTRUMENTS[name] || INSTRUMENTS.Piano;
        const id = `P${idx + 1}`;
        const attrs =
          info.staves === 2
            ? `
            <staves>2</staves>
            <clef number="1"><sign>${info.parts[0].clef.sign}</sign><line>${info.parts[0].clef.line}</line></clef>
            <clef number="2"><sign>${info.parts[1].clef.sign}</sign><line>${info.parts[1].clef.line}</line></clef>`
            : `
            <clef><sign>${info.parts[0].clef.sign}</sign><line>${info.parts[0].clef.line}</line></clef>`;

        return `
      <part id="${id}">
        <measure number="1">
          <attributes>
            <divisions>1</divisions>
            <key><fifths>${keyFifths}</fifths></key>
            <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
            ${attrs}
          </attributes>
          <sound tempo="${tempo}"/>
          <!-- ô nhịp đầu tiên trống -->
          <barline location="right"><bar-style>regular</bar-style></barline>
        </measure>
      </part>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>${partsList}
  </part-list>
  ${partsBody}
</score-partwise>`;
  };

  const handleCreate = async () => {
    if (!embed) return;
    try {
      const xml = makeMusicXML();
      await embed.loadMusicXML(xml);
      setModalVisible(false);
    } catch (e) {
      console.error(e);
      alert('Không tạo được bản mới: ' + (e?.message || String(e)));
    }
  };

  // ================== UPLOAD / EXPORT ==================
  const openPicker = () => fileRef.current?.click();

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
        const buf = new Uint8Array(await file.arrayBuffer());
        await embed.loadMusicXML(buf);
      } else {
        const text = await file.text();
        await embed.loadMusicXML(text);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể nạp file: ' + (err?.message || String(err)));
    } finally {
      e.target.value = '';
    }
  };

  const exportXML = async () => {
    if (!embed) return;
    const buf = await embed.getMusicXML({ compressed: true });
    download(buf, 'application/vnd.recordare.musicxml+xml', 'mxl');
  };
  const exportMIDI = async () => {
    if (!embed) return;
    const buf = await embed.getMIDI();
    download(buf, 'audio/midi', 'mid');
  };
  const exportPNG = async () => {
    if (!embed) return;
    const buf = await embed.getPNG();
    download(buf, 'image/png', 'png');
  };
  const download = (buffer, mime, ext) => {
    const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `score.${ext}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ================== UI ==================
  return (
    <div className={styles.container}>
      <Card className={styles.header} bordered={false}>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Create New Score
          </Button>

          <Upload
            accept=".musicxml,.xml,.mxl,.mid,.midi"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={(info) => {
              const file = info.file.originFileObj || info.file;
              handleUpload({ target: { files: [file] } });
            }}
          >
            <Button icon={<UploadOutlined />}>
              Upload (XML/MXL/MIDI)
            </Button>
          </Upload>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => embed?.play()}
          >
            Play
          </Button>
          <Button
            icon={<PauseCircleOutlined />}
            onClick={() => embed?.pause()}
          >
            Pause
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            onClick={() => embed?.stop()}
          >
            Stop
          </Button>

          <Button
            icon={<FileTextOutlined />}
            onClick={exportXML}
          >
            Export XML
          </Button>
          <Button
            icon={<AudioOutlined />}
            onClick={exportMIDI}
          >
            Export MIDI
          </Button>
          <Button
            icon={<FileImageOutlined />}
            onClick={exportPNG}
          >
            Export PNG
          </Button>
        </Space>
      </Card>

      {/* Create New Score Modal */}
      <Modal
        title="Create New Musical Score"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical" className={styles.modalForm}>
          <div className={styles.formGrid}>
            <Form.Item label="Instruments">
              <Select
                mode="multiple"
                value={instruments}
                onChange={setInstruments}
                placeholder="Select instruments"
                style={{ height: 120 }}
              >
                {Object.keys(INSTRUMENTS).map(k => (
                  <Select.Option key={k} value={k}>
                    {k}
                  </Select.Option>
                ))}
              </Select>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Hold Ctrl/⌘ to select multiple instruments
              </Typography.Text>
            </Form.Item>

            <Form.Item label="Time Signature">
              <Space.Compact>
                <InputNumber
                  value={beats}
                  onChange={setBeats}
                  placeholder="4"
                  min={1}
                  max={32}
                  style={{ width: '50%' }}
                />
                <Input
                  value="/"
                  readOnly
                  style={{ width: '10%', textAlign: 'center', borderLeft: 0, borderRight: 0 }}
                />
                <InputNumber
                  value={beatType}
                  onChange={setBeatType}
                  placeholder="4"
                  min={1}
                  max={32}
                  style={{ width: '40%' }}
                />
              </Space.Compact>
            </Form.Item>

            <Form.Item label="Key Signature (fifths)">
              <InputNumber
                value={keyFifths}
                onChange={setKeyFifths}
                placeholder="0"
                min={-7}
                max={7}
                style={{ width: '100%' }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                0=C, 1=G, -1=F, etc.
              </Typography.Text>
            </Form.Item>

            <Form.Item label="Tempo (BPM)">
              <InputNumber
                value={tempo}
                onChange={setTempo}
                placeholder="120"
                min={20}
                max={300}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          <Divider />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleCreate}>
              Create New Score
            </Button>
          </Space>
        </Form>
      </Modal>

      {!ready && (
        <Alert
          message="Loading music editor..."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card className={styles.editorContainer} bordered={false}>
        <div
          ref={hostRef}
          className={styles.iframe}
        />
      </Card>
    </div>
  );
}
