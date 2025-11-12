import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { 
    Button,
    Input,
    Label,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
    ToolbarGroup,
    Spinner,
    Text,
    useId,
    Select,
    Option,
    Field
} from '@fluentui/react-components';
import { AreaSelectionTool, SelectedArea, CanvasOverlay } from './component/Marking/AreaSelectionTool';
import {  SelectedAreasList } from './component/Marking/SelectedAreasList';
import { WeatherWidget } from './component/Weather/WeatherWidget';
import './css/PDFViewer.css';

// Declare pdfjsLib in global scope
declare global {
    interface Window {
        pdfjsLib: any;
    }
}

interface PDFViewerProps {
    showThumbnails?: boolean;
    enableDownload?: boolean;
    enablePrint?: boolean;
    allocatedWidth?: number;
    allocatedHeight?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
    showThumbnails = true,
    enableDownload = true,
    enablePrint = true,
    allocatedWidth = 800,
    allocatedHeight = 600
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isPDFJSLoaded, setIsPDFJSLoaded] = useState<boolean>(false);

    // Marking related states
    const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
    const [highlightedArea, setHighlightedArea] = useState<SelectedArea | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const selectionBoxRef = useRef<HTMLDivElement>(null);
    const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputId = useId('pdf-file-input');
    
    // Add a ref to track the current render task
    const renderTaskRef = useRef<any>(null);

    // Mouse handlers that will be passed to CanvasOverlay
    const [mouseHandlers, setMouseHandlers] = useState<{
        handleMouseDown: (e: React.MouseEvent) => void;
        handleMouseMove: (e: React.MouseEvent) => void;
        handleMouseUp: () => void;
    }>({
        handleMouseDown: () => {},
        handleMouseMove: () => {},
        handleMouseUp: () => {}
    });

    // Update mouse handlers when AreaSelectionTool provides them
    const updateMouseHandlers = useCallback((handlers: {
        handleMouseDown: (e: React.MouseEvent) => void;
        handleMouseMove: (e: React.MouseEvent) => void;
        handleMouseUp: () => void;
    }) => {
        setMouseHandlers(handlers);
    }, []);

    // Responsive behavior based on allocated dimensions
    const isMobile = allocatedWidth < 768;

    // Your proven PDF.js loading approach
    const loadPDFJS = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib.GlobalWorkerOptions) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
                setIsPDFJSLoaded(true);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js';
            script.onload = () => {
                setTimeout(() => {
                    if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib.GlobalWorkerOptions) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
                    }
                    setIsPDFJSLoaded(true);
                    resolve();
                }, 100);
            };
            script.onerror = () => {
                console.error('Failed to load PDF.js');
                setError('Failed to load PDF viewer. Please refresh the page.');
                resolve();
            };
            document.head.appendChild(script);
        });
    }, []);

    useEffect(() => {
        void loadPDFJS();
    }, [loadPDFJS]);

    // Update selection box rendering to handle responsive scaling - KEEP THIS FIX
    useEffect(() => {
        if (!canvasRef.current || !selectionCanvasRef.current || !pdfDoc) return;
        
        const mainCanvas = canvasRef.current;
        const selectionCanvas = selectionCanvasRef.current;
        const ctx = selectionCanvas.getContext('2d');
        
        if (!ctx) return;
        
        const drawSelectionBoxes = async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber);
                const pdfViewport = page.getViewport({ scale: 1.0 });
                const currentViewport = page.getViewport({ scale: scale });
                
                // Match selection canvas size to main canvas
                selectionCanvas.width = mainCanvas.width;
                selectionCanvas.height = mainCanvas.height;
                
                // Clear previous drawings
                ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
                
                // Get all selected areas for the current page ONLY
                const currentPageAreas = selectedAreas.filter(area => area.position.page === pageNumber);
                
                if (currentPageAreas.length === 0) return;
                
                currentPageAreas.forEach((area) => {
                    // Convert stored PDF coordinates to current canvas coordinates
                    // This ensures the boxes stay in the correct position regardless of screen size
                    const canvasX = (area.position.pdfX / pdfViewport.width) * currentViewport.width;
                    const canvasY = (area.position.pdfY / pdfViewport.height) * currentViewport.height;
                    const canvasWidth = (area.position.pdfWidth / pdfViewport.width) * currentViewport.width;
                    const canvasHeight = (area.position.pdfHeight / pdfViewport.height) * currentViewport.height;
                    
                    const isHighlighted = highlightedArea?.id === area.id;
                    
                    // Draw selection rectangle
                    ctx.strokeStyle = isHighlighted ? '#0078d4' : '#0078d4';
                    ctx.lineWidth = isHighlighted ? 3 : 2;
                    ctx.setLineDash(isHighlighted ? [5, 5] : []);
                    ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);

                    // Draw semi-transparent fill
                    ctx.fillStyle = isHighlighted ? 'rgba(0, 120, 212, 0.3)' : 'rgba(0, 120, 212, 0.1)';
                    ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
                });
            } catch (error) {
                console.error('Error drawing selection boxes:', error);
            }
        };
        
        drawSelectionBoxes();
    }, [selectedAreas, highlightedArea, pageNumber, scale, pdfDoc]);

    // Load and render PDF
    const loadPDF = useCallback(async (file: File) => {
        if (!isPDFJSLoaded || !window.pdfjsLib) {
            setError('PDF viewer is still loading. Please try again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
            
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setPageNumber(1);
            setLoading(false);
            
            // Render first page
            await renderPage(pdf, 1);
        } catch (err) {
            console.error('Error loading PDF:', err);
            setError('Failed to load PDF file. Please ensure it\'s a valid PDF.');
            setLoading(false);
        }
    }, [isPDFJSLoaded]);

    // Render specific page with proper cleanup - FIXED VERSION
    // Render specific page with proper cleanup - FIXED VERSION
    const renderPage = useCallback(async (pdf: any, pageNum: number) => {
        // Double-check all required elements are available
        if (!pdf || !canvasRef.current) {
            console.error('PDF or canvas not available for rendering');
            return;
        }

        const canvas = canvasRef.current;
        
        // Additional safety check
        if (!canvas) {
            console.error('Canvas element is null');
            return;
        }

        try {
            // Cancel any ongoing render task
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }

            const page = await pdf.getPage(pageNum);
            const ctx = canvas.getContext('2d');
            
            // Check if context is available
            if (!ctx) {
                console.error('Canvas context is null');
                return;
            }
            
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            // Store the render task and wait for it to complete
            renderTaskRef.current = page.render(renderContext);
            await renderTaskRef.current.promise;
            renderTaskRef.current = null;
            
        } catch (err) {
            // For now, log all errors to see what's happening
            console.error('Error in renderPage:', err);
            
            // Check if it's a cancellation error by inspecting the actual error
            if (err && typeof err === 'object') {
                const errString = JSON.stringify(err);
                if (errString.includes('RenderingCancelled') || errString.includes('cancelled')) {
                    console.log('Render operation was cancelled (expected)');
                    return;
                }
            }
            
            setError('Error displaying PDF page.');
        }
    }, [scale]);

    // Re-render when page, scale, or rotation changes
    useEffect(() => {
        if (pdfDoc && pageNumber >= 1 && pageNumber <= numPages && canvasRef.current) {
            renderPage(pdfDoc, pageNumber);
        }
    }, [pageNumber, scale, pdfDoc, numPages, renderPage]);

    // Add a resize observer to handle responsive changes - KEEP THIS FIX
    useEffect(() => {
        if (!canvasRef.current || !pdfDoc) return;

        const handleResize = () => {
            // Force re-render of the current page and selection boxes when window resizes
            if (pdfDoc && pageNumber >= 1 && pageNumber <= numPages) {
                renderPage(pdfDoc, pageNumber);
            }
        };

        // Use ResizeObserver for better performance than listening to window resize
        const resizeObserver = new ResizeObserver(handleResize);
        if (canvasRef.current) {
            resizeObserver.observe(canvasRef.current);
        }

        // Also listen to window resize for additional safety
        window.addEventListener('resize', handleResize);
        
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [pdfDoc, pageNumber, numPages, renderPage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel any ongoing render task when component unmounts
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            void loadPDF(selectedFile);
        } else if (selectedFile) {
            setError('Please select a valid PDF file (application/pdf)');
        }
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.3));
    const handleZoomFit = () => {
        const fitScale = (allocatedWidth - 100) / 800;
        setScale(Math.max(0.5, Math.min(fitScale, 2.0)));
    };

    const goToPreviousPage = () => {
        if (pageNumber > 1) {
            setPageNumber(prev => Math.max(prev - 1, 1));
        }
    };

    const goToNextPage = () => {
        if (pageNumber < numPages) {
            setPageNumber(prev => Math.min(prev + 1, numPages));
        }
    };

    const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newPage = parseInt(event.target.value, 10);
        if (!isNaN(newPage) && newPage >= 1 && newPage <= numPages) {
            setPageNumber(newPage);
        }
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    const handleDownload = () => {
        if (file) {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handlePrint = () => {
        if (file) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                const fileUrl = URL.createObjectURL(file);
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Print PDF</title>
                            <style>
                                body { margin: 0; padding: 20px; }
                                iframe { width: 100%; height: 100vh; border: none; }
                            </style>
                        </head>
                        <body>
                            <iframe src="${fileUrl}"></iframe>
                        </body>
                    </html>
                `);
                printWindow.document.close();
                
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        }
    };

    // Marking related handlers
    const handleAreaSelected = useCallback((area: SelectedArea) => {
        setSelectedAreas(prev => [...prev, area]);
    }, []);

    const handleAreaHighlight = useCallback((area: SelectedArea | null) => {
        setHighlightedArea(area);
    }, []);

    const handleAreaRemove = useCallback((areaId: string) => {
        setSelectedAreas(prev => prev.filter(area => area.id !== areaId));
    }, []);

    const handleClearAllAreas = useCallback(() => {
        setSelectedAreas([]);
    }, []);

    return (
        <div className="virtual-pdf-viewer">
            <WeatherWidget />
            {/* Hidden file input */}
            <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {!file ? (
                <div className="file-upload-area">
                    <div className="upload-content">
                        <Text size={500} weight="semibold" align="center">
                            PDF Viewer
                        </Text>
                        <Text align="center" style={{ marginBottom: '20px' }}>
                            {!isPDFJSLoaded ? 'Loading PDF viewer...' : 'Upload a PDF file to get started'}
                        </Text>
                        {!isPDFJSLoaded ? (
                            <Spinner size="large" />
                        ) : (
                            <Button 
                                appearance="primary" 
                                onClick={triggerFileInput} 
                                size="large"
                            >
                                Choose PDF File
                            </Button>
                        )}
                        <Label htmlFor={fileInputId} style={{ marginTop: '8px' }}>
                            Supported format: .pdf
                        </Label>
                    </div>
                </div>
            ) : (
                <div className="pdf-container">
                    {/* Enhanced Toolbar with responsive design */}
                    <Toolbar className="pdf-toolbar">
                        <ToolbarGroup className="toolbar-section">
                            <Button 
                                appearance="subtle" 
                                onClick={triggerFileInput}
                                size="small"
                            >
                                {isMobile ? 'Change' : 'Change File'}
                            </Button>
                            
                            {/* Area Selection Tool */}
                            <AreaSelectionTool
                                canvasRef={canvasRef}
                                pdfDoc={pdfDoc}
                                currentPage={pageNumber}
                                scale={scale}
                                onAreaSelected={handleAreaSelected}
                                isSelectionMode={isSelectionMode}
                                onSelectionModeChange={setIsSelectionMode}
                                highlightedArea={highlightedArea}
                                selectionBoxRef={selectionBoxRef}
                                onHandlersReady={updateMouseHandlers}
                            />
                        </ToolbarGroup>

                        <ToolbarDivider />

                        <ToolbarGroup className="toolbar-section">
                            <ToolbarButton 
                                onClick={goToPreviousPage} 
                                disabled={pageNumber <= 1}
                            >
                                ◀ Prev
                            </ToolbarButton>
                            <div className="page-controls">
                                <Field size="small" style={{ margin: 0 }}>
                                    <Input
                                        type="number"
                                        value={pageNumber.toString()}
                                        onChange={handlePageInputChange}
                                        min={1}
                                        max={numPages}
                                        size="small"
                                        style={{ width: isMobile ? '50px' : '60px' }}
                                    />
                                </Field>
                                <Text size={300}>/ {numPages}</Text>
                            </div>
                            <ToolbarButton 
                                onClick={goToNextPage} 
                                disabled={pageNumber >= numPages}
                            >
                                Next ▶
                            </ToolbarButton>
                        </ToolbarGroup>

                        <ToolbarDivider />

                        <ToolbarGroup className="toolbar-section">
                            <ToolbarButton 
                                onClick={handleZoomOut} 
                                disabled={scale <= 0.3}
                            >
                                -
                            </ToolbarButton>
                            <Select
                                value={`${Math.round(scale * 100)}%`}
                                onChange={(e, data) => {
                                    const newScale = parseInt(data.value?.replace('%', '') || '100') / 100;
                                    setScale(newScale);
                                }}
                                size="small"
                                style={{ minWidth: isMobile ? '80px' : '100px' }}
                            >
                                <Option value="50%">50%</Option>
                                <Option value="75%">75%</Option>
                                <Option value="100%">100%</Option>
                                <Option value="125%">125%</Option>
                                <Option value="150%">150%</Option>
                                <Option value="200%">200%</Option>
                            </Select>
                            <ToolbarButton 
                                onClick={handleZoomIn} 
                                disabled={scale >= 3.0}
                            >
                                +
                            </ToolbarButton>
                            {!isMobile && (
                                <ToolbarButton onClick={handleZoomFit}>
                                    Fit Width
                                </ToolbarButton>
                            )}
                        </ToolbarGroup>

                        <ToolbarDivider />

                        <ToolbarGroup className="toolbar-section">
                            {enableDownload && (
                                <ToolbarButton onClick={handleDownload}>
                                    Download
                                </ToolbarButton>
                            )}
                            {enablePrint && (
                                <ToolbarButton onClick={handlePrint}>
                                    Print
                                </ToolbarButton>
                            )}
                        </ToolbarGroup>
                    </Toolbar>

                    {/* PDF Content Area */}
                    <div className="pdf-content-area">                       
                        <div className="pdf-main-content">
                            {loading && (
                                <div className="loading-container">
                                    <Spinner size="large" label="Loading PDF document..." />
                                </div>
                            )}
                            
                            {error && (
                                <div className="error-container">
                                    <Text style={{ color: '#d13438' }}>{error}</Text>
                                    <Button appearance="primary" onClick={triggerFileInput}>
                                        Try Another File
                                    </Button>
                                </div>
                            )}

                            {!loading && !error && pdfDoc && (
                                <div className="pdf-document-container">
                                    <div style={{ 
                                        position: 'relative', 
                                        display: 'inline-block',
                                        transition: 'transform 0.3s ease'
                                    }}>
                                        <canvas 
                                            ref={canvasRef} 
                                            className="pdf-canvas"
                                        />
                                        {/* Add overlay canvas for selection boxes */}
                                        <canvas
                                            ref={selectionCanvasRef}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                pointerEvents: 'none',
                                                zIndex: 2
                                            }}
                                        />
                                        {/* CanvasOverlay with real mouse handlers */}
                                        {isSelectionMode && (
                                            <CanvasOverlay
                                                canvasRef={canvasRef}
                                                selectionBoxRef={selectionBoxRef}
                                                onMouseDown={mouseHandlers.handleMouseDown}
                                                onMouseMove={mouseHandlers.handleMouseMove}
                                                onMouseUp={mouseHandlers.handleMouseUp}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected Areas List */}
                    <div className="selected-areas-container">
                        <SelectedAreasList
                            selectedAreas={selectedAreas}
                            onAreaHighlight={handleAreaHighlight}
                            onAreaRemove={handleAreaRemove}
                            onClearAll={handleClearAllAreas}
                            highlightedArea={highlightedArea}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};