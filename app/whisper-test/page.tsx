"use client";

import { useRef, useState } from "react";

// Page de test JETABLE, non reliée au reste du site : sert uniquement à
// mesurer si une transcription Whisper tournant entièrement dans le
// navigateur (sans réseau, sans API payante) est réaliste en pratique sur
// Mac/iPad, avant d'envisager de remplacer la reconnaissance vocale native.
// Rien ici n'est branché à la génération de fiches ni au reste de l'app.

const CHUNK_SECONDS = 10;
const CHUNK_SAMPLES = CHUNK_SECONDS * 16000;

type ModelStatus = "idle" | "loading" | "ready" | "error";

interface ChunkMetric {
  audioSeconds: number;
  elapsedMs: number;
}

export default function WhisperTestPage() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [loadProgress, setLoadProgress] = useState("");
  const [device, setDevice] = useState<"webgpu" | "wasm">("wasm");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState<ChunkMetric[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);
  const bufferedSamplesRef = useRef(0);

  const loadModel = () => {
    setModelStatus("loading");
    setErrorMessage("");

    const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
    const chosenDevice = hasWebGPU ? "webgpu" : "wasm";
    setDevice(chosenDevice);

    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === "progress" && data.progress?.status === "progress") {
        const pct = data.progress.progress?.toFixed(0) ?? "?";
        setLoadProgress(`${data.progress.file ?? "modèle"} — ${pct}%`);
      } else if (data.type === "ready") {
        setModelStatus("ready");
        setLoadProgress("");
      } else if (data.type === "load-error") {
        setModelStatus("error");
        setErrorMessage(data.message);
      } else if (data.type === "result") {
        setTranscript((prev) => `${prev} ${data.text}`.trim());
        setMetrics((prev) => [
          ...prev,
          { audioSeconds: data.audioSeconds, elapsedMs: data.elapsedMs },
        ]);
      } else if (data.type === "transcribe-error") {
        setErrorMessage(data.message);
      }
    };

    worker.postMessage({ type: "load", device: chosenDevice });
  };

  const flushChunk = () => {
    if (bufferedSamplesRef.current === 0) return;
    const merged = new Float32Array(bufferedSamplesRef.current);
    let offset = 0;
    for (const chunk of bufferRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    bufferRef.current = [];
    bufferedSamplesRef.current = 0;
    workerRef.current?.postMessage({ type: "transcribe", audio: merged });
  };

  const startRecording = async () => {
    setErrorMessage("");
    setTranscript("");
    setMetrics([]);
    bufferRef.current = [];
    bufferedSamplesRef.current = 0;

    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      await audioContext.audioWorklet.addModule("/whisper-recorder-worklet.js");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(audioContext, "recorder-processor");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        bufferRef.current.push(event.data);
        bufferedSamplesRef.current += event.data.length;
        if (bufferedSamplesRef.current >= CHUNK_SAMPLES) flushChunk();
      };
      source.connect(node);

      setIsRecording(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de démarrer le micro.",
      );
    }
  };

  const stopRecording = () => {
    flushChunk();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close();
    streamRef.current = null;
    audioContextRef.current = null;
    setIsRecording(false);
  };

  const totalAudioSeconds = metrics.reduce((sum, m) => sum + m.audioSeconds, 0);
  const totalElapsedMs = metrics.reduce((sum, m) => sum + m.elapsedMs, 0);
  const avgRealTimeFactor =
    totalAudioSeconds > 0 ? totalElapsedMs / 1000 / totalAudioSeconds : 0;

  return (
    <div className="min-h-screen bg-[#0b1120] px-4 py-10 text-[#e7ecf5]">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-xl font-bold">Test interne — Whisper dans le navigateur</h1>
        <p className="text-sm text-[#8b97b0]">
          Page de test jetable, non liée au reste du site. Sert à mesurer si
          Whisper tourne correctement en direct, sans réseau, sur cet
          appareil.
        </p>

        {modelStatus === "idle" && (
          <button
            onClick={loadModel}
            className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
          >
            Charger le modèle (whisper-small)
          </button>
        )}

        {modelStatus === "loading" && (
          <p className="text-sm text-[#8b97b0]">
            Téléchargement du modèle... {loadProgress}
          </p>
        )}

        {modelStatus === "error" && (
          <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            Erreur au chargement : {errorMessage}
          </p>
        )}

        {modelStatus === "ready" && (
          <>
            <p className="text-sm text-[#8b97b0]">
              Modèle chargé — mode utilisé : <strong>{device}</strong>
            </p>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                isRecording ? "bg-red-600" : "bg-[#2563eb]"
              }`}
            >
              {isRecording ? "Arrêter" : "Démarrer le test"}
            </button>

            {errorMessage && (
              <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
                {errorMessage}
              </p>
            )}

            <div className="rounded-lg border border-[#232d45] bg-[#141b2e] p-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
                Transcription
              </p>
              <p className="text-sm">{transcript || "(en attente)"}</p>
            </div>

            <div className="rounded-lg border border-[#232d45] bg-[#141b2e] p-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
                Mesures ({CHUNK_SECONDS}s par bloc)
              </p>
              <p className="mb-2 text-sm">
                Facteur temps réel moyen :{" "}
                <strong>
                  {avgRealTimeFactor > 0 ? avgRealTimeFactor.toFixed(2) : "-"}
                </strong>{" "}
                (en dessous de 1.0 = plus rapide que le direct, au-dessus =
                accumule du retard)
              </p>
              <ul className="flex flex-col gap-1 text-xs text-[#8b97b0]">
                {metrics.map((m, i) => (
                  <li key={i}>
                    Bloc {i + 1} : {m.audioSeconds.toFixed(1)}s audio traité en{" "}
                    {(m.elapsedMs / 1000).toFixed(1)}s (facteur{" "}
                    {(m.elapsedMs / 1000 / m.audioSeconds).toFixed(2)})
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
