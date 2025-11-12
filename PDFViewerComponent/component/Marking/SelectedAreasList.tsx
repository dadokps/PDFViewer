import * as React from 'react';
import { 
    Button,
    Text,
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Tooltip,
    Badge,
    Card,
    CardHeader,
    Caption1,
    Body1,
    Subtitle2
} from '@fluentui/react-components';
import { 
    Dismiss20Regular, 
    ArrowExpand20Regular, 
    Document20Regular,
    ChevronLeft20Regular,
    ChevronRight20Regular
} from '@fluentui/react-icons';
import { SelectedArea } from './AreaSelectionTool';
import '../../css/SelectedAreaList.css';

interface SelectedAreasListProps {
    selectedAreas: SelectedArea[];
    onAreaHighlight: (area: SelectedArea | null) => void;
    onAreaRemove: (areaId: string) => void;
    onClearAll: () => void;
    highlightedArea?: SelectedArea | null;
}

const ITEMS_PER_PAGE = 5;

export const SelectedAreasList: React.FC<SelectedAreasListProps> = ({
    selectedAreas,
    onAreaHighlight,
    onAreaRemove,
    onClearAll,
    highlightedArea
}) => {
    const [previewImage, setPreviewImage] = React.useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState<boolean>(false);
    const [currentPage, setCurrentPage] = React.useState<number>(1);

    // Calculate pagination
    const totalPages = Math.ceil(selectedAreas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentAreas = selectedAreas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    React.useEffect(() => {
        // Reset to first page when areas change significantly
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (currentPage < 1 && selectedAreas.length > 0) {
            setCurrentPage(1);
        }
    }, [selectedAreas.length, currentPage, totalPages]);

    const handleAreaClick = React.useCallback((area: SelectedArea) => {
        onAreaHighlight(area === highlightedArea ? null : area);
    }, [onAreaHighlight, highlightedArea]);

    const handleAreaRemove = React.useCallback((areaId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        onAreaRemove(areaId);
        
        if (highlightedArea?.id === areaId) {
            onAreaHighlight(null);
        }
    }, [onAreaRemove, highlightedArea, onAreaHighlight]);

    const handlePreviewScreenshot = React.useCallback((screenshot: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setPreviewImage(screenshot);
        setIsPreviewOpen(true);
    }, []);

    const handleClearAll = React.useCallback(() => {
        onClearAll();
        onAreaHighlight(null);
        setCurrentPage(1);
    }, [onClearAll, onAreaHighlight]);

    const goToPreviousPage = React.useCallback(() => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    }, []);

    const goToNextPage = React.useCallback(() => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    }, [totalPages]);

    const formatTimestamp = React.useCallback((timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }, []);

    const formatDate = React.useCallback((timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }, []);

    const truncateText = React.useCallback((text: string, maxLength: number = 100) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }, []);

    if (selectedAreas.length === 0) {
        return (
            <div className="selected-areas-list empty">
                <Document20Regular className="empty-icon" />
                <Body1 align="center" className="empty-title">
                    No areas selected yet
                </Body1>
                <Caption1 align="center" className="empty-description">
                    Use the selection tool to mark areas on the PDF
                </Caption1>
            </div>
        );
    }

    return (
        <div className="selected-areas-list">
            {/* Header */}
            <div className="list-header">
                <div className="list-title">
                    <Subtitle2>Selected Areas</Subtitle2>
                    <Badge appearance="filled" color="brand" className="items-count">
                        {selectedAreas.length}
                    </Badge>
                </div>
                <Button
                    appearance="subtle"
                    size="small"
                    onClick={handleClearAll}
                >
                    Clear All
                </Button>
            </div>

            {/* Areas List */}
            <div className="areas-list-container">
                {currentAreas.map((area) => (
                    <Card
                        key={area.id}
                        className={`area-item ${highlightedArea?.id === area.id ? 'highlighted' : ''}`}
                        onClick={() => handleAreaClick(area)}
                    >
                        <div className="area-content">
                            {/* Area Details */}
                            <div className="area-details">
                                <div className="area-meta">
                                    <Badge appearance="outline" color="informative" size="small">
                                        Page {area.position.page}
                                    </Badge>
                                    <Caption1 className="area-time">
                                        {formatDate(area.timestamp)} • {formatTimestamp(area.timestamp)}
                                    </Caption1>
                                </div>
                                
                                <Body1 className="area-text">
                                    {truncateText(area.text)}
                                </Body1>
                                
                                <div className="area-footer">
                                    <div className="area-info">
                                        <img
                                            src={area.screenshot}
                                            alt="Selected area"
                                            className="area-thumbnail"
                                        />
                                        <Caption1 className="area-dimensions">
                                            {Math.round(area.position.pdfWidth)} × {Math.round(area.position.pdfHeight)}px
                                        </Caption1>
                                    </div>
                                    <div className="area-actions">
                                        <Tooltip content="Preview screenshot" relationship="label">
                                            <Button
                                                size="small"
                                                appearance="subtle"
                                                icon={<ArrowExpand20Regular />}
                                                onClick={(e) => handlePreviewScreenshot(area.screenshot, e)}
                                            />
                                        </Tooltip>
                                        <Tooltip content="Remove area" relationship="label">
                                            <Button
                                                size="small"
                                                appearance="subtle"
                                                icon={<Dismiss20Regular />}
                                                onClick={(e) => handleAreaRemove(area.id, e)}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Pagination - Simple and Clean */}
            {totalPages > 1 && (
                <div className="pagination-container">
                    <Caption1 className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </Caption1>
                    <div className="pagination-controls">
                        <Button
                            size="small"
                            appearance="subtle"
                            icon={<ChevronLeft20Regular />}
                            onClick={goToPreviousPage}
                            disabled={currentPage <= 1}
                        />
                        <Button
                            size="small"
                            appearance="subtle"
                            icon={<ChevronRight20Regular />}
                            onClick={goToNextPage}
                            disabled={currentPage >= totalPages}
                        />
                    </div>
                </div>
            )}

            {/* Screenshot Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={(_, data) => setIsPreviewOpen(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>Screenshot Preview</DialogTitle>
                        <DialogContent>
                            {previewImage && (
                                <img
                                    src={previewImage}
                                    alt="Selected area screenshot"
                                    className="preview-image"
                                />
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="primary" onClick={() => setIsPreviewOpen(false)}>
                                Close
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
};