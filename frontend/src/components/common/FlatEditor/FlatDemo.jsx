import { useEffect, useRef, useState } from "react";
import Embed from "flat-embed";

export default function FlatDemo() {
  const hostRef = useRef(null);
  const fileRef = useRef(null);
  const [embed, setEmbed] = useState(null);
  const [ready, setReady] = useState(false);

  // ==== form Create ====
  const [showCreate, setShowCreate] = useState(false);
  const [instruments, setInstruments] = useState(["Piano"]); // cho phép nhiều
  const [beats, setBeats] = useState("4"); // chỉ số nhịp trên
  const [beatType, setBeatType] = useState("4"); // chỉ số nhịp dưới
  const [tempo, setTempo] = useState("90"); // bpm
  const [keyFifths, setKeyFifths] = useState("0"); // 0 = C major/A minor

  useEffect(() => {
    if (!hostRef.current) return;

    const instance = new Embed(hostRef.current, {
      height: "500px",
      embedParams: {
        appId: import.meta.env.VITE_FLAT_APP_ID,
        mode: "edit",
        controlsPosition: "top",
        branding: false,
      },
    });

    instance
      .ready()
      .then(() => {
        setEmbed(instance);
        setReady(true);
      })
      .catch((e) => console.error("Embed init failed:", e));
  }, []);

  // ================== CREATE FLOW ==================
  // Map nhạc cụ -> cấu hình staff/clef/midi (đơn giản, đủ xài)
  const INSTRUMENTS = {
    Piano: {
      staves: 2,
      parts: [
        { clef: { sign: "G", line: 2 } },
        { clef: { sign: "F", line: 4 } },
      ],
      midi: 1,
      partName: "Piano",
    },
    Violin: {
      staves: 1,
      parts: [{ clef: { sign: "G", line: 2 } }],
      midi: 41,
      partName: "Violin",
    },
    Flute: {
      staves: 1,
      parts: [{ clef: { sign: "G", line: 2 } }],
      midi: 74,
      partName: "Flute",
    },
    Guitar: {
      staves: 1,
      parts: [{ clef: { sign: "G", line: 2 } }],
      midi: 25,
      partName: "Guitar",
    },
    Bass: {
      staves: 1,
      parts: [{ clef: { sign: "F", line: 4 } }],
      midi: 33,
      partName: "Bass",
    },
    Drums: {
      staves: 1,
      parts: [{ clef: { sign: "percussion", line: 2 } }],
      midi: 118,
      partName: "Drumset",
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
      .join("");

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
      .join("");

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
      setShowCreate(false);
    } catch (e) {
      console.error(e);
      alert("Không tạo được bản mới: " + (e?.message || String(e)));
    }
  };

  // ================== UPLOAD / EXPORT ==================
  const openPicker = () => fileRef.current?.click();

  const handleUpload = async (e) => {
    if (!embed) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".mid") || name.endsWith(".midi")) {
        const buf = new Uint8Array(await file.arrayBuffer());
        await embed.loadMIDI(buf);
      } else if (name.endsWith(".mxl")) {
        const buf = new Uint8Array(await file.arrayBuffer());
        await embed.loadMusicXML(buf);
      } else {
        const text = await file.text();
        await embed.loadMusicXML(text);
      }
    } catch (err) {
      console.error(err);
      alert("Không thể nạp file: " + (err?.message || String(err)));
    } finally {
      e.target.value = "";
    }
  };

  const exportXML = async () => {
    if (!embed) return;
    const buf = await embed.getMusicXML({ compressed: true });
    download(buf, "application/vnd.recordare.musicxml+xml", "mxl");
  };
  const exportMIDI = async () => {
    if (!embed) return;
    const buf = await embed.getMIDI();
    download(buf, "audio/midi", "mid");
  };
  const exportPNG = async () => {
    if (!embed) return;
    const buf = await embed.getPNG();
    download(buf, "image/png", "png");
  };
  const download = (buffer, mime, ext) => {
    const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `score.${ext}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ================== UI ==================
  return (
    <div style={{ padding: 12 }}>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}
      >
        <button type="button" onClick={() => setShowCreate((v) => !v)}>
          Create
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".musicxml,.xml,.mxl,.mid,.midi"
          onChange={handleUpload}
          style={{ display: "none" }}
        />
        <button type="button" onClick={openPicker}>
          Upload (XML/MXL/MIDI)
        </button>

        <button onClick={() => embed?.play()}>Play</button>
        <button onClick={() => embed?.pause()}>Pause</button>
        <button onClick={() => embed?.stop()}>Stop</button>

        <button onClick={exportXML}>Export XML</button>
        <button onClick={exportMIDI}>Export MIDI</button>
        <button onClick={exportPNG}>Export PNG</button>
      </div>

      {/* Panel Create */}
      {showCreate && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={{ fontWeight: 600 }}>Nhạc cụ</label>
              <select
                multiple
                value={instruments}
                onChange={(e) =>
                  setInstruments(
                    Array.from(e.target.selectedOptions).map((o) => o.value)
                  )
                }
                style={{ width: "100%", height: 120 }}
              >
                {Object.keys(INSTRUMENTS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Giữ Ctrl/⌘ để chọn nhiều
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600 }}>Chỉ số nhịp</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={beats}
                  onChange={(e) => setBeats(e.target.value)}
                  style={{ width: 60 }}
                />
                <span>/</span>
                <input
                  value={beatType}
                  onChange={(e) => setBeatType(e.target.value)}
                  style={{ width: 60 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600 }}>Giá trị khoá (fifths)</label>
              <input
                value={keyFifths}
                onChange={(e) => setKeyFifths(e.target.value)}
                style={{ width: 80 }}
              />
              <div style={{ fontSize: 12, opacity: 0.7 }}>0=C, 1=G, -1=F,…</div>
            </div>

            <div>
              <label style={{ fontWeight: 600 }}>Tempo (bpm)</label>
              <input
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                style={{ width: 80 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={handleCreate}>Tạo bản mới</button>
            <button
              style={{ marginLeft: 8 }}
              onClick={() => setShowCreate(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {!ready && <div style={{ marginBottom: 8 }}>Loading editor…</div>}

      <div
        ref={hostRef}
        style={{ width: "100%", height: "75vh", border: "1px solid #ddd" }}
      />
    </div>
  );
}
