"use client";

import React, { useEffect, useState } from "react";

type StatusBarProps = {
  editorRef?: React.RefObject<any>;
};

function mapLanguageId(id: string | undefined): string {
  if (!id) return "Plain Text";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

const StatusBar: React.FC<StatusBarProps> = ({ editorRef }) => {
  const [line, setLine] = useState(1);
  const [col, setCol] = useState(1);
  const [spaces] = useState(2);
  const [encoding] = useState("UTF-8");
  const [eol, setEol] = useState<"LF" | "CRLF">("LF");
  const [language, setLanguage] = useState("Plain Text");

  useEffect(() => {
    if (!editorRef) return;
    let editor: any = editorRef.current;
    let disposables: any[] = [];
    let poll: any = null;

    const connect = () => {
      editor = editorRef.current;
      if (!editor) return false;

      const readState = () => {
        const pos = editor.getPosition?.();
        const model = editor.getModel?.();

        if (pos) {
          setLine(pos.lineNumber);
          setCol(pos.column);
        }

        if (model) {
          const langId = model.getLanguageId?.();
          setLanguage(mapLanguageId(langId));
          setEol(model.getEOL?.() === "\r\n" ? "CRLF" : "LF");
        }
      };

      readState();

      disposables = [
        editor.onDidChangeCursorPosition?.(readState),
        editor.onDidChangeModel?.(readState),
        editor.onDidChangeModelContent?.(readState),
      ].filter(Boolean);

      return true;
    };

    if (!connect()) {
      poll = setInterval(() => {
        if (connect()) {
          clearInterval(poll);
          poll = null;
        }
      }, 100);
    }

    return () => {
      disposables.forEach((d) => d?.dispose?.());
      if (poll) clearInterval(poll);
    };
  }, [editorRef]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", // <-- left + right split
        width: "100%",
        fontSize: 12,
        height: "100%",
      }}
    >
      {/* LEFT SIDE */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span>{`Ln ${line}, Col ${col}`}</span>
        <span>{language}</span>
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span>{`Spaces: ${spaces}`}</span>
        <span>{encoding}</span>
        <span>{eol}</span>
      </div>
    </div>
  );
};

export { StatusBar };
export default StatusBar;
