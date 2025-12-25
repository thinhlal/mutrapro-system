# CÁCH NHÚNG SMOOSIC VÀO DỰ ÁN MUTRAPRO

## 📋 TỔNG QUAN

Dự án sử dụng **2 loại editor nhạc** để chỉnh sửa ký âm:

1. **Smoosic Editor** - Nhúng qua iframe (standalone application)
2. **Flat.io Editor** - Nhúng qua thư viện `flat-embed` (embedded component)

---

## 🎹 PHẦN 1: SMOOSIC EDITOR (Iframe Integration)

### **Cấu trúc thư mục**

```
public/smoosic/
├── html/
│   └── smoosic.html          # HTML file chứa Smoosic editor
├── smoosic.js                # Main Smoosic library
├── jszip.js                  # ZIP utility
├── midi-parser.js            # MIDI parser
├── mutrapro-theme.css        # Custom theme cho MuTraPro
└── styles/                   # CSS files cho Smoosic
    ├── fonts.css
    ├── ribbon.css
    ├── dialogs.css
    ├── menus.css
    ├── piano.css
    └── ...
```

### **Cách hoạt động**

#### **1. File HTML chính (`public/smoosic/html/smoosic.html`)**

File này là một standalone HTML application chứa toàn bộ Smoosic editor:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Load CSS styles -->
    <link href="../styles/fonts.css" rel="stylesheet" />
    <link href="../styles/ribbon.css" rel="stylesheet" />
    <!-- ... other CSS files ... -->
    
    <!-- MuTraPro custom theme -->
    <link href="../mutrapro-theme.css" rel="stylesheet" />
    
    <!-- Load JavaScript libraries -->
    <script src="https://code.jquery.com/jquery-3.3.1.slim.js"></script>
    <script src="../jszip.js"></script>
    <script src="../smoosic.js"></script>
    
    <!-- Initialize Smoosic when page loads -->
    <script>
      document.addEventListener('DOMContentLoaded', function (event) {
        // Create UI DOM structure
        Smo.SuiDom.createUiDom(document.getElementById('smoo'));
        
        // Configure application
        var config = {
          mode: 'application',
          leftControls: 'controls-left',
          topControls: 'controls-top',
          scoreDomContainer: 'smo-scroll-region',
        };
        Smo.SuiApplication.configure(config);
      });
    </script>
  </head>
  <body>
    <!-- Container where Smoosic will render -->
    <div id="smoo"></div>
  </body>
</html>
```

**Giải thích:**
- `Smo.SuiDom.createUiDom()` - Tạo DOM structure cho editor (toolbar, menus, etc.)
- `Smo.SuiApplication.configure()` - Khởi tạo và cấu hình Smoosic application
- `mode: 'application'` - Chế độ full application với đầy đủ tính năng

#### **2. React Component (`src/pages/work/SmoosicEditorPage/SmoosicEditorPage.jsx`)**

Component này nhúng Smoosic HTML vào React app qua iframe:

```jsx
const SmoosicEditorPage = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Try to inject custom CSS into iframe after it loads
    const handleLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Add theme CSS link
          const themeLink = iframeDoc.createElement('link');
          themeLink.rel = 'stylesheet';
          themeLink.href = '/smoosic/mutrapro-theme.css';
          iframeDoc.head.appendChild(themeLink);
          
          // Add wrapper class for scoped styling
          iframeDoc.body.classList.add('mutrapro-theme');
        }
      } catch (e) {
        // Cross-origin restriction - theme already linked in HTML
        console.log('Theme CSS already applied via smoosic.html');
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div className={styles.container}>
      <iframe
        ref={iframeRef}
        src="/smoosic/html/smoosic.html"  // Load Smoosic HTML
        className={styles.iframe}
        title="Smoosic Music Editor"
        allow="midi; autoplay"  // Allow MIDI and autoplay
      />
    </div>
  );
};
```

**Giải thích:**
- **Iframe approach**: Nhúng toàn bộ Smoosic như một standalone app
- **Theme injection**: Cố gắng inject custom CSS vào iframe (có thể bị CORS block)
- **Fallback**: Theme CSS đã được link trực tiếp trong `smoosic.html` (line 16)

#### **3. Custom Theme (`public/smoosic/mutrapro-theme.css`)**

File này override styles của Smoosic để match với theme MuTraPro:

```css
/* CSS Variables cho MuTraPro theme */
:root {
  --mtp-bg-primary: #0f0f1a;
  --mtp-primary: #6366f1;
  --mtp-text: #e2e8f0;
  /* ... */
}

/* Override Smoosic styles */
body {
  background: var(--mtp-bg-primary) !important;
  /* ... */
}

#smoo {
  height: 100vh !important;
  /* ... */
}
```

**Lưu ý:** Theme được link trực tiếp trong `smoosic.html` để tránh CORS issues.

### **Ưu điểm của cách này:**
- ✅ Giữ nguyên 100% functionality của Smoosic
- ✅ Không cần modify code của Smoosic
- ✅ Dễ update Smoosic version
- ✅ Isolated - không ảnh hưởng đến React app

### **Nhược điểm:**
- ❌ Khó communicate giữa React và Smoosic (phải dùng postMessage)
- ❌ Không thể customize sâu
- ❌ Theme injection có thể bị CORS block

---

## 🎼 PHẦN 2: FLAT.IO EDITOR (Embedded Integration)

### **Cách hoạt động**

#### **1. Installation**

```json
// package.json
{
  "dependencies": {
    "flat-embed": "^2.5.1"
  }
}
```

#### **2. Component sử dụng (`src/components/common/FlatEditor/FlatEditor.jsx`)**

```jsx
import Embed from 'flat-embed';

