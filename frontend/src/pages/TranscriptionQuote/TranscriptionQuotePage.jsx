import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
} from "antd";
import styles from "./TranscriptionQuotePage.module.css";
import WaveformRangePicker from "./components/WaveformRangePicker/WaveformRangePicker";

const { Title, Text } = Typography;

// ---- pricing helpers (mock; sẽ thay bằng API sau) ----
const UNIT_SECONDS = 15;
const PRICE_PER_15S = 7.5;
const FORMAT_PRICE = 5;
const toMMSS = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;
const ceilUnit = (sec) => Math.ceil(sec / UNIT_SECONDS) * UNIT_SECONDS;

function quote(durationSec, opts) {
  const billable = Math.max(UNIT_SECONDS, ceilUnit(durationSec || 0));
  const units = billable / UNIT_SECONDS;
  const base = units * PRICE_PER_15S;
  const items = [
    { label: `Base transcription (${toMMSS(billable)})`, amount: base },
  ];
  if (opts.includeChordSymbols)
    items.push({ label: "Include chord symbols", amount: 5 });
  const editable = (opts.editableFormats?.length || 0) * FORMAT_PRICE;
  if (editable)
    items.push({
      label: `Editable formats x${opts.editableFormats.length}`,
      amount: editable,
    });
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  return { items, subtotal, total: subtotal };
}

export default function TranscriptionQuotePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};

  // ===== Source từ trang uploader =====
  const [source, setSource] = useState({
    type: navState.sourceType || "upload", // "upload" | "url"
    url: navState.url || "",
    fileName: navState.fileName || "",
    blobUrl: navState.blobUrl || "",
    durationSec: Number(navState.durationSec) || 0,
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

  // ===== Tuỳ chọn =====
  const [copyright, setCopyright] = useState("other");
  const [instruments, setInstruments] = useState([]);
  const [includeChordSymbols, setIncludeChordSymbols] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [slowdown, setSlowdown] = useState(100);
  const [editableFormats, setEditableFormats] = useState([]);

  // ===== Drawer + giá =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [price, setPrice] = useState({ items: [], subtotal: 0, total: 0 });

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
    setSource((prev) => ({
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
    hasSource && selection.durationSec > 0 && instruments.length > 0;

  const clearSource = () => {
    setSource({
      type: "upload",
      url: "",
      fileName: "",
      blobUrl: "",
      durationSec: 0,
    });
    // Optionally: quay lại trang upload
    // navigate("/from-sound-to-sheet"); // sửa path đúng route của bạn nếu muốn bắt quay lại
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

  return (
    <div className={styles.wrap}>
      <Title level={2}>Song Selection & Information</Title>

      <div className={styles.row}>
        <div className={styles.left}>
          <WaveformRangePicker
            // Nếu bạn dùng wavesurfer thật, có thể truyền thêm blobUrl/url để phát preview
            totalSeconds={trackDuration}
            value={[selection.startSec, selection.endSec]}
            onChange={(start, end) =>
              setSelection({
                startSec: start,
                endSec: end,
                durationSec: Math.max(0, end - start),
              })
            }
          />
          <div className={styles.durationLine}>
            <Text type="secondary">Selected Duration:</Text>&nbsp;
            <Text strong>{toMMSS(selection.durationSec)}</Text>
          </div>
        </div>

        <div className={styles.right}>
          {/* Thông tin file — cho phép đổi tên hiển thị hoặc xoá nguồn */}
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <div className={styles.metaRow}>
              <Text strong>Song Title:</Text>
              <Input
                value={source.fileName}
                placeholder="Untitled"
                onChange={(e) =>
                  setSource((s) => ({ ...s, fileName: e.target.value }))
                }
                variant="filled"
                style={{ maxWidth: 320 }}
                allowClear
              />
            </div>
            <div className={styles.metaRow}>
              <Text strong>Source Type:</Text>
              <Text>{source.type === "url" ? "Link" : "File Upload"}</Text>
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

            {source.blobUrl && (
              <audio
                controls
                src={source.blobUrl}
                className={styles.audioPreview}
              />
            )}

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
        defaultActiveKey={["copyright"]}
        items={[
          {
            key: "copyright",
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
                      { label: "Someone else", value: "other" },
                      {
                        label: "Song is in the public domain",
                        value: "public_domain",
                      },
                      { label: "I own the copyright", value: "owner" },
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
            key: "what",
            label: (
              <div className={styles.sectionTitle}>
                What Do You Want Us To Do?
              </div>
            ),
            children: <Text>Transcribe the song</Text>,
          },
          {
            key: "instruments",
            label: (
              <div className={styles.sectionTitle}>Instrument Selection</div>
            ),
            extra: <Text strong>{`+$${price.subtotal.toFixed(2)}`}</Text>,
            children: (
              <Select
                mode="multiple"
                placeholder="Pick instruments (required)"
                value={instruments}
                onChange={setInstruments}
                style={{ width: "100%" }}
                options={[
                  { value: "piano", label: "Piano" },
                  { value: "guitar", label: "Guitar" },
                  { value: "violin", label: "Violin" },
                  { value: "bass", label: "Bass" },
                  { value: "drums", label: "Drums" },
                  { value: "vocal", label: "Vocal" },
                ]}
                tagRender={(props) => (
                  <Tag closable={props.closable} onClose={props.onClose}>
                    {props.label}
                  </Tag>
                )}
              />
            ),
          },
          {
            key: "lyrics",
            label: (
              <div className={styles.sectionTitle}>Lyrics & Notations</div>
            ),
            collapsible: instruments.length ? "header" : "disabled",
            children: (
              <Checkbox
                checked={includeChordSymbols}
                onChange={(e) => setIncludeChordSymbols(e.target.checked)}
              >
                Include Chord Symbols (+$5)
              </Checkbox>
            ),
          },
          {
            key: "keytempo",
            label: <div className={styles.sectionTitle}>Key & Tempo</div>,
            collapsible: instruments.length ? "header" : "disabled",
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
                      tooltip={{ formatter: (v) => `${v} semitones` }}
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
                      tooltip={{ formatter: (v) => `${v}%` }}
                    />
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "additional",
            label: (
              <div className={styles.sectionTitle}>
                Additional Files & Information
              </div>
            ),
            collapsible: instruments.length ? "header" : "disabled",
            children: (
              <Select
                mode="multiple"
                value={editableFormats}
                onChange={setEditableFormats}
                placeholder="Editable formats (+$5 each)"
                style={{ width: "100%" }}
                options={[
                  { value: "musicxml", label: "MusicXML (.xml)" },
                  { value: "midi", label: "MIDI (.mid)" },
                  { value: "sib", label: "Sibelius (.sib)" },
                  { value: "gp", label: "Guitar Pro (.gp)" },
                  { value: "musx", label: "Finale (.musx)" },
                  { value: "mscz", label: "MuseScore (.mscz)" },
                  { value: "dorico", label: "Dorico" },
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
              {source.fileName || "Untitled"}
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
  );
}
