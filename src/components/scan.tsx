"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { interpretQR } from "@/lib/qrcode";
import { recordPath } from "@/lib/routes";
import { useLedger } from "./ledger-provider";
import { PageHeading, Field } from "./ui";

export function Scan() {
  const { data } = useLedger();
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const stop = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stop();
        setRunning(false);
      }
    };

    document.addEventListener("visibilitychange", hide);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [stop]);

  function resolve(value: string) {
    try {
      const result = interpretQR(value, data);
      stop();
      setRunning(false);
      router.push(recordPath(result.action, result.item.id));

      return true;
    } catch (error) {
      setError((error as Error).message);

      return false;
    }
  }

  async function start() {
    stop();
    setError("");
    const request = generation.current;
    setRunning(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "カメラを使用できません。HTTPS接続を確認するか、管理番号を入力してください。",
        );

      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      if (generation.current !== request || !video.current) {
        media.getTracks().forEach((track) => track.stop());

        return;
      }

      stream.current = media;
      video.current.srcObject = media;
      await video.current.play();
      if (generation.current !== request) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      let last = 0;
      const tick = (time: number) => {
        if (generation.current !== request) return;
        const element = video.current;
        if (element && context && element.readyState >= 2 && time - last > 160) {
          last = time;
          canvas.width = element.videoWidth;
          canvas.height = element.videoHeight;
          context.drawImage(element, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(pixels.data, pixels.width, pixels.height);
          if (result && resolve(result.data)) return;
        }

        frame.current = requestAnimationFrame(tick);
      };

      frame.current = requestAnimationFrame(tick);
    } catch (error) {
      if (generation.current !== request) return;
      stop();
      setRunning(false);
      setError(
        error instanceof Error && error.message.includes("HTTPS")
          ? error.message
          : "カメラを起動できません。権限・接続を確認するか、管理番号の手入力をご利用ください。",
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="QR SCANNER"
        title="QRで読み取る"
        description="備品のQRコードをかざすと、貸出・返却画面へ進みます。"
      />
      <div className="detail-grid">
        <section className="panel">
          <div className="camera-view">
            <video ref={video} muted playsInline aria-label="QR読み取り用カメラ映像" />
            {!running && (
              <div className="camera-placeholder">
                <span>▣</span>
                <p>QRコードを枠内に合わせてください</p>
              </div>
            )}
          </div>
          <div className="actions">
            <button className="primary" disabled={running} onClick={start}>
              カメラを起動
            </button>
            <button
              disabled={!running}
              onClick={() => {
                stop();
                setRunning(false);
              }}
            >
              カメラを停止
            </button>
          </div>
          <p className="muted">
            背面カメラを優先します。映像は端末内で処理し、保存・送信しません。
          </p>
        </section>
        <section className="panel">
          <h2>管理番号で探す</h2>
          <p className="muted">カメラが使えない場合はこちらをご利用ください。</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              resolve(code);
            }}
          >
            <Field label="管理番号">
              <input
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="UMI-CAM-001"
                autoCapitalize="characters"
              />
            </Field>
            <button className="primary">備品を確認する →</button>
          </form>
          <hr />
          <Field label="登録済みの備品から選ぶ">
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) resolve(event.target.value);
              }}
            >
              <option value="">備品を選択してください</option>
              {data.items.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.name} / {item.code}
                </option>
              ))}
            </select>
          </Field>
          <Link className="text-link" href="/items">
            備品一覧から探す →
          </Link>
        </section>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </>
  );
}