export default function FlatEditor() {
  const hostRef = useRef(null);
  const [embed, setEmbed] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    // Create Flat.io embed instance
    const instance = new Embed(hostRef.current, {
      embedParams: {
        appId: import.meta.env.VITE_FLAT_APP_ID,  // Flat.io App ID
        mode: 'edit',                              // Edit mode
        controlsPosition: 'bottom',                // Control bar position
      },
    });

    // Wait for editor to be ready
    instance
      .ready()
      .then(() => {
        setReady(true);
        setEmbed(instance);
      })
      .catch(e => setErr(e?.message || 'Init failed'));
  }, []);

  // Load MusicXML file
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file.name.endsWith('.mid')) {
      const buf = new Uint8Array(await file.arrayBuffer());
      await embed.loadMIDI(buf);
    } else {
      const text = await file.text();
      await embed.loadMusicXML(text);
    }
  };

  // Export MusicXML
  const exportXML = async () => {
    const data = await embed.getMusicXML({ compressed: true });
    const blob = new Blob([data], { type: 'application/vnd.recordare.musicxml+xml' });
    // Download file...
  };

  return (
    <div>
      {/* Control buttons */}
      <Button onClick={() => embed?.play()}>Play</Button>
      <Button onClick={exportXML}>Export XML</Button>
      
      {/* Editor container */}
      <div ref={hostRef} className={styles.iframe} />
    </div>
  );
}
```

**Giải thích:**
- `new Embed(hostRef.current, {...})` - Tạo embed instance với container element
- `embed.ready()` - Promise chờ editor sẵn sàng
- `embed.loadMusicXML()` - Load MusicXML/MIDI file
- `embed.getMusicXML()` - Export score ra MusicXML
- `embed.play()` / `embed.pause()` - Control playback

#### **3. API Methods của Flat.io Embed**

```javascript
// Load files
await embed.loadMusicXML(xmlString);      // Load MusicXML
await embed.loadMIDI(arrayBuffer);       // Load MIDI

// Export
const xml = await embed.getMusicXML({ compressed: true });
const midi = await embed.getMIDI();
const png = await embed.getPNG();

// Playback
embed.play();
embed.pause();
embed.stop();

// Events
embed.on('ready', () => { /* editor ready */ });
embed.on('scoreLoaded', () => { /* score loaded */ });
```

### **Ưu điểm của cách này:**
- ✅ Full control từ React
- ✅ Dễ integrate với React state
- ✅ API rõ ràng, dễ sử dụng
- ✅ Có thể customize UI xung quanh editor

### **Nhược điểm:**
- ❌ Cần Flat.io account và App ID
- ❌ Phụ thuộc vào Flat.io service
- ❌ Có thể có giới hạn về tính năng

---

## 🔄 SO SÁNH 2 CÁCH NHÚNG

| Tiêu chí | Smoosic (Iframe) | Flat.io (Embed) |
|----------|------------------|-----------------|
| **Cách nhúng** | Iframe HTML file | JavaScript library |
| **Control** | Hạn chế (postMessage) | Full control qua API |
| **Customization** | Chỉ CSS theme | Có thể customize UI |
| **Dependencies** | Standalone, không cần account | Cần Flat.io App ID |
| **Integration** | Khó integrate với React | Dễ integrate |
| **Use case** | Full-featured editor | Embedded editor component |

---

## 📍 NƠI SỬ DỤNG TRONG DỰ ÁN

### **Smoosic Editor:**
- `src/pages/work/SmoosicEditorPage/SmoosicEditorPage.jsx` - Trang editor độc lập
- Route: `/work/edit-tool`

### **Flat.io Editor:**
- `src/components/common/FlatEditor/FlatEditor.jsx` - Component editor
- `src/components/common/FlatEditor/FlatDemo.jsx` - Demo component với nhiều tính năng
- `src/pages/ai-transcription/TranscriptionProcessPage.jsx` - Hiển thị kết quả transcription
- `src/pages/work/NotationEditor/NotationEditor.jsx` - Notation editor page

---

## 🛠️ CẤU HÌNH CẦN THIẾT

### **Smoosic:**
- Không cần config, chỉ cần có files trong `public/smoosic/`

### **Flat.io:**
- Cần set environment variable:
```env
VITE_FLAT_APP_ID=your_flat_io_app_id
```

---

## 💡 KẾT LUẬN

- **Smoosic**: Dùng khi cần full-featured editor độc lập, không cần integrate sâu
- **Flat.io**: Dùng khi cần embed editor vào component, có control từ React, và cần API để load/export files

Cả 2 đều phục vụ mục đích chỉnh sửa ký âm nhạc nhưng với approach khác nhau tùy vào use case.

