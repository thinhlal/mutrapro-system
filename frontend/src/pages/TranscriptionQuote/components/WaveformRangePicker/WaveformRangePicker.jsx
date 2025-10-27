import React from "react";
import { Slider, Typography } from "antd";

const { Text } = Typography;
const toMMSS = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;

export default function WaveformRangePicker({
  totalSeconds = 60,
  value = [0, 60],
  onChange,
}) {
  const [start, end] = value;
  const onRangeChange = ([s, e]) => onChange?.(s, e);
  return (
    <div>
      <div
        style={{
          height: 120,
          borderRadius: 8,
          background: "#222",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        {/* Placeholder for real waveform canvas */}
        <div>Waveform Preview (mock)</div>
      </div>

      <Slider
        range
        min={0}
        max={totalSeconds}
        step={1}
        value={[start, end]}
        onChange={onRangeChange}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Text>{toMMSS(start)}</Text>
        <Text>{toMMSS(end)}</Text>
      </div>
    </div>
  );
}
