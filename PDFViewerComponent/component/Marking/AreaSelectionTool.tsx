import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { 
    Button,
    Text,
    Tooltip
} from '@fluentui/react-components';
import '../../css/PDFViewer.css';

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
    return (
        <>
            <div
                ref={selectionBoxRef}
                className="selection-box"
                style={{
                    position: 'absolute', // Changed from 'fixed'
                    border: '2px dashed #0078d4', // Blue color
                    backgroundColor: 'rgba(0, 120, 212, 0.1)', // Blue with transparency
                    pointerEvents: 'none',
                    display: 'none',
                    zIndex: 1000
                }}
            />
            <div
                className="selection-overlay"
                style={{
                    position: 'absolute', // Changed from 'fixed'
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
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
        // Store PDF coordinates (in points) instead of canvas coordinates
        pdfX: number;
        pdfY: number;
        pdfWidth: number;
        pdfHeight: number;
        page: number;
        // Optional: store the original canvas coordinates for reference
        canvasX?: number;
        canvasY?: number;
        canvasWidth?: number;
        canvasHeight?: number;
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
    selectionBoxRef: React.RefObject<HTMLDivElement>;
    onHandlersReady: (handlers: {
        handleMouseDown: (e: React.MouseEvent) => void;
        handleMouseMove: (e: React.MouseEvent) => void;
        handleMouseUp: () => void;
    }) => void;
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
    highlightedArea,
    selectionBoxRef,
    onHandlersReady
}) => {
    const [isSelecting, setIsSelecting] = useState<boolean>(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

    // Handle selection mode toggle
    const toggleSelectionMode = useCallback(() => {
        onSelectionModeChange(!isSelectionMode);
    }, [isSelectionMode, onSelectionModeChange]);

    // Get canvas coordinates from mouse event
    const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate coordinates relative to the canvas
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        return { x, y };
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
    // Extract text from selected area using PDF coordinates
const extractTextFromArea = useCallback(async (area: { x: number; y: number; width: number; height: number; page: number }) => {
    if (!pdfDoc) return '';

    try {
        const page = await pdfDoc.getPage(area.page);
        const textContent = await page.getTextContent();
        let extractedText = '';

        textContent.items.forEach((item: any) => {
            const transform = item.transform;
            
            // PDF text positioning - transform[4] is x, transform[5] is y
            const textX = transform[4];
            const textY = transform[5]; // PDF coordinate system (0,0 at bottom-left)

            // Check if text falls within the selected area
            // Note: area coordinates are already in PDF coordinate system
            if (textX >= area.x && textX <= area.x + area.width &&
                textY >= area.y && textY <= area.y + area.height) {
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
    // Capture screenshot of selected area using current canvas
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
    // Complete selection
    const handleMouseUp = useCallback(async () => {
        if (!isSelecting || !startPos || !currentPos || !canvasRef.current) {
            setIsSelecting(false);
            setStartPos(null);
            setCurrentPos(null);
            return;
        }

        const canvas = canvasRef.current;
        
        // Calculate selection area in canvas coordinates
        const canvasX = Math.min(startPos.x, currentPos.x);
        const canvasY = Math.min(startPos.y, currentPos.y);
        const canvasWidth = Math.abs(currentPos.x - startPos.x);
        const canvasHeight = Math.abs(currentPos.y - startPos.y);

        // Only create selection if area is large enough
        if (canvasWidth > 10 && canvasHeight > 10) {
            const screenshot = captureScreenshot({ x: canvasX, y: canvasY, width: canvasWidth, height: canvasHeight });
            
            if (!pdfDoc) {
                console.error('PDF document not loaded');
                return;
            }

            try {
                const page = await pdfDoc.getPage(currentPage);
                const pdfViewport = page.getViewport({ scale: 1.0 });
                const canvasViewport = page.getViewport({ scale: scale, rotation: rotation });
                
                // Convert from canvas pixels to PDF points
                const pdfX = (canvasX / canvasViewport.width) * pdfViewport.width;
                const pdfY = (canvasY / canvasViewport.height) * pdfViewport.height;
                const pdfWidth = (canvasWidth / canvasViewport.width) * pdfViewport.width;
                const pdfHeight = (canvasHeight / canvasViewport.height) * pdfViewport.height;

                // For text extraction, we need to adjust Y coordinate since PDF coordinate system is flipped
                const text = await extractTextFromArea({
                    x: pdfX,
                    y: pdfViewport.height - pdfY - pdfHeight, // Adjust for PDF coordinate system
                    width: pdfWidth,
                    height: pdfHeight,
                    page: currentPage
                });

                const selectedArea: SelectedArea = {
                    id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    text: text || 'No text detected in selected area',
                    screenshot,
                    position: {
                        // Store PDF coordinates (in points)
                        pdfX,
                        pdfY,
                        pdfWidth,
                        pdfHeight,
                        page: currentPage,
                        // Store original canvas coordinates for reference
                        canvasX,
                        canvasY,
                        canvasWidth,
                        canvasHeight
                    },
                    timestamp: Date.now()
                };

                onAreaSelected(selectedArea);
            } catch (error) {
                console.error('Error creating selected area:', error);
            }
        }

        setIsSelecting(false);
        setStartPos(null);
        setCurrentPos(null);
    }, [isSelecting, startPos, currentPos, canvasRef, scale, rotation, currentPage, pdfDoc, captureScreenshot, extractTextFromArea, onAreaSelected]);

    // Draw selection box
    // Draw selection box
    useEffect(() => {
        if (!selectionBoxRef.current || !startPos || !currentPos || !canvasRef.current) return;

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        const box = selectionBoxRef.current;
        
        // Position the selection box relative to the canvas (absolute positioning)
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        box.style.display = 'block';
    }, [startPos, currentPos, canvasRef]);

    // Hide selection box when not selecting
    useEffect(() => {
        if (!selectionBoxRef.current) return;
        
        const box = selectionBoxRef.current;
        if (!isSelecting) {
            box.style.display = 'none';
        }
    }, [isSelecting]);

    // Pass handlers to parent component
    useEffect(() => {
        onHandlersReady({
            handleMouseDown,
            handleMouseMove,
            handleMouseUp
        });
    }, [handleMouseDown, handleMouseMove, handleMouseUp, onHandlersReady]);

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
        </div>
    );
};

export { CanvasOverlay };