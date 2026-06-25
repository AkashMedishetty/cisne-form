"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_FILE_BYTES, MAX_FILE_MB } from "@/lib/validation";

interface PhotoCaptureProps {
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}

type Mode = "idle" | "camera";

export default function PhotoCapture({ onSelect, disabled }: PhotoCaptureProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Attach the active stream to the <video> once it's mounted.
  useEffect(() => {
    if (mode === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  // Clean up object URLs and the camera stream on unmount.
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const applyFile = useCallback(
    (file: File | null) => {
      // Enforce the size limit on the client for instant feedback. Keep any
      // previously valid photo and surface an error for the oversized one.
      if (file && file.size > MAX_FILE_BYTES) {
        setError(
          `That photo is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose one under ${MAX_FILE_MB} MB.`,
        );
        return;
      }
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return file ? URL.createObjectURL(file) : null;
      });
      setError(null);
      onSelect(file);
    },
    [onSelect],
  );

  const startCamera = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
    } catch {
      // Fallback: trigger the native camera/file picker (great on mobile).
      stopCamera();
      setMode("idle");
      captureInputRef.current?.click();
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        applyFile(file);
        stopCamera();
        setMode("idle");
      },
      "image/jpeg",
      0.92,
    );
  }, [applyFile, stopCamera]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setMode("idle");
  }, [stopCamera]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    applyFile(file);
    // Reset so selecting the same file again re-fires change.
    e.target.value = "";
  }

  // --- Live camera view ---
  if (mode === "camera") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-[4/3] w-full object-cover"
        />
        <div className="flex items-center justify-between gap-3 bg-black/90 p-3">
          <button
            type="button"
            onClick={cancelCamera}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={capturePhoto}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-lg active:scale-95"
          >
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Capture
          </button>
          <span className="w-[68px]" aria-hidden />
        </div>
      </div>
    );
  }

  // --- Preview of a chosen/captured photo ---
  if (previewUrl) {
    return (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Selected preview"
          className="aspect-[4/3] w-full rounded-2xl border border-slate-200 object-cover"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => uploadInputRef.current?.click()}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Choose different
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={startCamera}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Retake
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyFile(null)}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <HiddenInputs
          uploadRef={uploadInputRef}
          captureRef={captureInputRef}
          onChange={onInputChange}
        />
      </div>
    );
  }

  // --- Empty state: choose how to add a photo ---
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled || starting}
          onClick={startCamera}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-7 text-center transition hover:border-teal-500 hover:bg-teal-50/40 disabled:opacity-50"
        >
          <CameraIcon />
          <span className="text-sm font-semibold text-slate-800">
            {starting ? "Starting camera…" : "Take a photo"}
          </span>
          <span className="text-xs text-slate-500">Use your camera</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => uploadInputRef.current?.click()}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-7 text-center transition hover:border-teal-500 hover:bg-teal-50/40 disabled:opacity-50"
        >
          <UploadIcon />
          <span className="text-sm font-semibold text-slate-800">Upload a photo</span>
          <span className="text-xs text-slate-500">JPEG, PNG, WebP · max {MAX_FILE_MB} MB</span>
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <HiddenInputs
        uploadRef={uploadInputRef}
        captureRef={captureInputRef}
        onChange={onInputChange}
      />
    </div>
  );
}

function HiddenInputs({
  uploadRef,
  captureRef,
  onChange,
}: {
  uploadRef: React.RefObject<HTMLInputElement | null>;
  captureRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
    </>
  );
}

function CameraIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-teal-600"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-teal-600"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
