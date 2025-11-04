import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FluentProvider, webLightTheme, webDarkTheme } from "@fluentui/react-components";
import { PDFViewer } from "./PDFViewer";

export class PDFViewerControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private theContainer: HTMLDivElement;
    private notifyOutputChanged: () => void;
    private context: ComponentFramework.Context<IInputs>;
    private fileContent: string | null = null;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.theContainer = container;
        
        // Listen for window resize events for responsive behavior
        context.mode.trackContainerResize(true);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const { theme, width, height, showThumbnails, enableDownload, enablePrint } = context.parameters;

        const allocatedWidth = context.mode.allocatedWidth || 800;
        const allocatedHeight = context.mode.allocatedHeight || 600;

        const themeValue = theme?.raw || 'light';
        const widthValue = width?.raw || `${allocatedWidth}px`;
        const heightValue = height?.raw || `${allocatedHeight}px`;
        const showThumbnailsValue = showThumbnails?.raw || true;
        const enableDownloadValue = enableDownload?.raw || true;
        const enablePrintValue = enablePrint?.raw || true;

        const currentTheme = themeValue === 'dark' ? webDarkTheme : webLightTheme;

        return React.createElement(
            FluentProvider,
            { theme: currentTheme },
            React.createElement(
                "div",
                {
                    style: {
                        width: widthValue,
                        height: heightValue,
                        padding: '8px'
                    }
                },
                React.createElement(PDFViewer, {
                    showThumbnails: showThumbnailsValue,
                    enableDownload: enableDownloadValue,
                    enablePrint: enablePrintValue,
                    allocatedWidth: allocatedWidth,
                    allocatedHeight: allocatedHeight
                })
            )
        );
    }

    private handleFileUpload(file: File): void {
        // Convert file to base64 for potential storage
        const reader = new FileReader();
        reader.onload = (e) => {
            this.fileContent = e.target?.result as string;
            this.notifyOutputChanged();
        };
        reader.readAsDataURL(file);
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this.theContainer);
    }
}