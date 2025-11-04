import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { 
    Button,
    Text,
    Tooltip
} from '@fluentui/react-components';

interface CanvasOverlayProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    selectionBoxRef: React.RefObject<HTMLDivElement>;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
}

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
    canvasRef,
    selectionBoxRef,
    onMouseDown,
    onMouseMove,
    onMouseUp
}) => {
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);

    // Update canvas position on mount and resize
    useEffect(() => {
        if (!canvasRef.current) return;

        const updateCanvasRect = () => {
            if (canvasRef.current) {
                setCanvasRect(canvasRef.current.getBoundingClientRect());
            }
        };

        updateCanvasRect();
        window.addEventListener('resize', updateCanvasRect);
        window.addEventListener('scroll', updateCanvasRect);

        return () => {
            window.removeEventListener('resize', updateCanvasRect);
            window.removeEventListener('scroll', updateCanvasRect);
        };
    }, [canvasRef.current]);

    if (!canvasRect) return null;

    return (
        <>
            <div
                ref={selectionBoxRef}
                className="selection-box"
                style={{
                    position: 'fixed',
                    border: '2px dashed #0078d4',
                    backgroundColor: 'rgba(0, 120, 212, 0.1)',
                    pointerEvents: 'none',
                    display: 'none',
                    zIndex: 1000
                }}
            />
            <div
                className="selection-overlay"
                style={{
                    position: 'fixed',
                    top: `${canvasRect.top}px`,
                    left: `${canvasRect.left}px`,
                    width: `${canvasRect.width}px`,
                    height: `${canvasRect.height}px`,
                    cursor: 'crosshair',
                    zIndex: 999,
                    background: 'transparent'
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            />
        </>
    );
};


export interface SelectedArea {
    id: string;
    text: string;
    screenshot: string; // base64 image
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    };
    timestamp: number;
}

interface AreaSelectionToolProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    pdfDoc: any;
    currentPage: number;
    scale: number;
    rotation: number;
    onAreaSelected: (area: SelectedArea) => void;
    isSelectionMode: boolean;
    onSelectionModeChange: (enabled: boolean) => void;
    highlightedArea?: SelectedArea | null;
}

