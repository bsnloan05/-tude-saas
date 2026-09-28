import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data;

  if (type === "load") {
    const device: "webgpu" | "wasm" = event.data.device;
    const dtype = device === "webgpu" ? "q4f16" : "q8";
    try {
      transcriber = (await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-small",
        {
          device,
          dtype,
          progress_callback: (progress: unknown) => {
            self.postMessage({ type: "progress", progress });
          },
        },
      )) as AutomaticSpeechRecognitionPipeline;
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "load-error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (type === "transcribe" && transcriber) {
    const audio: Float32Array = event.data.audio;
    const start = performance.now();
    try {
      const result = await transcriber(audio, { language: "french" });
      const elapsedMs = performance.now() - start;
      const text = Array.isArray(result) ? result[0]?.text : result.text;
      self.postMessage({
        type: "result",
        text,
        elapsedMs,
        audioSeconds: audio.length / 16000,
      });
    } catch (error) {
      self.postMessage({
        type: "transcribe-error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
