import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1120",
        }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="#38bdf8">
          <path d="M13 2L4 14h6l-1 8 10-13h-6l0-7z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
