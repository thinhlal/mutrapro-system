// src/pages/Arrangement/ArrangementQuotePage.jsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Typography,
  Collapse,
  Button,
  Divider,
  Select,
  Tag,
  Slider,
  Checkbox,
  Drawer,
  Input,
  Empty,
  Space,
} from "antd";
import styles from "./ArrangementQuotePage.module.css";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import BackToTop from "../../components/common/BackToTop/BackToTop";

const { Title, Text } = Typography;

// ---- Pricing mock (có thể thay bằng API sau) ----
const PRICE_BASE = 25; // base cho 1 nhạc cụ, complexity = 1
const PRICE_PER_INSTRUMENT = 10;
const PRICE_PER_COMPLEXITY = 15; // mỗi bậc phức tạp
const PRICE_EDITABLE = 5;
const PRICE_VOCALIST = 20;

function calcPrice(instruments, complexity, editableFormats, withVocalist) {
  const items = [];
  const base = PRICE_BASE;
  items.push({ label: "Base arrangement", amount: base });

  const instExtra = Math.max(0, instruments.length - 1) * PRICE_PER_INSTRUMENT;
  if (instExtra)
    items.push({
      label: `Extra instruments x${instruments.length - 1}`,
      amount: instExtra,
    });

  const complexityFee = (complexity - 1) * PRICE_PER_COMPLEXITY;
  if (complexityFee > 0)
    items.push({
      label: `Complexity x${complexity - 1}`,
      amount: complexityFee,
    });

  const editableFee = (editableFormats?.length || 0) * PRICE_EDITABLE;
  if (editableFee)
    items.push({
      label: `Editable formats x${editableFormats.length}`,
      amount: editableFee,
    });

  if (withVocalist)
    items.push({
      label: "Include vocalist (recording add-on)",
      amount: PRICE_VOCALIST,
    });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  return { items, subtotal, total: subtotal };
}

export default function ArrangementQuotePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location?.state || {};
  const hasSource = !!navState?.fileName;

  // Source
  const [source, setSource] = useState({
    fileName: navState.fileName || "",
    fileType: navState.fileType || "",
    size: Number(navState.size) || 0,
    variant: navState.variant || "pure", // "pure" | "with_recording"
  });

  // Form options
  const [instruments, setInstruments] = useState([]);
  const [complexity, setComplexity] = useState(1); // 1–5
  const [editableFormats, setEditableFormats] = useState([]);
  const withVocalist = source.variant === "with_recording";
  const [lyricsProvided, setLyricsProvided] = useState(false);

  // NEW: state cho Drawer
  const [showCart, setShowCart] = useState(false);

  const price = useMemo(
    () => calcPrice(instruments, complexity, editableFormats, withVocalist),
    [instruments, complexity, editableFormats, withVocalist]
  );

  const canProceed = hasSource && instruments.length > 0;

  const clearSource = () => {
    setSource({ fileName: "", fileType: "", size: 0, variant: "pure" });
  };

  if (!hasSource) {
    return (
      <div className={styles.wrap}>
        <Title level={3}>No notation uploaded</Title>
        <Empty description="Please upload your notation on the previous page." />
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
    <>
      <Header />
      <div className={styles.wrap}>
        <Title level={2}>Arrangement — Files & Options</Title>

        <div className={styles.row}>
          <div className={styles.left}>
            {/* Không cần waveform; giữ khu vực trống hoặc thông tin hướng dẫn */}
            <div
              style={{
                padding: 12,
                border: "1px dashed #ddd",
                borderRadius: 8,
              }}
            >
              <Text type="secondary">
                Please review your instruments and complexity level. You can
                attach lyrics if vocalist is included.
              </Text>
            </div>
          </div>

          <div className={styles.right}>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <div className={styles.metaRow}>
                <Text strong>Notation File:</Text>
                <Input
                  value={source.fileName}
                  placeholder="Untitled"
                  onChange={(e) =>
                    setSource((s) => ({ ...s, fileName: e.target.value }))
                  }
                  variant="filled"
                  style={{ maxWidth: 360 }}
                  allowClear
                />
              </div>
              <div className={styles.metaRow}>
                <Text strong>Type:</Text>
                <Text>{source.fileType || "Unknown"}</Text>
              </div>

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
          defaultActiveKey={["instruments"]}
          items={[
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
                    { value: "strings", label: "Strings Section" },
                    { value: "brass", label: "Brass" },
                    { value: "winds", label: "Winds" },
                    { value: "rhythm", label: "Rhythm Section" },
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
              key: "complexity",
              label: <div className={styles.sectionTitle}>Complexity</div>,
              children: (
                <div className={styles.inlineRow}>
                  <div>
                    <Text strong>Complexity Level</Text>
                    <Slider
                      min={1}
                      max={5}
                      value={complexity}
                      onChange={setComplexity}
                      tooltip={{ formatter: (v) => `Level ${v}` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "editable",
              label: (
                <div className={styles.sectionTitle}>Editable Formats</div>
              ),
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
            ...(withVocalist
              ? [
                  {
                    key: "vocal",
                    label: <div className={styles.sectionTitle}>Vocalist</div>,
                    children: (
                      <Checkbox
                        checked={lyricsProvided}
                        onChange={(e) => setLyricsProvided(e.target.checked)}
                      >
                        I will provide lyrics (recommended for vocalist)
                      </Checkbox>
                    ),
                  },
                ]
              : []),
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
              onClick={() => setShowCart(true)}
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
          open={showCart}
          onClose={() => setShowCart(false)}
        >
          <div className={styles.cartGrid}>
            <div>
              <Title level={4} style={{ marginTop: 0 }}>
                {source.fileName || "Untitled"}
              </Title>
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
                  onClick={() => setShowCart(false)}
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
