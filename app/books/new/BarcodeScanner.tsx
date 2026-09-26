"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type Props = {
  onDetected: (isbn: string) => void;
  onClose: () => void;
};

// ISBNは978/979で始まるEAN-13（下段の192〜は価格コードなので無視）
const isIsbn = (code: string) => /^97[89]\d{10}$/.test(code);

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import(
          "@zxing/library"
        );

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
        const reader = new BrowserMultiFormatReader(hints);

        const c = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const code = result.getText();
            if (!isIsbn(code)) return;
            c.stop();
            onDetected(code);
          }
        );

        if (cancelled) {
          c.stop();
        } else {
          controls = c;
        }
      } catch (e) {
        console.error("SCANNER ERROR =", e);
        setError(
          "カメラを起動できませんでした。カメラの使用許可とHTTPS接続を確認してください。"
        );
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="border rounded p-4 space-y-2">
      <p className="text-sm">
        上段のバーコード（978/979で始まる方）をカメラに映してください
      </p>

      {error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : (
        <video
          ref={videoRef}
          className="w-full max-w-md rounded bg-black"
          muted
          playsInline
        />
      )}

      <button
        type="button"
        onClick={onClose}
        className="border px-4 py-2 rounded"
      >
        閉じる
      </button>
    </div>
  );
}
