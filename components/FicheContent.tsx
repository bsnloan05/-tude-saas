"use client";

import { type ReactNode, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

const MermaidDiagram = dynamic(() => import("@/components/MermaidDiagram"), {
  ssr: false,
  loading: () => (
    <div className="my-4 h-24 animate-pulse rounded-md bg-[#1b2440]" />
  ),
});

export default function FicheContent({
  notes,
  highlightMode,
}: {
  notes: string;
  highlightMode: boolean;
}) {
  return (
    <div className="text-[#c3cbdc]">
      <ReactMarkdown
        components={{
          h2: (props) => (
            <h2
              className={`mt-6 mb-3 text-2xl font-semibold first:mt-0 ${
                highlightMode ? "text-amber-400" : "text-[#e7ecf5]"
              }`}
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className={`mt-4 mb-2 text-base font-semibold ${
                highlightMode ? "text-teal-400" : "text-[#8b97b0]"
              }`}
              {...props}
            />
          ),
          p: (props) => <p className="mb-3 leading-relaxed" {...props} />,
          ul: (props) => (
            <ul
              className={`mb-3 list-disc space-y-1.5 pl-6 ${
                highlightMode ? "marker:text-amber-400" : "marker:text-[#8b97b0]"
              }`}
              {...props}
            />
          ),
          li: (props) => <li {...props} />,
          strong: (props) => (
            <strong
              className={
                highlightMode
                  ? "rounded bg-[#38bdf8]/20 px-1 font-semibold text-[#7dd3fc]"
                  : "font-semibold text-[#e7ecf5]"
              }
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const isMermaid = /language-mermaid/.test(className ?? "");
            if (isMermaid) {
              return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ children, ...props }) => {
            const text = extractText(children);
            if (text.includes("⚠️")) {
              return (
                <blockquote
                  className="my-4 rounded-r-lg border-l-4 border-amber-500 bg-amber-500/10 py-2.5 pr-3 pl-4 text-amber-200 [&>p]:mb-0"
                  {...props}
                >
                  {children}
                </blockquote>
              );
            }
            if (text.trimStart().startsWith("L'essentiel")) {
              return (
                <blockquote
                  className="my-4 rounded-r-lg border-l-4 border-[#38bdf8] bg-[#38bdf8]/10 py-2.5 pr-3 pl-4 text-[#7dd3fc] [&>p]:mb-0"
                  {...props}
                >
                  {children}
                </blockquote>
              );
            }
            return (
              <blockquote
                className={
                  highlightMode
                    ? "my-4 rounded-r-lg border-l-4 border-emerald-500 bg-emerald-500/10 py-2.5 pr-3 pl-4 text-emerald-200 [&>p]:mb-0"
                    : "my-4 border-l-2 border-[#2a3552] pl-4 text-[#8b97b0] [&>p]:mb-0"
                }
                {...props}
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {notes}
      </ReactMarkdown>
    </div>
  );
}
