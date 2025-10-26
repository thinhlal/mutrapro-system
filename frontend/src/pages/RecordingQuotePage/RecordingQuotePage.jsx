// src/pages/Recording/RecordingQuotePage.jsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Typography,
  Collapse,
  Button,
  Divider,
  Slider,
  Checkbox,
  Drawer,
  Empty,
  Space,
} from "antd";
import styles from "./RecordingQuotePage.module.css";

const { Title, Text } = Typography;

// ---- Pricing mock ----
const RATE_PER_HOUR = 35; // studio per hour
const RATE_PER_MUSICIAN = 25; // per musician per session
const ADD_MIXING = 30;
const ADD_MASTERING = 40;

function calcPrice(hours, musicians, mixing, mastering) {
  const items = [];
  const base = Math.max(1, hours) * RATE_PER_HOUR;
  items.push({ label: `Studio time (${hours}h)`, amount: base });

  const musFee = Math.max(0, musicians) * RATE_PER_MUSICIAN;
  if (musFee) items.push({ label: `Performers x${musicians}`, amount: musFee });

  if (mixing) items.push({ label: "Mixing add-on", amount: ADD_MIXING });
  if (mastering)
    items.push({ label: "Mastering add-on", amount: ADD_MASTERING });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  return { items, subtotal, total: subtotal };
}

export default function RecordingQuotePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const files = Array.isArray(state?.files) ? state.files : [];

  // UI state
  const [hours, setHours] = useState(2);
  const [musicians, setMusicians] = useState(1);
  const [mixing, setMixing] = useState(false);
  const [mastering, setMastering] = useState(false);
  const [open, setOpen] = useState(false); // <-- FIXED

  const price = useMemo(
    () => calcPrice(hours, musicians, mixing, mastering),
    [hours, musicians, mixing, mastering]
  );

  return (
    <div className={styles.wrap}>
      <Title level={2}>Recording — Session Details</Title>

      <div className={styles.row}>
        <div className={styles.left}>
          <div
            style={{ padding: 12, border: "1px dashed #ddd", borderRadius: 8 }}
          >
            <Text type="secondary">
              Configure your session hours, performers, and post-production
              add-ons.
            </Text>
          </div>
        </div>

        <div className={styles.right}>
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <div className={styles.metaRow}>
              <Text strong>Reference Files:</Text>
              <Text>{files.length ? `${files.length} file(s)` : "None"}</Text>
            </div>
            {files.length ? (
              <ul className={styles.listDots} style={{ marginTop: 6 }}>
                {files.map((f, i) => (
                  <li key={i}>
                    {f.fileName} — {f.fileType}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty description="No files uploaded (optional)" />
            )}
            <div className={styles.rightAlign}>
              <Button type="link" onClick={() => navigate(-1)}>
                Add/change on previous page
              </Button>
            </div>
          </Space>
        </div>
      </div>

      <Divider />

      <Collapse
        bordered={false}
        defaultActiveKey={["session"]}
        items={[
          {
            key: "session",
            label: <div className={styles.sectionTitle}>Session Setup</div>,
            extra: <Text strong>{`+$${price.subtotal.toFixed(2)}`}</Text>,
            children: (
              <div className={styles.inlineRow}>
                <div>
                  <Text strong>Hours</Text>
                  <div>
                    <Slider min={1} max={8} value={hours} onChange={setHours} />
                  </div>
                </div>
                <div>
                  <Text strong>Performers</Text>
                  <div>
                    <Slider
                      min={0}
                      max={6}
                      value={musicians}
                      onChange={setMusicians}
                    />
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "post",
            label: <div className={styles.sectionTitle}>Post-production</div>,
            children: (
              <Space direction="vertical">
                <Checkbox
                  checked={mixing}
                  onChange={(e) => setMixing(e.target.checked)}
                >
                  Mixing (+$30)
                </Checkbox>
                <Checkbox
                  checked={mastering}
                  onChange={(e) => setMastering(e.target.checked)}
                >
                  Mastering (+$40)
                </Checkbox>
              </Space>
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
          <Button size="large" onClick={() => setOpen(true)} type="primary">
            Review Cart
          </Button>
        </div>
      </div>

      <Drawer
        title="What's in your cart"
        placement="bottom"
        height={320}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className={styles.cartGrid}>
          <div>
            <Title level={4} style={{ marginTop: 0 }}>
              Recording Session
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
              <Button onClick={() => setOpen(false)} style={{ marginRight: 8 }}>
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
