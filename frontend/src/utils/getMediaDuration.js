// Đọc duration của file audio/video local bằng HTMLAudioElement
export async function getMediaDurationSec(fileOrUrl) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const cleanup = () => {
      audio.src = "";
      audio.removeAttribute("src");
    };

    const onLoaded = () => {
      const dur = Number.isFinite(audio.duration)
        ? Math.round(audio.duration)
        : 0;
      cleanup();
      resolve(dur || 0);
    };

    const onError = () => {
      cleanup();
      resolve(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded, { once: true });
    audio.addEventListener("error", onError, { once: true });

    // Nhận cả File (blob url) hoặc URL
    if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      const url = URL.createObjectURL(fileOrUrl);
      audio.src = url;
      // Thu hồi URL khi xong
      audio.addEventListener("loadedmetadata", () => URL.revokeObjectURL(url), {
        once: true,
      });
    } else {
      audio.crossOrigin = "anonymous";
      audio.src = fileOrUrl;
    }
  });
}
