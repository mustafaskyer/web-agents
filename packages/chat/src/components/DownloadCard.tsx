import type { AdapterStatus } from "../types";

const mb = (bytes: number): string => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

/** Props of the download card. */
export interface DownloadCardProps {
  status: Extract<AdapterStatus, { state: "needs-download" | "downloading" | "loading" | "error" }>;
  /** The size, kept from `needs-download` so progress can show "380 MB of 1.4 GB". */
  bytes?: number;
  /** Start (or retry) the download: the person's explicit click. */
  onDownload(): void;
  /** Abort the running download. */
  onCancel(): void;
  /** Switch to another assistant (shown when there is one). */
  onUseOther?: () => void;
  otherLabel?: string;
}

/**
 * Consent before a model download (never automatic), then determinate progress with Cancel, or Retry after a failure.
 * A model already on the device shows as loading from disk, never as a download.
 */
export function DownloadCard({ status, bytes, onDownload, onCancel, onUseOther, otherLabel }: DownloadCardProps) {
  if (status.state === "downloading" || status.state === "loading") {
    const progress = status.state === "downloading" ? status.progress : (status.progress ?? 0);
    const fromDisk = status.state === "loading";
    const pct = Math.round(progress * 100);
    // the files are in; loading them into the GPU (or WASM) can take a while the first time, with nothing to count
    const starting = progress >= 1;
    return (
      <div className="wa-chat__download">
        <p className="wa-chat__download-title">
          {starting ? "Starting the model on this device…" : fromDisk ? "Loading the model from this device…" : "Downloading the model…"}
        </p>
        <div
          className="wa-chat__progress"
          role="progressbar"
          aria-label={fromDisk ? "Model loading" : "Model download"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="wa-chat__download-meta">
          {starting
            ? fromDisk
              ? "Nothing to download: the files are already here."
              : "The first start can take a few minutes."
            : `${pct}%${bytes ? ` · ${mb(bytes * progress)} of ${mb(bytes)}` : ""}`}
        </p>
        <button type="button" className="wa-chat__button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }
  if (status.state === "error") {
    return (
      <div className="wa-chat__download" role="alert">
        <p className="wa-chat__download-title">The download didn't finish</p>
        <p>{status.error}</p>
        <button type="button" className="wa-chat__button" data-primary="" onClick={onDownload}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="wa-chat__download">
      <p className="wa-chat__download-title">Run the assistant on this device</p>
      <p>
        {status.bytes ? `Downloads ${mb(status.bytes)} once.` : "Needs a one-time download."} Nothing you type leaves your browser.
        {status.note ? ` ${status.note}` : ""}
      </p>
      <div className="wa-chat__download-actions">
        <button type="button" className="wa-chat__button" data-primary="" onClick={onDownload}>
          Download
        </button>
        {onUseOther && (
          <button type="button" className="wa-chat__button" onClick={onUseOther}>
            Use {otherLabel ?? "another assistant"} instead
          </button>
        )}
      </div>
    </div>
  );
}
