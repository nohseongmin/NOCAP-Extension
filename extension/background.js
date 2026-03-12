import { calculateCredibility } from './scoring';
import { analyzeLocalSentiment, mockAnalyzeCloud } from './api';
// background.ts - Service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('NOCAP Extension installed!');
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ANALYZE_CONTENT') {
        const textBuffer = message.payload.text;
        // Handle async API calls in background script to bypass CORS
        (async () => {
            try {
                const localScore = await analyzeLocalSentiment(textBuffer);
                const cloudRes = await mockAnalyzeCloud({ textContext: textBuffer });
                const finalResult = calculateCredibility(cloudRes.factScore, cloudRes.visualScore, cloudRes.sourceScore, localScore);
                sendResponse({ success: true, result: finalResult });
            }
            catch (error) {
                console.error('[NOCAP Background] Analysis error:', error);
                sendResponse({ success: false, error: 'Analysis failed' });
            }
        })();
        // Return true to indicate we will send a response asynchronously
        return true;
    }
});
