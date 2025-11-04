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
    const [rotation, setRotation] = useState<number>(0);
    const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(true);
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isPDFJSLoaded, setIsPDFJSLoaded] = useState<boolean>(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputId = useId('pdf-file-input');

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

    // Render specific page
    const renderPage = useCallback(async (pdf: any, pageNum: number) => {
        if (!pdf || !canvasRef.current) return;

        try {
            const page = await pdf.getPage(pageNum);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            const viewport = page.getViewport({ scale: scale, rotation: rotation });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;
        } catch (err) {
            console.error('Error rendering page:', err);
            setError('Error displaying PDF page.');
        }
    }, [scale, rotation]);

    // Re-render when page, scale, or rotation changes
    useEffect(() => {
        if (pdfDoc && pageNumber >= 1 && pageNumber <= numPages) {
            renderPage(pdfDoc, pageNumber);
        }
    }, [pageNumber, scale, rotation, pdfDoc, renderPage]);

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

    const goToPreviousPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

    const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newPage = parseInt(event.target.value, 10);
        if (!isNaN(newPage) && newPage >= 1 && newPage <= numPages) {
            setPageNumber(newPage);
        }
    };

    const handleRotation = () => {
        setRotation(prev => (prev + 90) % 360);
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

    const renderThumbnails = () => {
        if (!showThumbnails || numPages <= 1) return null;

        return (
            <div className={`thumbnail-sidebar ${isThumbnailsOpen ? 'open' : 'closed'}`}>
                <div className="thumbnail-header">
                    <Text weight="semibold">Pages</Text>
                    <Button 
                        size="small" 
                        appearance="subtle"
                        onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
                    >
                        {isThumbnailsOpen ? 'Hide' : 'Show'}
                    </Button>
                </div>
                <div className="thumbnail-list">
                    {Array.from(new Array(numPages), (el, index) => (
                        <div
                            key={`thumbnail_${index + 1}`}
                            className={`thumbnail ${pageNumber === index + 1 ? 'active' : ''}`}
                            onClick={() => setPageNumber(index + 1)}
                        >
                            <Text size={200}>Page {index + 1}</Text>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="virtual-pdf-viewer">
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
                            <ToolbarButton onClick={handleRotation}>
                                Rotate
                            </ToolbarButton>
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
                        {renderThumbnails()}
                        
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
                                    <canvas 
                                        ref={canvasRef} 
                                        className="pdf-canvas"
                                        style={{
                                            transform: `rotate(${rotation}deg)`,
                                            transition: 'transform 0.3s ease'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .virtual-pdf-viewer {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .file-upload-area {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    border: 2px dashed #d1d1d1;
                    border-radius: 8px;
                    background-color: #f8f9fa;
                    height: 100%;
                }

                .upload-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    text-align: center;
                }

                .pdf-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    border: 1px solid #e1e1e1;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .pdf-toolbar {
                    background-color: #f8f9f8;
                    border-bottom: 1px solid #e1e1e1;
                    padding: 8px 12px;
                    flex-wrap: wrap;
                    gap: 8px;
                    min-height: 48px;
                }

                .toolbar-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .page-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0 8px;
                }

                .pdf-content-area {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    background-color: #f0f0f0;
                }

                .thumbnail-sidebar {
                    background-color: #f8f9f8;
                    border-right: 1px solid #e1e1e1;
                    overflow-y: auto;
                    transition: width 0.3s ease;
                }

                .thumbnail-sidebar.open {
                    width: 140px;
                }

                .thumbnail-sidebar.closed {
                    width: 0;
                    border-right: none;
                }

                .thumbnail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid #e1e1e1;
                }

                .thumbnail-list {
                    padding: 8px;
                }

                .thumbnail {
                    cursor: pointer;
                    margin-bottom: 8px;
                    padding: 12px 8px;
                    border: 2px solid transparent;
                    border-radius: 4px;
                    text-align: center;
                    background-color: white;
                }

                .thumbnail.active {
                    border-color: #0078d4;
                    background-color: #e1f0ff;
                }

                .thumbnail:hover {
                    background-color: #f3f2f1;
                }

                .pdf-main-content {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding: 20px;
                    overflow: auto;
                }

                .pdf-document-container {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                }

                .pdf-canvas {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    background-color: white;
                    max-width: 100%;
                    max-height: 100%;
                }

                .loading-container,
                .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    padding: 40px;
                }

                .error-container {
                    text-align: center;
                }

                /* Responsive Design */
                @media (max-width: 767px) {
                    .pdf-toolbar {
                        padding: 8px;
                        gap: 4px;
                    }

                    .toolbar-section {
                        gap: 4px;
                    }

                    .page-controls {
                        gap: 4px;
                    }

                    .pdf-main-content {
                        padding: 10px;
                    }

                    .thumbnail-sidebar.open {
                        width: 100px;
                    }
                }

                @media (max-width: 480px) {
                    .pdf-toolbar {
                        flex-direction: column;
                        height: auto;
                        gap: 8px;
                    }

                    .toolbar-section {
                        justify-content: center;
                        width: 100%;
                    }

                    .thumbnail-sidebar.open {
                        width: 80px;
                    }
                }
            `}</style>
        </div>
    );
};