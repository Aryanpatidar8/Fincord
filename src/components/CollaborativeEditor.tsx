"use client";
import { UserProfile } from "@/components/UserProfile";

import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useRoom } from "@liveblocks/react/suspense";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import EditorComponent from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import { Cursors } from "@/components/Cursors";
import { Toolbar } from "@/components/Toolbar";
import FileSystemProviderDefault, { useFileSystem } from "@/context/FileSystem";
import { Explorer } from "@/components/Explorer";
import { TabBar } from "@/components/TabBar";
import { StatusBar } from "@/components/StatusBar";
import TerminalPanel from "@/components/TerminalPanel";
import { Chat } from "@/components/Chat";
import { Whiteboard } from "@/components/Whiteboard";
import shellStyles from "./AppShell.module.css";


function guessMonacoLanguage(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".c") || lower.endsWith(".h")) return "c";
  if (lower.endsWith(".cpp") || lower.endsWith(".cc") || lower.endsWith(".hpp"))
    return "cpp";
  if (lower.endsWith(".java")) return "java";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".go")) return "go";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".php")) return "php";
  if (lower.endsWith(".rb")) return "ruby";
  if (lower.endsWith(".sh") || lower.endsWith(".bash")) return "shell";
  return undefined; // let Monaco guess
}

// Collaborative code editor with undo/redo, live cursors, and live avatars
export function CollaborativeEditor() {
  const room = useRoom();
  const provider = getYjsProviderForRoom(room);
  const editorRef = useRef<any>(null);
  const terminalRef = useRef<{ run?: () => Promise<void> } | null>(null);

  // Layout / resize state
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);

  const shellRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<"code" | "whiteboard">("code");
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Global run hook for Piston terminal
  useEffect(() => {
    try {
      (window as any).__fincord_run_active_file__ = async () => {
        try {
          if (terminalRef.current?.run) {
            await terminalRef.current.run();
          } else {
            console.debug(
              "__fincord_run_active_file__: terminalRef.run not available"
            );
          }
        } catch (e) {
          console.error("__fincord_run_active_file__ error", e);
        }
      };
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        delete (window as any).__fincord_run_active_file__;
      } catch (e) { }
    };
  }, []);

  // Mouse handlers for resizable sidebar + terminal
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      // Sidebar drag
      if (isDraggingSidebar) {
        const min = 160;
        const max = 480;
        const newWidth = Math.min(max, Math.max(min, e.clientX));
        setSidebarWidth(newWidth);
        setIsSidebarCollapsed(false);
      }

      // Terminal drag
      if (isDraggingTerminal && shellRef.current) {
        const rect = shellRef.current.getBoundingClientRect();
        const min = 120;
        const max = rect.height - 120;

        const distanceFromTop = e.clientY - rect.top;
        const newHeight = rect.height - distanceFromTop;

        const clamped = Math.min(max, Math.max(min, newHeight));
        setTerminalHeight(clamped);
      }
    }

    function handleMouseUp() {
      if (isDraggingSidebar) setIsDraggingSidebar(false);
      if (isDraggingTerminal) setIsDraggingTerminal(false);
    }

    if (isDraggingSidebar || isDraggingTerminal) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSidebar, isDraggingTerminal]);

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const sidebarStyle: React.CSSProperties = isSidebarCollapsed
    ? { width: 0, borderRight: "none" }
    : { width: sidebarWidth };

  return (
    <FileSystemProviderDefault provider={provider}>
      <div className={shellStyles.shell} ref={shellRef}>
        {/* Top app bar: FINCORD + user profile */}
        <div className={shellStyles.topBar}>
          <div className={shellStyles.topBarLeft}>
            <span className={shellStyles.appName}>FINCORD</span>
            <span className={shellStyles.appTagline}>
              Collaborative Code Editor
            </span>
          </div>
          <div className={shellStyles.topBarRight}>
            <div style={{ display: "flex", gap: "10px", marginRight: "20px" }}>
              <button
                onClick={() => setActiveTab("code")}
                style={{
                  background: activeTab === "code" ? "#007acc" : "transparent",
                  border: "1px solid #3e3e42",
                  color: "white",
                  padding: "4px 12px",
                  cursor: "pointer"
                }}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab("whiteboard")}
                style={{
                  background: activeTab === "whiteboard" ? "#007acc" : "transparent",
                  border: "1px solid #3e3e42",
                  color: "white",
                  padding: "4px 12px",
                  cursor: "pointer"
                }}
              >
                Whiteboard
              </button>
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                style={{
                  background: isChatOpen ? "#007acc" : "transparent",
                  border: "1px solid #3e3e42",
                  color: "white",
                  padding: "4px 12px",
                  cursor: "pointer"
                }}
              >
                {isChatOpen ? "Hide Chat" : "Show Chat"}
              </button>
            </div>
            {/* Later you can pass real name/email */}
            <UserProfile />
          </div>
        </div>

        {/* Main row: sidebar + editor + terminal */}
        <div className={shellStyles.mainRow}>
          {/* Sidebar with Explorer - Only show in Code mode */}
          {activeTab === "code" && (
            <>
              <div
                className={
                  isSidebarCollapsed
                    ? `${shellStyles.sidebar} ${shellStyles.sidebarCollapsed}`
                    : shellStyles.sidebar
                }
                style={sidebarStyle}
              >
                <div className={shellStyles.sidebarHeader}>
                  <span className={shellStyles.sidebarTitle}>EXPLORER</span>
                </div>
                <div className={shellStyles.sidebarContent}>
                  {!isSidebarCollapsed && <Explorer />}
                </div>
              </div>

              {/* Sidebar resizer + collapse button */}
              <div
                className={shellStyles.sidebarResizer}
                onMouseDown={() => setIsDraggingSidebar(true)}
              >
                <button
                  type="button"
                  className={shellStyles.sidebarToggleButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSidebarCollapsed();
                  }}
                >
                  {isSidebarCollapsed ? "»" : "«"}
                </button>
              </div>
            </>
          )}

          {/* Editor Panel or Whiteboard */}
          <div className={shellStyles.editor}>
            {activeTab === "code" ? (
              <>
                <TabBar />
                <div className={shellStyles.editorContent}>
                  <div className={shellStyles.editorMain}>
                    <EditorInner provider={provider} editorRef={editorRef} />
                  </div>

                  {/* Terminal resizer */}
                  <div
                    className={shellStyles.terminalResizer}
                    onMouseDown={() => setIsDraggingTerminal(true)}
                  >
                    <div className={shellStyles.terminalResizerGrip} />
                  </div>

                  {/* Terminal Panel */}
                  <div
                    className={shellStyles.terminalContainer}
                    style={{ height: terminalHeight }}
                  >
                    <TerminalPanel
                      ref={terminalRef}
                      visible={true}
                      editorRef={editorRef}
                    />
                  </div>
                </div>
              </>
            ) : (
              <Whiteboard />
            )}
          </div>

          {/* Chat Sidebar */}
          {isChatOpen && (
            <div style={{ width: "300px", borderLeft: "1px solid #3e3e42" }}>
              <Chat />
            </div>
          )}
        </div>

        {/* Status Bar across full width */}
        <div className={shellStyles.statusBar}>
          <StatusBar editorRef={editorRef} />
        </div>
      </div>
    </FileSystemProviderDefault>
  );


}

