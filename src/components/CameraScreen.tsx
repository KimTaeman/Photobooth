import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, RotateCcw, Check } from "lucide-react";
import type { RemoteConfig } from "../hooks/useSupabase";
import { useLUT } from "../hooks/useLUT";

const audioCtx = { current: null as AudioContext | null };
const getAudioCtx = () => {
  if (!audioCtx.current) audioCtx.current = new AudioContext();
  if (audioCtx.current.state === "suspended") audioCtx.current.resume();
  return audioCtx.current;
};
const playTick = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.09);
};
const playShutter = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(1100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
};
interface CameraScreenProps {
  isActive: boolean;
  selectedFrame: string | null;
  onBack: () => void;
  onComplete: (
    photos: string[],
    videoBlob: Blob | null,
    bursts: string[][],
  ) => void;
  config: RemoteConfig | null;
}

const CameraScreen: React.FC<CameraScreenProps> = ({
  isActive,
  selectedFrame,
  onBack,
  onComplete,
  config,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shotNum, setShotNum] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Get ready and press the button!");
  const [flash, setFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewCountdown, setPreviewCountdown] = useState(3);
  const [retakeCount, setRetakeCount] = useState(0);

  const { loadLUT, applyLUT } = useLUT();

  const testMode = config?.testMode ?? false;
  const enableVideo = config?.enableVideo ?? true;
  const activeFilter = config?.activeFilter ?? "none";
  const layout = (selectedFrame && config?.frameLayouts?.[selectedFrame]) ||
    config?.layout2x2 || {
      margin: 60,
      gutterX: 40,
      gutterY: 40,
      slotW: 1160,
      slotH: 794,
    };

  const { margin, gutterX, gutterY, slotW, slotH } = layout;
  const slots = [
    { x: margin, y: margin },
    { x: margin + slotW + gutterX, y: margin },
    { x: margin, y: margin + slotH + gutterY },
    { x: margin + slotW + gutterX, y: margin + slotH + gutterY },
  ];
  const currentSlot = slots[shotNum - 1] || slots[0];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const retakeResolveRef = useRef<((d: "keep" | "retake") => void) | null>(
    null,
  );
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewAnimRef = useRef<number>(0);

  const startCamera = async () => {
    try {
      // Try high resolution first
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
          audio: false,
        });
      } catch (e) {
        // Fallback to standard 720p
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
            audio: false,
          });
        } catch (e2) {
          // Absolute fallback
          s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current
          .play()
          .catch((e) => console.error("Error playing video:", e));
      }
    } catch (err) {
      const error = err as Error;
      if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        alert(
          "No camera device found. Please ensure your camera is connected and not being used by another app.",
        );
      } else if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        alert(
          "Camera access denied. Please allow camera permissions in your browser settings.",
        );
      } else {
        alert("Camera error: " + error.message);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isActive) {
      if (!stream) {
        startCamera();
      } else if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current
          .play()
          .catch((e) => console.error("Error playing video:", e));
      }

      // Clear previous session artifacts
      setCapturedPhotos([]);
      setShotNum(1);
      setStatus("Get ready and press the button!");
      setPreviewPhoto(null);
      setFlash(false);
      setIsProcessing(false);
      setCountdown(null);
    } else {
      stopCamera();
    }

    return () => {
      if (!isActive) stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Draw filtered video to canvas every frame for reliable live filter preview
  useEffect(() => {
    if (!stream || !isActive) {
      cancelAnimationFrame(previewAnimRef.current);
      return;
    }
    const draw = () => {
      const v = videoRef.current;
      const canvas = previewCanvasRef.current;
      if (v && canvas && v.readyState >= 2) {
        const ctx = canvas.getContext("2d")!;
        const cw = canvas.width,
          ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        const sw = cw * 0.726,
          sh = ch * 0.703;
        const sx = (cw - sw) / 2,
          sy = (ch - sh) / 2;
        ctx.save();
        ctx.filter =
          activeFilter === "lut"
            ? "contrast(1.1) saturate(1.1) sepia(0.05)"
            : activeFilter === "none"
              ? "none"
              : activeFilter;
        ctx.translate(sx + sw, sy);
        ctx.scale(-1, 1);
        drawImageCover(ctx, v, 0, 0, sw, sh);
        ctx.restore();
      }
      previewAnimRef.current = requestAnimationFrame(draw);
    };
    previewAnimRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(previewAnimRef.current);
  }, [stream, isActive, activeFilter]);

  const startVideoRecording = () => {
    if (!videoRef.current || !stream) return;
    const v = videoRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    recordCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;
    const drawFrame = () => {
      ctx.setTransform(-1, 0, 0, 1, w, 0);
      ctx.drawImage(v, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };
    drawFrame();
    const canvasStream = canvas.captureStream(30);
    videoChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
      ? "video/webm; codecs=vp9"
      : "video/webm";
    const mr = new MediaRecorder(canvasStream, { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  };

  const stopVideoRecording = (): Promise<Blob | null> => {
    setIsRecording(false);
    return new Promise((resolve) => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive"
      ) {
        resolve(null);
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(videoChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "video/webm",
        });
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    const vw = img.videoWidth || 1280;
    const vh = img.videoHeight || 720;
    const imgRatio = vw / vh;
    const targetRatio = w / h;
    let sw, sh, sx, sy;
    if (imgRatio > targetRatio) {
      sh = vh;
      sw = sh * targetRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = sw / targetRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const capturePhoto = async (): Promise<string> => {
    const v = videoRef.current!;
    const canvas = document.createElement("canvas");
    canvas.width = slotW;
    canvas.height = slotH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // Apply standard filter if not LUT
    if (activeFilter !== "lut" && activeFilter !== "none") {
      ctx.filter = activeFilter;
    }

    // Draw mirrored camera
    ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
    drawImageCover(ctx, v, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Bake LUT ONLY if activeFilter is 'lut'
    if (activeFilter === "lut") {
      const lutData = await loadLUT("/filter.png");
      if (lutData) {
        applyLUT(ctx, lutData, canvas.width, canvas.height);
      }
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(URL.createObjectURL(blob!)),
        "image/jpeg",
        0.95,
      );
    });
  };

  const captureFrameBurst = async (
    count = 5,
    intervalMs = 80,
  ): Promise<string[]> => {
    const frames: string[] = [];
    const lutData =
      activeFilter === "lut" ? await loadLUT("/filter.png") : null;

    for (let i = 0; i < count; i++) {
      const url = await new Promise<string>((resolve) => {
        const v = videoRef.current!;
        const canvas = document.createElement("canvas");
        canvas.width = slotW;
        canvas.height = slotH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        if (activeFilter !== "lut" && activeFilter !== "none") {
          ctx.filter = activeFilter;
        }

        ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
        drawImageCover(ctx, v, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (activeFilter === "lut" && lutData) {
          applyLUT(ctx, lutData, canvas.width, canvas.height);
        }

        canvas.toBlob(
          (blob) => resolve(URL.createObjectURL(blob!)),
          "image/jpeg",
          0.7,
        );
      });
      frames.push(url);
      if (i < count - 1) await new Promise((r) => setTimeout(r, intervalMs));
    }
    return frames;
  };

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  const waitForRetakeDecision = (): Promise<"keep" | "retake"> =>
    new Promise((resolve) => {
      retakeResolveRef.current = resolve;
      let c = 3;
      setPreviewCountdown(c);
      previewTimerRef.current = setInterval(() => {
        c--;
        if (c <= 0) {
          clearInterval(previewTimerRef.current!);
          retakeResolveRef.current = null;
          setPreviewPhoto(null);
          resolve("keep");
        } else {
          setPreviewCountdown(c);
        }
      }, 1000);
    });

  const handleKeep = () => {
    clearInterval(previewTimerRef.current!);
    retakeResolveRef.current?.("keep");
    retakeResolveRef.current = null;
    setPreviewPhoto(null);
  };

  const handleRetake = () => {
    clearInterval(previewTimerRef.current!);
    retakeResolveRef.current?.("retake");
    retakeResolveRef.current = null;
    setPreviewPhoto(null);
  };

  const startSession = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCapturedPhotos([]);
    const photos: string[] = [];
    const bursts: string[][] = [];
    if (enableVideo) startVideoRecording();

    for (let i = 1; i <= 4; i++) {
      setShotNum(i);
      setRetakeCount(0);
      let shotRetakeCount = 0;
      let decision: "keep" | "retake" = "retake";
      let photoUrl = "";
      let burst: string[] = [];

      while (decision === "retake") {
        setStatus(`Pose! Shot ${i} of 4`);
        const countdownStart = testMode ? 2 : config?.countdownDuration || 10;
        for (let count = countdownStart; count > 0; count--) {
          setCountdown(count);
          playTick();
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(null);
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        burst.forEach((u) => URL.revokeObjectURL(u));
        burst = await captureFrameBurst();
        photoUrl = await capturePhoto();
        playShutter();
        triggerFlash();

        if (shotRetakeCount >= 2) {
          // No more retakes: show final photo for a few seconds before moving on
          setPreviewPhoto(photoUrl);
          setStatus("Max retakes reached - Keeping this shot!");
          await new Promise((r) => setTimeout(r, 1000));
          setPreviewPhoto(null);
          decision = "keep";
        } else {
          setPreviewPhoto(photoUrl);
          decision = await waitForRetakeDecision();
        }

        if (decision === "retake") {
          shotRetakeCount++;
          setRetakeCount(shotRetakeCount);
        }
      }

      photos.push(photoUrl);
      bursts.push(burst);
      setCapturedPhotos((prev) => [...prev, photoUrl]);
      if (i < 4)
        await new Promise((r) =>
          setTimeout(r, testMode ? 200 : (config?.captureDelay || 1) * 1000),
        );
    }

    setStatus("Processing...");
    const videoBlob = enableVideo ? await stopVideoRecording() : null;
    onComplete(photos, videoBlob, bursts);
    setIsProcessing(false);
    setShotNum(1);
    setRetakeCount(0);
  };

  return (
    <div id="screen-camera" className={`screen ${isActive ? "active" : ""}`}>
      <div className="camera-topbar">
        <button
          className="btn-back"
          onClick={onBack}
          disabled={isProcessing}
          title="Back to frames"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="shot-indicators">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`shot-dot ${shotNum > n || (isProcessing && shotNum === 4 && status === "Processing...") ? "done" : ""} ${shotNum === n && isProcessing && status !== "Processing..." ? "current" : ""}`}
            />
          ))}
        </div>
        <div className="shot-label">Shot {shotNum} / 4</div>
        <div className={`rec-indicator ${isRecording ? "active" : ""}`}>
          <div className="rec-dot" /> REC
        </div>
      </div>
      <div className="camera-viewport">
        <div
          id="video-wrapper"
          style={{
            aspectRatio: "2480 / 1748",
            width: "95%",
            maxWidth: "min(900px, calc((100vh - 380px) * 2480 / 1748))",
            position: "relative",
            overflow: "hidden",
            borderRadius: "24px",
            border: "12px solid var(--white)",
            background: "#000",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            margin: "0 auto",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute",
              visibility: "hidden",
              width: 0,
              height: 0,
            }}
          />
          <canvas
            ref={previewCanvasRef}
            width={900}
            height={634}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 10,
            }}
          />
          {selectedFrame && (
            <img
              id="frame-overlay"
              src={selectedFrame}
              style={{
                display: "block",
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                zIndex: 5,
                pointerEvents: "none",
              }}
              alt="Frame Overlay"
            />
          )}
          {countdown && (
            <div id="countdown-overlay" style={{ display: "flex", zIndex: 20 }}>
              {countdown}
            </div>
          )}
          <div
            id="flash-overlay"
            className={flash ? "ripple" : ""}
            style={{ zIndex: 30 }}
          />
          {activeFilter !== "none" && (
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "12px",
                zIndex: 15,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
                color: "white",
                fontSize: "0.7rem",
                fontFamily: "Fredoka, sans-serif",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "20px",
                letterSpacing: "0.03em",
                pointerEvents: "none",
              }}
            >
              🎨{" "}
              {activeFilter === "lut"
                ? "Adobe Lightroom"
                : activeFilter === "grayscale(100%)"
                  ? "B&W Classic"
                  : activeFilter}
            </div>
          )}
        </div>
      </div>
      <div className="preview-strip">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`preview-slot${capturedPhotos[i] ? " filled" : ""}${shotNum === i + 1 && isProcessing && !capturedPhotos[i] ? " current" : ""}`}
          >
            {capturedPhotos[i] && (
              <img src={capturedPhotos[i]} alt={`Shot ${i + 1}`} />
            )}
          </div>
        ))}
      </div>
      <div className="camera-bottom">
        <div id="camera-status">{status}</div>
        <button
          className="shutter-btn"
          onClick={startSession}
          disabled={isProcessing}
        >
          <svg className="shutter-icon" viewBox="0 0 24 24">
            <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
            <path d="M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9Zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
          </svg>
        </button>
      </div>
      {previewPhoto && (
        <div className="retake-overlay">
          <img src={previewPhoto} className="retake-preview" alt="Preview" />
          <div className="retake-actions">
            <button
              className="btn btn-outline retake-btn"
              onClick={handleRetake}
              disabled={retakeCount >= 2}
            >
              <RotateCcw size={18} /> Retake ({2 - retakeCount} left)
            </button>
            <button className="btn btn-primary retake-btn" onClick={handleKeep}>
              <Check size={18} /> Keep ({previewCountdown})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraScreen;
