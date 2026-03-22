import { AnalysisResult, calculateCredibility } from './scoring';
import { mockAnalyzeCloud } from './api';

// background.ts - Service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('NOCAP Extension installed (v1.5.0)!');
});

// Currently, content.ts handles the main analysis pipeline to access window.ai locally.
// This listener remains for proxying CORS requests (Wikipedia RAG) and other needs.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'PING') {
        sendResponse({ success: true });
    } else if (message.action === 'FETCH_WIKI') {
        const query = encodeURIComponent(message.query || "");
        fetch(`https://ko.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&titles=${query}&origin=*`)
            .then(res => res.json())
            .then(data => {
                const pages = data?.query?.pages;
                if (!pages) return sendResponse({ result: null });
                const pageId = Object.keys(pages)[0];
                if (pageId === '-1') {
                     sendResponse({ result: null });
                } else {
                     // Provide up to 500 chars of factual context
                     sendResponse({ result: pages[pageId].extract.substring(0, 500) }); 
                }
            })
            .catch(err => sendResponse({ result: null }));
        return true; // Keep message channel open for async response
    }
    return true;
});
