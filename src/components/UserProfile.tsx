"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUpdateMyPresence } from "@liveblocks/react";

export const UserProfile: React.FC = () => {
  const updateMyPresence = useUpdateMyPresence();

  const [name, setName] = useState("Guest");
  const [editing, setEditing] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fincord_user_name");
      if (stored) {
        setName(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Compute initials from name
  const initials = useMemo(() => {
    const raw =
      name
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";
    return raw;
  }, [name]);

  // Save to localStorage + update Liveblocks presence whenever name/initials change
  useEffect(() => {
    try {
      localStorage.setItem("fincord_user_name", name);
    } catch {
      // ignore
    }

    // 🔥 This is what Cursors.tsx reads (presence.name)
    updateMyPresence({
      name,
      initials,
    } as any);
  }, [name, initials, updateMyPresence]);

  const commit = () => {
    if (!name.trim()) setName("Guest");
    setEditing(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        height: 30,
        borderRadius: 20,
        border: "1px solid #3e3e42",
        background: "#2a2d2e",
        cursor: "pointer",
      }}
      onClick={() => !editing && setEditing(true)}
    >
      {/* Avatar / Initials */}
      <div
        style={{
          width: 22,
          height: 22,
          minWidth: 22,
          minHeight: 22,
          borderRadius: "50%",
          background: "#007acc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 11,
          color: "white",
        }}
      >
        {initials}
      </div>

      {/* Name */}
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            border: "none",
            outline: "none",
            background: "#1e1e1e",
            color: "#fff",
            fontSize: 13,
            padding: "2px 4px",
            borderRadius: 4,
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 13,
            color: "#f3f3f3",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
      )}
    </div>
  );
};

export default UserProfile;
