import { AnalysisResult, calculateCredibility } from './scoring';
import { mockAnalyzeCloud } from './api';

// background.ts - Service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('NOCAP Extension installed (v1.5.0)!');
});

// Currently, content.ts handles the main analysis pipeline to access window.ai locally.
// This listener remains for potential future server-side or secondary analysis needs.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'PING') {
        sendResponse({ success: true });
    }
    return true;
});
