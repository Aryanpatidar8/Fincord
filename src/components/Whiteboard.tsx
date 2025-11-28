"use client";

import { useState, useRef } from "react";
import { useMutation, useStorage, useSelf, useUndo, useRedo } from "@liveblocks/react/suspense";
import { LiveObject } from "@liveblocks/client";
import styles from "./Whiteboard.module.css";
import { Layer } from "@/liveblocks.config";

type Tool = "Rectangle" | "Ellipse" | "Line" | "Eraser";

const COLORS = ["#e0e0e0", "#ff9999", "#99ff99", "#99ccff", "#ffff99", "#ffcc99", "#d9b3ff"];

export function Whiteboard() {
    const layers = useStorage((root) => root.layers);
    const layerIds = useStorage((root) => root.layerIds);
    const currentUser = useSelf();
    const undo = useUndo();
    const redo = useRedo();

    const [selectedTool, setSelectedTool] = useState<Tool>("Rectangle");
    const [selectedColor, setSelectedColor] = useState(COLORS[3]); // Default blue-ish
    const [isDragging, setIsDragging] = useState(false);
    const [currentShapeId, setCurrentShapeId] = useState<string | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);

    const startDrawing = useMutation(({ storage, self }, e: React.PointerEvent) => {
        e.preventDefault();
        if (!svgRef.current) return;

        const { left, top } = svgRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        if (selectedTool === "Eraser") {
            // Eraser logic is handled in onClick of shapes, but we can also have drag-to-erase later
            // For now, let's just use click-to-delete on shapes, or maybe hit testing.
            // Simple hit testing for now:
            // Actually, let's do click-to-delete on the shape itself for better UX in this simple version
            return;
        }

        const id = crypto.randomUUID();
        const layer = new LiveObject<Layer>({
            type: selectedTool,
            x,
            y,
            height: 0,
            width: 0,
            fill: selectedColor,
            stroke: "#000",
            strokeWidth: 2,
        });

        storage.get("layers").set(id, layer);
        storage.get("layerIds").push(id);

        setCurrentShapeId(id);
        setIsDragging(true);
    }, [selectedTool, selectedColor]);

    const updateDrawing = useMutation(({ storage }, e: React.PointerEvent) => {
        if (!isDragging || !currentShapeId) return;
        e.preventDefault();

        if (!svgRef.current) return;
        const { left, top } = svgRef.current.getBoundingClientRect();
        const clientX = e.clientX - left;
        const clientY = e.clientY - top;

        const layer = storage.get("layers").get(currentShapeId);
        if (layer) {
            const startX = layer.get("x");
            const startY = layer.get("y");

            const width = clientX - startX;
            const height = clientY - startY;

            layer.update({
                width,
                height
            });
        }
    }, [isDragging, currentShapeId]);

    const stopDrawing = () => {
        setIsDragging(false);
        setCurrentShapeId(null);
    };

    const deleteLayer = useMutation(({ storage }, id: string) => {
        if (selectedTool === "Eraser") {
            storage.get("layers").delete(id);
            const ids = storage.get("layerIds");
            const index = ids.indexOf(id);
            if (index !== -1) ids.delete(index);
        }
    }, [selectedTool]);

    return (
        <div className={styles.container}>
            <div className={styles.canvasContainer}>
                <svg
                    ref={svgRef}
                    className={`${styles.canvas} ${selectedTool === "Eraser" ? styles.eraserCursor : styles.drawCursor}`}
                    onPointerDown={startDrawing}
                    onPointerMove={updateDrawing}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                >
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ddd" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {layerIds.map((id) => {
                        const layer = layers.get(id);
                        if (!layer) return null;

                        let { x, y, width, height, fill, type, stroke, strokeWidth } = layer;

                        // Normalizing geometry for rendering
                        // For Line, we don't normalize x/y/width/height like rects, we just draw from x,y to x+w,y+h

                        const onShapePointerDown = (e: React.PointerEvent) => {
                            if (selectedTool === "Eraser") {
                                e.stopPropagation();
                                deleteLayer(id);
                            }
                        };

                        if (type === "Line") {
                            return (
                                <line
                                    key={id}
                                    x1={x}
                                    y1={y}
                                    x2={x + width}
                                    y2={y + height}
                                    stroke={fill} // Use fill color for line stroke
                                    strokeWidth={4}
                                    strokeLinecap="round"
                                    onPointerDown={onShapePointerDown}
                                    className={styles.shape}
                                />
                            );
                        }

                        // For Rect/Ellipse, handle negative dimensions
                        if (width < 0) { x += width; width = Math.abs(width); }
                        if (height < 0) { y += height; height = Math.abs(height); }

                        if (type === "Rectangle") {
                            return (
                                <rect
                                    key={id}
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={fill}
                                    stroke={stroke || "rgba(0,0,0,0.2)"}
                                    strokeWidth={strokeWidth || 1}
                                    rx={4}
                                    onPointerDown={onShapePointerDown}
                                    className={styles.shape}
                                />
                            );
                        } else if (type === "Ellipse") {
                            return (
                                <ellipse
                                    key={id}
                                    cx={x + width / 2}
                                    cy={y + height / 2}
                                    rx={width / 2}
                                    ry={height / 2}
                                    fill={fill}
                                    stroke={stroke || "rgba(0,0,0,0.2)"}
                                    strokeWidth={strokeWidth || 1}
                                    onPointerDown={onShapePointerDown}
                                    className={styles.shape}
                                />
                            );
                        }
                        return null;
                    })}
                </svg>
            </div>

            {/* Floating Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolGroup}>
                    <button
                        className={`${styles.toolButton} ${selectedTool === "Rectangle" ? styles.active : ""}`}
                        onClick={() => setSelectedTool("Rectangle")}
                        title="Rectangle"
                    >
                        ⬜
                    </button>
                    <button
                        className={`${styles.toolButton} ${selectedTool === "Ellipse" ? styles.active : ""}`}
                        onClick={() => setSelectedTool("Ellipse")}
                        title="Ellipse"
                    >
                        ⭕
                    </button>
                    <button
                        className={`${styles.toolButton} ${selectedTool === "Line" ? styles.active : ""}`}
                        onClick={() => setSelectedTool("Line")}
                        title="Line"
                    >
                        📏
                    </button>
                    <button
                        className={`${styles.toolButton} ${selectedTool === "Eraser" ? styles.active : ""}`}
                        onClick={() => setSelectedTool("Eraser")}
                        title="Eraser (Click shape to delete)"
                    >
                        🧹
                    </button>
                </div>

                <div className={styles.separator} />

                <div className={styles.toolGroup}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            className={`${styles.colorBtn} ${selectedColor === c ? styles.activeColor : ""}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setSelectedColor(c)}
                        />
                    ))}
                </div>

                <div className={styles.separator} />

                <div className={styles.toolGroup}>
                    <button className={styles.toolButton} onClick={undo} title="Undo">↩️</button>
                    <button className={styles.toolButton} onClick={redo} title="Redo">↪️</button>
                </div>
            </div>
        </div>
    );
}
