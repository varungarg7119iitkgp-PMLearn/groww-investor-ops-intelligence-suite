/**
 * CsvUploader — Phase 5: Director Ops
 *
 * Drag-and-drop CSV upload zone with 4 visual states:
 *   default    → amber dashed border, idle text
 *   hover      → solid amber border, file-icon glow
 *   uploading  → progress bar fills 0→100% (simulated for Phase 5)
 *   complete   → checkmark + filename + reset link
 *
 * Spec: UI/UX §6.2 "CSV Upload Zone"
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type CsvUploaderState = "default" | "hover" | "uploading" | "complete";

interface CsvUploaderProps {
  onFileAccepted?: (file: File) => void;
  /** Max file size in bytes. Default 50 MB. */
  maxBytes?: number;
  /** Simulate upload (Phase 5 static). Disable when backend is wired. */
  simulateProgress?: boolean;
}

const ACCEPTED_MIME = ["text/csv", "application/vnd.ms-excel"];

export function CsvUploader({
  onFileAccepted,
  maxBytes        = 50 * 1024 * 1024,
  simulateProgress = true,
}: CsvUploaderProps) {
  const [state,      setState]      = useState<CsvUploaderState>("default");
  const [fileName,   setFileName]   = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setState("default");
    setFileName(null);
    setProgress(0);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;

      const isCsvName = file.name.toLowerCase().endsWith(".csv");
      const isCsvMime = ACCEPTED_MIME.includes(file.type) || file.type === "";

      if (!isCsvName || !isCsvMime) {
        setErrorMsg("Only .csv files are accepted.");
        setState("default");
        return;
      }

      if (file.size > maxBytes) {
        setErrorMsg(`File exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit.`);
        setState("default");
        return;
      }

      setErrorMsg(null);
      setFileName(file.name);
      setState("uploading");
      setProgress(0);

      if (simulateProgress) {
        let p = 0;
        const tick = () => {
          p += Math.random() * 18 + 6;
          if (p >= 100) {
            setProgress(100);
            setState("complete");
            onFileAccepted?.(file);
          } else {
            setProgress(p);
            window.setTimeout(tick, 120);
          }
        };
        window.setTimeout(tick, 120);
      } else {
        setProgress(100);
        setState("complete");
        onFileAccepted?.(file);
      }
    },
    [maxBytes, onFileAccepted, simulateProgress],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (state !== "uploading" && state !== "complete") {
      setState("hover");
    }
  }, [state]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (state === "hover") setState("default");
  }, [state]);

  const isHover     = state === "hover";
  const isUploading = state === "uploading";
  const isComplete  = state === "complete";

  return (
    <div
      data-testid="csv-uploader"
      data-state={state}
      role="region"
      aria-label="CSV file upload zone"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => {
        if (!isUploading && !isComplete) inputRef.current?.click();
      }}
      style={{
        borderRadius: "12px",
        border: `${isHover ? "1px solid" : "1.5px dashed"} ${
          isHover
            ? "rgba(255, 171, 0, 0.9)"
            : isComplete
            ? "rgba(16, 185, 129, 0.6)"
            : "rgba(255, 171, 0, 0.45)"
        }`,
        padding:      "16px 18px",
        textAlign:    "center",
        cursor:       isUploading || isComplete ? "default" : "pointer",
        background:   isHover
          ? "rgba(255, 171, 0, 0.06)"
          : isComplete
          ? "rgba(16, 185, 129, 0.05)"
          : "rgba(255, 171, 0, 0.02)",
        transition:   "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        data-testid="csv-input"
      />

      <AnimatePresence mode="wait">
        {/* ── Default / Hover ── */}
        {(state === "default" || state === "hover") && (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              style={{
                fontFamily: "var(--font-hud)",
                fontSize:   "11px",
                color:      "var(--color-ops)",
                letterSpacing: "0.15em",
                marginBottom: "4px",
                fontWeight: 600,
              }}
            >
              {isHover ? "RELEASE TO UPLOAD" : "CSV DATA INGEST"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize:   "13px",
                color:      "var(--text-muted)",
              }}
            >
              Drop CSV file here or click to upload
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize:   "11px",
                color:      "var(--text-disabled)",
                marginTop:  "4px",
              }}
            >
              Max 50MB • Accepts .csv
            </div>
            {errorMsg && (
              <div
                role="alert"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize:   "12px",
                  color:      "var(--color-error)",
                  marginTop:  "8px",
                }}
              >
                {errorMsg}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Uploading ── */}
        {isUploading && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              style={{
                fontFamily: "var(--font-hud)",
                fontSize:   "11px",
                color:      "var(--color-ops)",
                letterSpacing: "0.15em",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              UPLOADING — {fileName}
            </div>
            <div
              data-testid="csv-progress-track"
              style={{
                width:        "100%",
                height:       "6px",
                borderRadius: "3px",
                background:   "rgba(255, 171, 0, 0.15)",
                overflow:     "hidden",
              }}
            >
              <motion.div
                data-testid="csv-progress-bar"
                style={{
                  height:     "100%",
                  background: "var(--color-ops)",
                  boxShadow:  "0 0 8px rgba(255, 171, 0, 0.6)",
                  borderRadius: "3px",
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--font-hud)",
                fontSize:   "11px",
                color:      "var(--text-muted)",
                marginTop:  "6px",
              }}
            >
              {Math.round(progress)}%
            </div>
          </motion.div>
        )}

        {/* ── Complete ── */}
        {isComplete && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              style={{
                fontFamily: "var(--font-hud)",
                fontSize:   "11px",
                color:      "var(--color-success)",
                letterSpacing: "0.15em",
                marginBottom: "4px",
                fontWeight: 600,
              }}
            >
              ✓ INGEST COMPLETE
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize:   "13px",
                color:      "var(--text-main)",
              }}
            >
              {fileName}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              data-testid="csv-reset"
              style={{
                marginTop:     "8px",
                fontFamily:    "var(--font-hud)",
                fontSize:      "11px",
                color:         "var(--color-investor)",
                background:    "transparent",
                border:        "none",
                cursor:        "pointer",
                textDecoration: "underline",
                letterSpacing: "0.1em",
              }}
            >
              UPLOAD ANOTHER
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
