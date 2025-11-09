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
    const extractTextFromArea = useCallback(async (area: { x: number; y: number; width: number; height: number; page: number }) => {
        if (!pdfDoc) return '';

        try {
            const page = await pdfDoc.getPage(area.page);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Get text content
            const textContent = await page.getTextContent();
            let extractedText = '';

            // Transform canvas coordinates to PDF coordinates
            // The PDF coordinate system has (0,0) at bottom-left, while canvas has it at top-left
            const pdfHeight = viewport.height;
            
            textContent.items.forEach((item: any, index: number) => {
                const transform = item.transform;
                
                // PDF text positioning - transform[4] is x, transform[5] is y
                const textX = transform[4];
                const textY = pdfHeight - transform[5]; // Flip Y coordinate

                console.log(`Text item ${index}: "${item.str}" at (${textX}, ${textY})`);

                // Check if text falls within the selected area
                // Note: PDF coordinates are in points (1/72 inch), we need to convert from canvas pixels
                if (textX >= area.x && textX <= area.x + area.width &&
                    textY >= area.y && textY <= area.y + area.height) {
                    extractedText += item.str + ' ';
                    console.log(`✓ Text "${item.str}" is within selection`);
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
        
        // Calculate selection area in canvas coordinates
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(currentPos.x - startPos.x);
        const height = Math.abs(currentPos.y - startPos.y);

        // Only create selection if area is large enough
        if (width > 10 && height > 10) {
            const screenshot = captureScreenshot({ x, y, width, height });
            
            // Convert canvas coordinates to PDF coordinates
            // We need to account for the PDF coordinate system and scale
            const page = await pdfDoc.getPage(currentPage);
            const pdfViewport = page.getViewport({ scale: 1.0 });
            const canvasViewport = page.getViewport({ scale: scale, rotation: rotation });
            
            // Convert from canvas pixels to PDF points
            const pdfX = (x / canvasViewport.width) * pdfViewport.width;
            const pdfY = pdfViewport.height - ((y / canvasViewport.height) * pdfViewport.height); // Flip Y coordinate
            const pdfWidth = (width / canvasViewport.width) * pdfViewport.width;
            const pdfHeight = (height / canvasViewport.height) * pdfViewport.height;

            const text = await extractTextFromArea({
                x: pdfX,
                y: pdfY - pdfHeight, // Adjust Y coordinate for the selection area
                width: pdfWidth,
                height: pdfHeight,
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
    }, [isSelecting, startPos, currentPos, canvasRef, scale, rotation, currentPage, pdfDoc, captureScreenshot, extractTextFromArea, onAreaSelected]);
        
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