export const AreaSelectionTool: React.FC<AreaSelectionToolProps> = ({
    canvasRef,
    pdfDoc,
    currentPage,
    scale,
    rotation,
    onAreaSelected,
    isSelectionMode,
    onSelectionModeChange,
    highlightedArea
}) => {
    const [isSelecting, setIsSelecting] = useState<boolean>(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
    const selectionBoxRef = useRef<HTMLDivElement>(null);

    // Handle selection mode toggle
    const toggleSelectionMode = useCallback(() => {
        onSelectionModeChange(!isSelectionMode);
    }, [isSelectionMode, onSelectionModeChange]);

    // Get canvas coordinates from mouse event
    const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }, [canvasRef]);

    // Start selection
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isSelectionMode || !canvasRef.current) return;
        
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        setStartPos(coords);
        setCurrentPos(coords);
        setIsSelecting(true);
    }, [isSelectionMode, canvasRef, getCanvasCoordinates]);

    // Update selection
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !startPos) return;
        
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        setCurrentPos(coords);
    }, [isSelecting, startPos, getCanvasCoordinates]);

    // Extract text from selected area
    const extractTextFromArea = useCallback(async (area: { x: number; y: number; width: number; height: number; page: number }) => {
        if (!pdfDoc) return '';

        try {
            const page = await pdfDoc.getPage(area.page);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Get text content
            const textContent = await page.getTextContent();
            let extractedText = '';

            // Simple text extraction based on position
            textContent.items.forEach((item: any) => {
                // Basic position matching (this is simplified - you might need more complex logic)
                const transform = item.transform;
                const x = transform[4];
                const y = transform[5];
                
                if (x >= area.x && x <= area.x + area.width &&
                    y >= area.y && y <= area.y + area.height) {
                    extractedText += item.str + ' ';
                }
            });

            return extractedText.trim();
        } catch (error) {
            console.error('Error extracting text:', error);
            return '';
        }
    }, [pdfDoc]);

    // Capture screenshot of selected area
    const captureScreenshot = useCallback((area: { x: number; y: number; width: number; height: number }) => {
        if (!canvasRef.current) return '';
        
        const canvas = canvasRef.current;
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) return '';
        
        tempCanvas.width = area.width;
        tempCanvas.height = area.height;
        
        // Draw the selected area to temp canvas
        ctx.drawImage(
            canvas,
            area.x, area.y, area.width, area.height,
            0, 0, area.width, area.height
        );
        
        return tempCanvas.toDataURL('image/png');
    }, [canvasRef]);

    // Complete selection
    const handleMouseUp = useCallback(async () => {
        if (!isSelecting || !startPos || !currentPos || !canvasRef.current) {
            setIsSelecting(false);
            setStartPos(null);
            setCurrentPos(null);
            return;
        }

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate selection area
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        // Only create selection if area is large enough
        if (width > 10 && height > 10) {
            const screenshot = captureScreenshot({ x, y, width, height });
            const text = await extractTextFromArea({
                x: x / scale,
                y: y / scale,
                width: width / scale,
                height: height / scale,
                page: currentPage
            });

            const selectedArea: SelectedArea = {
                id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: text || 'No text detected in selected area',
                screenshot,
                position: {
                    x,
                    y,
                    width,
                    height,
                    page: currentPage
                },
                timestamp: Date.now()
            };

            onAreaSelected(selectedArea);
        }

        setIsSelecting(false);
        setStartPos(null);
        setCurrentPos(null);
    }, [isSelecting, startPos, currentPos, canvasRef, scale, currentPage, captureScreenshot, extractTextFromArea, onAreaSelected]);

    // Draw selection box
    useEffect(() => {
        if (!selectionBoxRef.current || !startPos || !currentPos) return;

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        const box = selectionBoxRef.current;
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        box.style.display = 'block';
    }, [startPos, currentPos]);

    // Draw highlighted area
    useEffect(() => {
        if (!canvasRef.current || !highlightedArea || highlightedArea.position.page !== currentPage) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Save current canvas state
        ctx.save();

        // Draw highlight rectangle
        ctx.strokeStyle = '#0078d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            highlightedArea.position.x,
            highlightedArea.position.y,
            highlightedArea.position.width,
            highlightedArea.position.height
        );

        // Draw semi-transparent fill
        ctx.fillStyle = 'rgba(0, 120, 212, 0.1)';
        ctx.fillRect(
            highlightedArea.position.x,
            highlightedArea.position.y,
            highlightedArea.position.width,
            highlightedArea.position.height
        );

        // Restore canvas state
        ctx.restore();
    }, [highlightedArea, currentPage, canvasRef]);

        return (
    <div className="area-selection-tool">
        {/* Selection Mode Toggle */}
        <Tooltip content={isSelectionMode ? "Exit selection mode" : "Enter selection mode"} relationship="label">
            <Button
                appearance={isSelectionMode ? "primary" : "secondary"}
                onClick={toggleSelectionMode}
                size="small"
            >
                {isSelectionMode ? "✔ Selection Mode" : "📐 Select Areas"}
            </Button>
        </Tooltip>

        {/* Selection Box and Overlay - These will be positioned over the canvas */}
        {isSelectionMode && canvasRef.current && (
            <CanvasOverlay
                canvasRef={canvasRef}
                selectionBoxRef={selectionBoxRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
        )}

        <style>{`
            .area-selection-tool {
                position: relative;
                display: flex;
                align-items: center;
            }

            .selection-box {
                transition: all 0.1s ease;
            }

            .selection-overlay {
                background: transparent;
            }

            @media (max-width: 768px) {
                .area-selection-tool {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
            }
        `}</style>
    </div>
);
};