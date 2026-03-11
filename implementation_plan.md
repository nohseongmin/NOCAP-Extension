# NOCAP Fake News Detector - Implementation Plan

This document outlines the technical plan to implement the fake news detection logic as specified in the `유튜브 가짜뉴스 판별 확장 프로그램 개발.pdf` requirements document.

## 1. Goal Description

The overriding goal is to build an End-to-End Chrome Extension that provides a 0-100% credibility score for YouTube videos in real-time. The system relies on a hybrid Edge-Cloud architecture to balance latency, cost, and privacy.

## 2. User Review Required

> [!WARNING]
> **API Key Missing**: The full architecture requires keys for Google Fact Check Explorer, Deepfake Detection (e.g. Reality Defender), and multi-LLM (Gemini, Claude, Groq). For this MVP/PoC phase, I propose we **mock** the external Cloud APIs to demonstrate the UI and scoring logic first, unless you can provide active API keys.
> 
> **Chrome Built-in AI**: The PDF heavily features `window.ai` (Gemini Nano) for local processing. We can implement this, but it requires the browser to have chrome://flags `prompt-api-for-gemini-nano` enabled. 

## 3. Proposed Changes

### Data Extraction Layer

#### [MODIFY] `content.ts` (file:///c:/Antigravity%20Projects/NOCAP/extension/content.ts)
- **Subtitle Scraping**: Inject lightweight DOM mutation observers to extract YouTube's auto-generated caption tracks actively playing without using the forbidden YouTube Data API.
- **Video Frame Extraction**: Access the `<video>` element and use the HTML5 Canvas API (`canvas.drawImage()`) to periodically capture base64 JPEG frames for Deepfake analysis.

### Logic & Scoring Layer

#### [NEW] `scoring.ts` (file:///c:/Antigravity%20Projects/NOCAP/extension/scoring.ts)
Implement the mathematical model defined in the PDF:
- $S_{fact}$: Factual Integrity Score
- $S_{visual}$: Visual Authenticity Score (Deepfake)
- $S_{source}$: Source/Channel Transparency Score
- **Veto Logic**: If $S_{visual} < 30$, clamp overall score to $\le 20\%$.

#### [NEW] `api.ts` (file:///c:/Antigravity%20Projects/NOCAP/extension/api.ts)
- **Local AI (window.ai)**: Implement heuristic filtering (sentiment/clickbait analysis) via Chrome's Built-in AI.
- **Cloud API Mocks**: Create mock delay functions returning simulated responses for RAG Fact-checks and Deepfake image analysis to allow the extension to be tested end-to-end immediately.

### Background Service Worker

#### [MODIFY] `background.ts` (file:///c:/Antigravity%20Projects/NOCAP/extension/background.ts)
- Act as the central message broker between `content.ts` (which extracts data) and the external API calls (to bypass CORS restrictions).

## 4. Verification Plan

### Automated / Local Tests
1. **Build Success**: Verify `npm run build` compiles without TypeScript errors.
2. **Unit Tests (Future)**: Add Vitest (if desired) to mathematically verify the $S_{overall}$ weighted average formula and the Veto logic in `scoring.ts`.

### Manual Verification
1. Open Chrome and navigate to `chrome://extensions/`.
2. Load unpacked extension from `c:\Antigravity Projects\NOCAP\extension\dist`.
3. Open a YouTube video.
4. Verify the NOCAP UI injects correctly.
5. Verify that captions are actively being scraped in the DevTools console.
6. Verify the UI updates the "Credibility Score" dynamically using the Mock data pipeline.
