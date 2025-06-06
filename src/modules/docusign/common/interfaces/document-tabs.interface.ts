export interface IDocumentTabs {
  signHereTabs?: {
    stampType: string;
    isSealSignTab: string;
    name: string;
    tabLabel: string;
    scaleValue: string;
    optional: string;
    documentId: string;
    recipientId: string;
    pageNumber: string;
    xPosition: string;
    yPosition: string;
    tabId: string;
    templateRequired: string;
    tabType: string;
    agreementAttributeLocked: string;
  }[];
  textTabs: {
    requireAll: string;
    value: string;
    originalValue: string;
    required: string;
    locked: string;
    concealValueOnDocument: string;
    disableAutoSize: string;
    tabLabel: string;
    font: string;
    fontSize: string;
    localePolicy: object;
    documentId: string;
    recipientId: string;
    pageNumber: string;
    xPosition: string;
    yPosition: string;
    width: string;
    height: string;
    anchorString: string;
    anchorXOffset: string;
    anchorYOffset: string;
    anchorUnits: string;
    anchorCaseSensitive: string;
    anchorMatchWholeWord: string;
    anchorHorizontalAlignment: string;
    anchorTabProcessorVersion: string;
    tabId: string;
    tabType: string;
  }[];
}
