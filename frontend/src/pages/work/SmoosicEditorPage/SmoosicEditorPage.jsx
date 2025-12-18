import { useEffect, useRef } from 'react';
import styles from './SmoosicEditorPage.module.css';

/**
 * SmoosicEditorPage - Embeds the Smoosic music notation editor via iframe
 * Keeps 100% original Smoosic functionality while allowing CSS theming
 */
const SmoosicEditorPage = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Inject custom theme CSS into iframe after load
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Add theme CSS link
          const themeLink = iframeDoc.createElement('link');
          themeLink.rel = 'stylesheet';
          themeLink.href = '/smoosic/smoosic-theme.css';
          iframeDoc.head.appendChild(themeLink);

          // Add wrapper class to body for scoped styling
          iframeDoc.body.classList.add('mutrapro-theme');
        }
      } catch (e) {
        // Cross-origin restriction - theme CSS already linked in index.html
        console.log(
          'Smoosic iframe loaded (same-origin styling applied via index.html)'
        );
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div className={styles.container}>
      <iframe
        ref={iframeRef}
        src="/smoosic/html/smoosic.html"
        className={styles.iframe}
        title="Smoosic Music Editor"
        allow="midi; autoplay"
      />
    </div>
  );
};

export default SmoosicEditorPage;
