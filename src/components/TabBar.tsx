"use client";

import { useFileSystem } from "@/context/FileSystem";
import styles from "./TabBar.module.css";

export function TabBar() {
  const {
    files,
    openFiles,
    activeFile,
    setActiveFile,
    closeTab,
  } = useFileSystem();

  const getName = (path: string) =>
    files.find((f) => f.path === path)?.name ?? path;

  return (
    <div className={styles.tabbar}>
      <div className={styles.tabs}>
        {openFiles.map((path) => {
          const isActive = path === activeFile;
          return (
            <div
              key={path}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              onClick={() => setActiveFile(path)}
            >
              <span className={styles.tabIcon}>📄</span>
              <span className={styles.tabName}>{getName(path)}</span>
              <button
                className={styles.tabClose}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(path);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
