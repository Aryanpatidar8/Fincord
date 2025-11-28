"use client";

import { useState } from "react";
import { useMutation, useStorage, useSelf } from "@liveblocks/react/suspense";
import styles from "./Chat.module.css";

export function Chat() {
    const messages = useStorage((root) => root.messages);
    const currentUser = useSelf();
    const [draft, setDraft] = useState("");

    const sendMessage = useMutation(({ storage }, text: string) => {
        if (!currentUser) return;

        const message = {
            id: crypto.randomUUID(),
            text,
            sender: currentUser.info,
            timestamp: Date.now(),
        };

        storage.get("messages").push(message);
    }, [currentUser]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (draft.trim()) {
                sendMessage(draft);
                setDraft("");
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>Chat</div>
            <div className={styles.messages}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`${styles.message} ${msg.sender.name === currentUser?.info.name ? styles.ownMessage : ""
                            }`}
                    >
                        <div className={styles.messageHeader}>
                            <span className={styles.senderName} style={{ color: msg.sender.color }}>
                                {msg.sender.name}
                            </span>
                            <span className={styles.timestamp}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className={styles.messageBody}>{msg.text}</div>
                    </div>
                ))}
            </div>
            <div className={styles.inputArea}>
                <textarea
                    className={styles.input}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                />
            </div>
        </div>
    );
}
