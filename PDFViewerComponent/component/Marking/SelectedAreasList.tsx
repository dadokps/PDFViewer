import * as React from 'react';
import { 
    Button,
    Text,
    List,
    ListItem,
    Avatar,
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Tooltip
} from '@fluentui/react-components';
import { Dismiss20Regular, ArrowExpand20Regular } from '@fluentui/react-icons';
import { SelectedArea } from './AreaSelectionTool';

interface SelectedAreasListProps {
    selectedAreas: SelectedArea[];
    onAreaHighlight: (area: SelectedArea | null) => void;
    onAreaRemove: (areaId: string) => void;
    onClearAll: () => void;
    highlightedArea?: SelectedArea | null;
}

export const SelectedAreasList: React.FC<SelectedAreasListProps> = ({
    selectedAreas,
    onAreaHighlight,
    onAreaRemove,
    onClearAll,
    highlightedArea
}) => {
    const [previewImage, setPreviewImage] = React.useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState<boolean>(false);

    const handleAreaClick = React.useCallback((area: SelectedArea) => {
        onAreaHighlight(area);
    }, [onAreaHighlight]);

    const handleAreaRemove = React.useCallback((areaId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        onAreaRemove(areaId);
        
        // If the removed area was highlighted, clear highlight
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
    }, [onClearAll, onAreaHighlight]);

    const formatTimestamp = React.useCallback((timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    }, []);

    const truncateText = React.useCallback((text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }, []);

    if (selectedAreas.length === 0) {
        return (
            <div className="selected-areas-list empty">
                <Text size={400} style={{ textAlign: 'center', color: '#605e5c' }}>
                    No areas selected yet. <br />
                    Use the selection tool to mark areas on the PDF.
                </Text>
            </div>
        );
    }

    return (
        <div className="selected-areas-list">
            {/* Header */}
            <div className="list-header">
                <Text size={500} weight="semibold">
                    Selected Areas ({selectedAreas.length})
                </Text>
                <Button
                    appearance="subtle"
                    size="small"
                    onClick={handleClearAll}
                    disabled={selectedAreas.length === 0}
                >
                    Clear All
                </Button>
            </div>

            {/* Areas List */}
            <List className="areas-list">
                {selectedAreas.map((area) => (
                    <ListItem
                        key={area.id}
                        className={`area-item ${highlightedArea?.id === area.id ? 'highlighted' : ''}`}
                        onClick={() => handleAreaClick(area)}
                    >
                        <div className="area-content">
                            {/* Screenshot Thumbnail */}
                            <Avatar
                                className="area-thumbnail"
                                image={{ src: area.screenshot }}
                                size={48}
                                shape="square"
                            />
                            
                            {/* Area Details */}
                            <div className="area-details">
                                <Text size={300} weight="semibold">
                                    Page {area.position.page} • {formatTimestamp(area.timestamp)}
                                </Text>
                                <Text size={200} className="area-text">
                                    {truncateText(area.text)}
                                </Text>
                                <Text size={100} className="area-dimensions">
                                    {Math.round(area.position.pdfWidth)} × {Math.round(area.position.pdfHeight)}px
                                </Text>
                            </div>

                            {/* Actions */}
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
                    </ListItem>
                ))}
            </List>

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
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '400px',
                                        border: '1px solid #e1e1e1',
                                        borderRadius: '4px'
                                    }}
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

            <style>{`
                .selected-areas-list {
                    border: 1px solid #e1e1e1;
                    border-radius: 8px;
                    background-color: white;
                    max-height: 400px;
                    display: flex;
                    flex-direction: column;
                }

                .selected-areas-list.empty {
                    padding: 40px 20px;
                    text-align: center;
                    background-color: #f8f9fa;
                }

                .list-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e1e1e1;
                    background-color: #f8f9f8;
                }

                .areas-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .area-item {
                    padding: 12px;
                    margin-bottom: 8px;
                    border: 1px solid #e1e1e1;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background-color: white;
                }

                .area-item:hover {
                    border-color: #0078d4;
                    background-color: #f8f9fa;
                }

                .area-item.highlighted {
                    border-color: #0078d4;
                    background-color: #e1f0ff;
                    box-shadow: 0 0 0 1px #0078d4;
                }

                .area-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    width: 100%;
                }

                .area-thumbnail {
                    flex-shrink: 0;
                    border: 1px solid #e1e1e1;
                }

                .area-details {
                    flex: 1;
                    min-width: 0;
                }

                .area-text {
                    color: #323130;
                    margin: 4px 0;
                    word-wrap: break-word;
                }

                .area-dimensions {
                    color: #605e5c;
                }

                .area-actions {
                    display: flex;
                    gap: 4px;
                    flex-shrink: 0;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .selected-areas-list {
                        max-height: 300px;
                    }

                    .area-content {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .area-thumbnail {
                        align-self: center;
                    }

                    .area-actions {
                        align-self: flex-end;
                        margin-top: 8px;
                    }
                }

                @media (max-width: 480px) {
                    .list-header {
                        flex-direction: column;
                        gap: 8px;
                        align-items: flex-start;
                    }

                    .area-item {
                        padding: 8px;
                    }
                }

                /* Scrollbar styling */
                .areas-list::-webkit-scrollbar {
                    width: 6px;
                }

                .areas-list::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }

                .areas-list::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }

                .areas-list::-webkit-scrollbar-thumb:hover {
                    background: #a1a1a1;
                }
            `}</style>
        </div>
    );
};