// ---------------- EditorInner (uses monaco from @monaco-editor/react) ----------------

function EditorInner({
  provider,
  editorRef,
}: {
  provider: any;
  editorRef: React.RefObject<any>;
}) {
  const { activeFile } = useFileSystem();
  const bindingRef = useRef<MonacoBinding | null>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, []);

  const handleOnMount = useCallback(
    (editorInstance: any, monacoApi: any) => {
      (editorRef as any).current = editorInstance;
      monacoRef.current = monacoApi;

      // 🧠 Better IntelliSense for TS/JS
      const tsDefaults = monacoApi.languages.typescript.typescriptDefaults;
      const jsDefaults = monacoApi.languages.typescript.javascriptDefaults;

      tsDefaults.setCompilerOptions({
        target: monacoApi.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution:
          monacoApi.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monacoApi.languages.typescript.ModuleKind.ESNext,
        jsx: monacoApi.languages.typescript.JsxEmit.ReactJSX,
        allowJs: true,
        checkJs: true,
        strict: false,
        noEmit: true,
      });

      jsDefaults.setCompilerOptions({
        target: monacoApi.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution:
          monacoApi.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monacoApi.languages.typescript.ModuleKind.ESNext,
        allowJs: true,
        checkJs: true,
        noEmit: true,
      });

      // Example: add simple global helper so completion knows about it
      const extraLib = `
      declare function print(line: string): void;
    `;
      tsDefaults.addExtraLib(extraLib, "ts:env.d.ts");
      jsDefaults.addExtraLib(extraLib, "ts:env.d.ts");
    },
    [editorRef]
  );


  // Switch binding when activeFile changes
  useEffect(() => {
    if (!editorRef.current) return;
    if (!monacoRef.current) return;
    if (!activeFile) return;

    const monacoApi = monacoRef.current;
    const yDoc = provider.getYDoc();
    const filesMap = yDoc.getMap("files");
    const entry = filesMap.get(activeFile);
    if (!entry) return;

    const yText = yDoc.getText(entry.textName);

    // Create or reuse monaco model for this file
    const uri = monacoApi.Uri.parse(`inmemory://model/${activeFile}`);
    let model = monacoApi.editor
      .getModels()
      .find((m: any) => m.uri.toString() === uri.toString());

    if (!model) {
      const initialContent = yText.toString();
      const lang = guessMonacoLanguage(activeFile);
      model = monacoApi.editor.createModel(initialContent, lang, uri);
    }



    // Set the model on the editor
    editorRef.current.setModel(model);

    // destroy previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const timeoutId = setTimeout(() => {
      if (editorRef.current && model) {
        try {
          bindingRef.current = new MonacoBinding(
            yText,
            model as any,
            new Set([editorRef.current]),
            provider.awareness as Awareness
          );

          // Wrap the internal y-text observer with a safe try/catch
          try {
            // @ts-ignore - internal property on MonacoBinding
            const origObserver = (bindingRef.current as any)._ytextObserver;
            if (origObserver && bindingRef.current.ytext) {
              try {
                bindingRef.current.ytext.unobserve(origObserver);
              } catch (e) {
                // ignore
              }

              // @ts-ignore
              (bindingRef.current as any)._ytextObserver = (event: any) => {
                try {
                  origObserver.call(bindingRef.current, event);
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error(
                    "SafeMonacoBinding: error in _ytextObserver:",
                    err
                  );
                }
              };

              try {
                // @ts-ignore
                bindingRef.current.ytext.observe(
                  (bindingRef.current as any)._ytextObserver
                );
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            console.error("SafeMonacoBinding wrapper failed:", e);
          }
        } catch (err) {
          console.error("Error creating MonacoBinding:", err);
        }
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [activeFile, provider, editorRef]);

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {provider ? <Cursors yProvider={provider} /> : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 12px",
          borderBottom: "1px solid #3e3e42",
          gap: "8px",
        }}
      >
        {editorRef.current && <Toolbar editor={editorRef.current} />}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <EditorComponent
          onMount={(e, m) => handleOnMount(e as any, m as any)}
          height="100%"
          theme="vs-dark"
          defaultLanguage="typescript"
          defaultValue={""}
          options={{
            tabSize: 2,
            padding: { top: 12 },
            minimap: { enabled: true },
            wordWrap: "on",

            // 🔽 auto-complete goodies
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,   // ., ", ', /, etc
            acceptSuggestionOnEnter: "smart",
            parameterHints: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            formatOnType: true,
            formatOnPaste: true,
          }}

        />
      </div>
    </div>
  );
}
