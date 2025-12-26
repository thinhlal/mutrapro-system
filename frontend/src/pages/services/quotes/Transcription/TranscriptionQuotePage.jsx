import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Collapse,
  Segmented,
  Button,
  Divider,
  Checkbox,
  Drawer,
  Select,
  Tag,
  Slider,
  Input,
  Empty,
  Space,
  Radio,
  Card,
  Spin,
  message,
} from 'antd';
import toast from 'react-hot-toast';

import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import BackToTop from '../../../../components/common/BackToTop/BackToTop';
import {
  FEMALE_SINGERS_DATA,
  MALE_SINGERS_DATA,
} from '../../../../constants/index';
import { useInstrumentStore } from '../../../../stores/useInstrumentStore';
import styles from './TranscriptionQuotePage.module.css';

// === WaveSurfer
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

const { Title, Text } = Typography;

// ---- pricing helpers (mock; sẽ thay bằng API sau) ----
const UNIT_SECONDS = 15;
const PRICE_PER_15S = 7.5;
const FORMAT_PRICE = 5;

const toMMSS = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
    Math.floor(s % 60)
  ).padStart(2, '0')}`;

const ceilUnit = sec => Math.ceil(sec / UNIT_SECONDS) * UNIT_SECONDS;

function quote(durationSec, opts) {
  const billable = Math.max(UNIT_SECONDS, ceilUnit(durationSec || 0));
  const units = billable / UNIT_SECONDS;
  const base = units * PRICE_PER_15S;
  const items = [
    { label: `Base transcription (${toMMSS(billable)})`, amount: base },
  ];
  if (opts.includeChordSymbols)
    items.push({ label: 'Include chord symbols', amount: 5 });
  const editable = (opts.editableFormats?.length || 0) * FORMAT_PRICE;
  if (editable)
    items.push({
      label: `Editable formats x${opts.editableFormats.length}`,
      amount: editable,
    });
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  return { items, subtotal, total: subtotal };
}

function WaveformViewer({ src, initial, onReady, onSelectionChange, onApi }) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const regionRef = useRef(null);
  const [isPlaying, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 140,
      waveColor: '#bcd6ff',
      progressColor: '#3b82f6',
      cursorColor: '#ec8a1c',
      barWidth: 2,
      barGap: 1,
      responsive: true,
      plugins: [RegionsPlugin.create({ dragSelection: { slop: 5 } })],
    });
    wsRef.current = ws;

    ws.load(src).catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Failed to load audio:', error);
      }
    });

    ws.on('ready', () => {
      const d = ws.getDuration();
      setDur(d);
      onReady?.(d);

      const start = Math.max(0, initial?.startSec ?? 0);
      const end = Math.min(d, initial?.endSec ?? d);
      regionRef.current = ws.addRegion({
        id: 'selected',
        start,
        end,
        color: 'rgba(59,130,246,0.15)',
      });

      onSelectionChange?.({
        startSec: start,
        endSec: end,
        durationSec: Math.max(0, end - start),
      });

      // expose API
      onApi?.({
        setRegion: (s, e) => {
          const s1 = Math.max(0, Math.min(s, d));
          const e1 = Math.max(s1, Math.min(e, d));
          regionRef.current?.update({ start: s1, end: e1 });
        },
        playSelection: () => {
          const r = regionRef.current;
          if (r) ws.play(r.start, r.end);
        },
        playPause: () => ws.playPause(),
      });
    });

    ws.on('audioprocess', () => setCur(ws.getCurrentTime()));
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));

    ws.on('region-updated', r => {
      if (r.id !== 'selected') return;
      onSelectionChange?.({
        startSec: r.start,
        endSec: r.end,
        durationSec: Math.max(0, r.end - r.start),
      });
    });

    return () => {
      try {
        ws.destroy();
      } catch (error) {
        // Bỏ qua lỗi AbortError khi cleanup đang load audio
        if (error.name !== 'AbortError') {
          console.error('Wavesurfer cleanup error:', error);
        }
      }
      wsRef.current = null;
      regionRef.current = null;
    };
  }, [src]); // re-init when src changes

  return (
    <div>
      <div
        ref={containerRef}
        onClick={() => wsRef.current?.playPause()}
        style={{ background: '#1f1f1f', borderRadius: 8, cursor: 'pointer' }}
        title="Click waveform để Play/Pause"
      />
      <div
        style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}
      >
        <Button size="small" onClick={() => wsRef.current?.playPause()}>
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button size="small" onClick={() => onApi?.().playSelection?.()}>
          Play Selection
        </Button>
        <Text type="secondary">
          {toMMSS(cur)} / {toMMSS(dur)}
        </Text>
      </div>
    </div>
  );
}

// ===================== Page =====================
export default function TranscriptionQuotePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};

  // ===== Source từ trang uploader =====
  const [source, setSource] = useState({
    type: navState.sourceType || 'upload', // "upload" | "url"
    url: navState.url || '',
    fileName: navState.fileName || '',
    blobUrl: navState.blobUrl || '',
    durationSec: Number(navState.durationSec) || 0,
    serviceType: navState.serviceType || 'transcription',
  });

  // Nếu không có nguồn → hướng người dùng quay lại trang upload
  const hasSource = !!source.fileName || !!source.url;

  // ===== Duration/Selection khởi tạo =====
  const initialDuration = source.durationSec > 0 ? source.durationSec : 67; // fallback demo
  const [trackDuration, setTrackDuration] = useState(initialDuration);
  const [selection, setSelection] = useState({
    startSec: 0,
    endSec: initialDuration,
    durationSec: initialDuration,
  });

  // API từ WaveformViewer
  const waveApiRef = useRef(null);

  // ===== Tuỳ chọn =====
  const [copyright, setCopyright] = useState('other');
  const [instruments, setInstruments] = useState([]);
  const [includeChordSymbols, setIncludeChordSymbols] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [slowdown, setSlowdown] = useState(100);
  const [editableFormats, setEditableFormats] = useState([]);

  // ===== Instrument Store =====
  const {
    instruments: instrumentsData,
    loading: instrumentsLoading,
    error: instrumentsError,
    fetchInstruments,
    getInstrumentsByUsage,
  } = useInstrumentStore();

  // ===== Chọn ca sĩ (cho recording) =====
  const [singerGender, setSingerGender] = useState('female');
  const [selectedSinger, setSelectedSinger] = useState(null);

  const singersData =
    singerGender === 'female' ? FEMALE_SINGERS_DATA : MALE_SINGERS_DATA;

  // ===== Drawer + giá =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [price, setPrice] = useState({ items: [], subtotal: 0, total: 0 });

  // Fetch instruments on mount
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        await fetchInstruments();
      } catch (error) {
        toast.error('Cannot load instruments list. Please try again.', {
          duration: 5000,
          position: 'top-center',
        });
        console.error('Error fetching instruments:', error);
      }
    };

    loadInstruments();
  }, [fetchInstruments]);

  // Recalc price
  useEffect(() => {
    setPrice(
      quote(selection.durationSec, { includeChordSymbols, editableFormats })
    );
  }, [selection.durationSec, includeChordSymbols, editableFormats]);

  // Nhận lại state mới (nếu user quay lại upload rồi điều hướng tiếp)
  useEffect(() => {
    if (!navState) return;
    const dur =
      Number(navState.durationSec) > 0
        ? Number(navState.durationSec)
        : trackDuration;
    setTrackDuration(dur);
    setSelection({ startSec: 0, endSec: dur, durationSec: dur });
    setSource(prev => ({
      ...prev,
      type: navState.sourceType ?? prev.type,
      url: navState.url ?? prev.url,
      fileName: navState.fileName ?? prev.fileName,
      blobUrl: navState.blobUrl ?? prev.blobUrl,
      durationSec: Number(navState.durationSec) || prev.durationSec,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state]);

  const canProceed =
    hasSource &&
    selection.durationSec > 0 &&
    (source.serviceType === 'recording'
      ? selectedSinger !== null
      : instruments.length > 0);

  const clearSource = () => {
    setSource({
      type: 'upload',
      url: '',
      fileName: '',
      blobUrl: '',
      durationSec: 0,
    });
  };

  if (!hasSource) {
    return (
      <div className={styles.wrap}>
        <Title level={3}>No source selected</Title>
        <Empty description="Please upload a file or paste a link on the previous page." />
        <Button
          type="primary"
          onClick={() => navigate(-1)}
          style={{ marginTop: 12 }}
        >
          Go back to uploader
        </Button>
      </div>
    );
  }

  const playSrc = source.blobUrl || source.url;

  return (
    <>
      <div className={styles.wrap}>
        <Header />
        <Title level={2}>Song Selection & Information</Title>

        <div className={styles.row}>
          <div className={styles.left}>
            {/* Waveform + Regions */}
            <WaveformViewer
              src={playSrc}
              initial={{
                startSec: selection.startSec,
                endSec: selection.endSec,
              }}
              onReady={dur => {
                setTrackDuration(dur);
                if (!source.durationSec) {
                  setSource(s => ({ ...s, durationSec: dur }));
                }
              }}
              onSelectionChange={({ startSec, endSec, durationSec }) =>
                setSelection({ startSec, endSec, durationSec })
              }
              onApi={api => {
                waveApiRef.current = api;
                return api;
              }}
            />

            {/* Slider range đồng bộ 2 chiều với waveform */}
            <div style={{ marginTop: 12 }}>
              <Slider
                range
                min={0}
                max={Math.max(1, Math.floor(trackDuration))}
                step={1}
                value={[
                  Math.floor(selection.startSec),
                  Math.floor(selection.endSec),
                ]}
                tooltip={{
                  formatter: v =>
                    `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(
                      Math.floor(v % 60)
                    ).padStart(2, '0')}`,
                }}
                onChange={([start, end]) => {
                  setSelection({
                    startSec: start,
                    endSec: end,
                    durationSec: Math.max(0, end - start),
                  });
                }}
                onChangeComplete={([start, end]) => {
                  waveApiRef.current?.setRegion?.(start, end);
                }}
              />
            </div>

            <div className={styles.durationLine}>
              <Text type="secondary">Selected Duration:</Text>&nbsp;
              <Text strong>{toMMSS(selection.durationSec)}</Text>
            </div>
          </div>

          <div className={styles.right}>
            {/* Thông tin file — cho phép đổi tên hiển thị hoặc xoá nguồn */}
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div className={styles.metaRow}>
                <Text strong>Song Title:</Text>
                <Input
                  value={source.fileName}
                  placeholder="Untitled"
                  onChange={e =>
                    setSource(s => ({ ...s, fileName: e.target.value }))
                  }
                  variant="filled"
                  style={{ maxWidth: 320 }}
                  allowClear
                />
              </div>
              <div className={styles.metaRow}>
                <Text strong>Source Type:</Text>
                <Text>{source.type === 'url' ? 'Link' : 'File Upload'}</Text>
              </div>
              {source.url ? (
                <div className={styles.metaRow}>
                  <Text strong>URL:</Text>
                  <Text style={{ maxWidth: 320 }} ellipsis>
                    {source.url}
                  </Text>
                </div>
              ) : null}
              {source.durationSec > 0 && (
                <div className={styles.metaRow}>
                  <Text strong>Original Duration:</Text>
                  <Text>{toMMSS(source.durationSec)}</Text>
                </div>
              )}

              {/* Bỏ <audio>; waveform đã đảm nhiệm preview */}

              <div className={styles.rightAlign}>
                <Button danger type="text" onClick={clearSource}>
                  Remove source
                </Button>
                <Button
                  type="link"
                  onClick={() => navigate(-1)}
                  style={{ paddingLeft: 8 }}
                >
                  Change on previous page
                </Button>
              </div>
            </Space>
          </div>
        </div>

        <Divider />

        <Collapse
          bordered={false}
          defaultActiveKey={['copyright']}
          items={[
            {
              key: 'copyright',
              label: (
                <div className={styles.sectionTitle}>Copyright Information</div>
              ),
              children: (
                <div className={styles.sectionBody}>
                  <Text strong>Who owns the copyright to this song?</Text>
                  <div className={styles.block}>
                    <Segmented
                      value={copyright}
                      onChange={setCopyright}
                      options={[
                        { label: 'Someone else', value: 'other' },
                        {
                          label: 'Song is in the public domain',
                          value: 'public_domain',
                        },
                        { label: 'I own the copyright', value: 'owner' },
                      ]}
                    />
                  </div>
                  <div className={styles.rightAlign}>
                    <Button type="primary">Next</Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'what',
              label: (
                <div className={styles.sectionTitle}>
                  What Do You Want Us To Do?
                </div>
              ),
              children: <Text>Transcribe the song</Text>,
            },
            ...(source.serviceType === 'transcription'
              ? [
                  {
                    key: 'instruments',
                    label: (
                      <div className={styles.sectionTitle}>
                        Instrument Selection
                      </div>
                    ),
                    extra: (
                      <Text strong>{`+$${price.subtotal.toFixed(2)}`}</Text>
                    ),
                    children: (
                      <Spin spinning={instrumentsLoading}>
                        <Select
                          mode="multiple"
                          placeholder="Pick instruments (required)"
                          value={instruments}
                          onChange={setInstruments}
                          style={{ width: '100%' }}
                          options={getInstrumentsByUsage('transcription').map(
                            inst => ({
                              value: inst.instrumentId,
                              label: inst.instrumentName,
                            })
                          )}
                          tagRender={props => (
                            <Tag
                              closable={props.closable}
                              onClose={props.onClose}
                            >
                              {props.label}
                            </Tag>
                          )}
                          notFoundContent={
                            instrumentsError ? (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={instrumentsError}
                              />
                            ) : (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Không có nhạc cụ nào"
                              />
                            )
                          }
                        />
                      </Spin>
                    ),
                  },
                ]
              : []),
            ...(source.serviceType === 'recording'
              ? [
                  {
                    key: 'singer-selection',
                    label: (
                      <div className={styles.sectionTitle}>
                        Singer Selection
                      </div>
                    ),
                    children: (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          <Text strong>Select Gender:</Text>
                          <Radio.Group
                            value={singerGender}
                            onChange={e => {
                              setSingerGender(e.target.value);
                              setSelectedSinger(null);
                            }}
                            style={{ marginLeft: 16 }}
                          >
                            <Radio.Button value="female">Female</Radio.Button>
                            <Radio.Button value="male">Male</Radio.Button>
                          </Radio.Group>
                        </div>

                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                          <div className="row g-3">
                            {singersData.map(singer => (
                              <div
                                key={singer.id}
                                className="col-12 col-md-6 col-lg-4"
                              >
                                <Card
                                  hoverable
                                  onClick={() => setSelectedSinger(singer.id)}
                                  style={{
                                    border:
                                      selectedSinger === singer.id
                                        ? '2px solid #1890ff'
                                        : '1px solid #d9d9d9',
                                  }}
                                  cover={
                                    <img
                                      alt={singer.name}
                                      src={singer.image}
                                      style={{
                                        height: 200,
                                        objectFit: 'cover',
                                      }}
                                    />
                                  }
                                >
                                  <Card.Meta
                                    title={singer.name}
                                    description={
                                      <div>
                                        <div>{singer.location}</div>
                                        <div style={{ marginTop: 4 }}>
                                          {singer.roles.slice(0, 2).join(', ')}
                                        </div>
                                        <div style={{ marginTop: 4 }}>
                                          ⭐ {singer.rating} ({singer.reviews}{' '}
                                          reviews)
                                        </div>
                                      </div>
                                    }
                                  />
                                </Card>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: 'lyrics',
              label: (
                <div className={styles.sectionTitle}>Lyrics & Notations</div>
              ),
              collapsible:
                instruments.length > 0 || selectedSinger !== null
                  ? 'header'
                  : 'disabled',
              children: (
                <Checkbox
                  checked={includeChordSymbols}
                  onChange={e => setIncludeChordSymbols(e.target.checked)}
                >
                  Include Chord Symbols (+$5)
                </Checkbox>
              ),
            },
            {
              key: 'keytempo',
              label: <div className={styles.sectionTitle}>Key & Tempo</div>,
              collapsible:
                instruments.length > 0 || selectedSinger !== null
                  ? 'header'
                  : 'disabled',
              children: (
                <div className={styles.inlineRow}>
                  <div>
                    <Text strong>Transpose</Text>
                    <div>
                      <Slider
                        min={-6}
                        max={6}
                        value={transpose}
                        onChange={setTranspose}
                        tooltip={{ formatter: v => `${v} semitones` }}
                      />
                    </div>
                  </div>
                  <div>
                    <Text strong>Slowed Down Speed</Text>
                    <div>
                      <Slider
                        min={50}
                        max={100}
                        step={5}
                        value={slowdown}
                        onChange={setSlowdown}
                        tooltip={{ formatter: v => `${v}%` }}
                      />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'additional',
              label: (
                <div className={styles.sectionTitle}>
                  Additional Files & Information
                </div>
              ),
              collapsible:
                instruments.length > 0 || selectedSinger !== null
                  ? 'header'
                  : 'disabled',
              children: (
                <Select
                  mode="multiple"
                  value={editableFormats}
                  onChange={setEditableFormats}
                  placeholder="Editable formats (+$5 each)"
                  style={{ width: '100%' }}
                  options={[
                    { value: 'musicxml', label: 'MusicXML (.xml)' },
                    { value: 'midi', label: 'MIDI (.mid)' },
                    { value: 'sib', label: 'Sibelius (.sib)' },
                    { value: 'gp', label: 'Guitar Pro (.gp)' },
                    { value: 'musx', label: 'Finale (.musx)' },
                    { value: 'mscz', label: 'MuseScore (.mscz)' },
                    { value: 'dorico', label: 'Dorico' },
                  ]}
                />
              ),
            },
          ]}
        />

        <div className={styles.footerBar}>
          <div>
            <Text type="secondary">Current total</Text>
            <Title level={4} style={{ margin: 0 }}>
              ${price.total.toFixed(2)}
            </Title>
          </div>
          <div>
            <Button
              size="large"
              disabled={!canProceed}
              onClick={() => setDrawerOpen(true)}
              type="primary"
            >
              Review Cart
            </Button>
          </div>
        </div>

        <Drawer
          title="What's in your cart"
          placement="bottom"
          height={320}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <div className={styles.cartGrid}>
            <div>
              <Title level={4} style={{ marginTop: 0 }}>
                {source.fileName || 'Untitled'}
              </Title>
              <div className={styles.cartMeta}>
                <Text>Start Time: {toMMSS(selection.startSec)}</Text>
                <Text>End Time: {toMMSS(selection.endSec)}</Text>
                <Text>Total Duration: {toMMSS(selection.durationSec)}</Text>
              </div>
              <Divider />
              <ul className={styles.listDots}>
                {price.items.map((it, idx) => (
                  <li key={idx}>• {it.label}</li>
                ))}
              </ul>
            </div>

            <div className={styles.cartRight}>
              <div className={styles.totalLine}>
                <Text>Subtotal:</Text>
                <Text>${price.subtotal.toFixed(2)}</Text>
              </div>
              <div className={styles.totalLineStrong}>
                <Text strong>Total:</Text>
                <Text strong>${price.total.toFixed(2)}</Text>
              </div>
              <Divider />
              <div className={styles.rightAlign}>
                <Button
                  onClick={() => setDrawerOpen(false)}
                  style={{ marginRight: 8 }}
                >
                  Edit Order
                </Button>
                <Button type="primary" href="/checkout/review">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Drawer>
      </div>
      <Footer />
      <BackToTop />
    </>
  );
}
