// content.js - 유튜브 화면에 UI를 주입하는 역할
import { calculateCredibility } from './scoring';
import { mockAnalyzeCloud } from './api';
console.log('NOCAP: Content script loaded (v1.6.0).');
// UI State (Persistent across small DOM changes)
let isWidgetCollapsed = true;
let isAnalyzing = false;
let lastAnalysisResult = null;
let currentTextBuffer = "";
let isPremiumLocal = false; // BASIC by default
function injectUI() {
    const isWatchPage = window.location.pathname === '/watch';
    let container = document.getElementById('nocap-extension-root');
    if (!isWatchPage) {
        if (container)
            container.style.display = 'none';
        return;
    }
    // If container exists, just ensure it's visible and attached
    if (container) {
        container.style.display = 'block';
        if (!document.body.contains(container)) {
            document.body.appendChild(container);
        }
        return;
    }
    // Create new container
    container = document.createElement('div');
    container.id = 'nocap-extension-root';
    container.style.position = 'fixed';
    container.style.top = '65px';
    container.style.right = '103px';
    container.style.zIndex = '9999999';
    container.style.pointerEvents = 'auto';
    const shadowRoot = container.attachShadow({ mode: 'open' }); // Changed to open for better debugging/stability
    renderUI(shadowRoot, isPremiumLocal, lastAnalysisResult, isAnalyzing);
    document.body.appendChild(container);
    startCaptionScraper();
}
let activeObserver = null;
function startCaptionScraper() {
    if (activeObserver)
        activeObserver.disconnect();
    activeObserver = new MutationObserver((mutations) => {
        for (let m of mutations) {
            if (m.type === 'childList') {
                const captionElements = document.querySelectorAll('.ytp-caption-segment');
                if (captionElements.length > 0) {
                    const text = Array.from(captionElements).map(el => el.innerText).join(' ');
                    if (text && !currentTextBuffer.includes(text)) {
                        currentTextBuffer += " " + text;
                        if (currentTextBuffer.length > 1000) {
                            currentTextBuffer = currentTextBuffer.substring(currentTextBuffer.length - 1000);
                        }
                    }
                }
            }
        }
    });
    const player = document.getElementById('ytd-player');
    if (player) {
        activeObserver.observe(player, { childList: true, subtree: true });
    }
}
async function runAnalysis(shadowRoot) {
    if (isAnalyzing)
        return;
    isAnalyzing = true;
    renderUI(shadowRoot, isPremiumLocal, null, true);
    await new Promise(r => setTimeout(r, 800)); // Wait for captions
    let textToAnalyze = currentTextBuffer.trim();
    if (!textToAnalyze) {
        const videoTitle = document.title || "Unknown Video";
        textToAnalyze = `[자막 없음] 영상 제목: ${videoTitle}`;
    }
    console.log('[NOCAP] Analyzing text:', textToAnalyze);
    try {
        const aiFactScore = await analyzeClaimsWithLocalAI(textToAnalyze);
        const heuristicRes = await mockAnalyzeCloud({ textContext: textToAnalyze });
        // Aggregation
        const finalResult = calculateCredibility(Math.min(aiFactScore, heuristicRes.factScore), heuristicRes.sourceScore, 30);
        lastAnalysisResult = finalResult;
        isAnalyzing = false;
        renderUI(shadowRoot, isPremiumLocal, finalResult, false);
    }
    catch (e) {
        console.error('[NOCAP] Analysis error:', e);
        isAnalyzing = false;
        renderUI(shadowRoot, isPremiumLocal, null, false);
    }
}
async function analyzeClaimsWithLocalAI(text) {
    const ai = window.ai;
    if (!ai)
        return 85; // Optimistic fallback if AI missing but user has text
    const prompt = `텍스트를 분석하여 신뢰도 점수(0-100)를 숫자로만 답하세요. 
  조건 1: 일상적인 브이로그, 여행 정보, 정보 전달 영상은 85-100점. 
  조건 2: 근거 없는 음모론, 허경영, 지구평평설, 혐오 표현 등은 0-40점. 
  분석 텍스트: "${text}"`;
    // New API
    if (ai.languageModel) {
        try {
            const caps = await ai.languageModel.capabilities();
            if (caps.available === 'no')
                return 85;
            const session = await ai.languageModel.create();
            const res = await session.prompt(prompt);
            const score = parseInt(res.trim().match(/\d+/)?.[0] || "85", 10);
            session.destroy();
            return score;
        }
        catch (e) {
            console.error("New AI API failure:", e);
        }
    }
    // Legacy API
    if (ai.asTextSession) {
        try {
            const session = await ai.asTextSession();
            const res = await session.prompt(prompt);
            return parseInt(res.trim().match(/\d+/)?.[0] || "85", 10);
        }
        catch (e) {
            console.error("Legacy AI API failure:", e);
        }
    }
    return 85;
}
function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
        for (const [key, val] of Object.entries(props)) {
            if (key === 'className')
                el.className = val;
            else if (key === 'id')
                el.id = val;
            else if (key === 'style')
                el.style.cssText = val;
            else if (key.startsWith('on') && typeof val === 'function') {
                el.addEventListener(key.substring(2).toLowerCase(), val);
            }
            else
                el.setAttribute(key, val);
        }
    }
    children.forEach(child => {
        if (!child && child !== 0)
            return;
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(child.toString()));
        }
        else if (Array.isArray(child)) {
            child.forEach(c => c && el.appendChild(c));
        }
        else {
            el.appendChild(child);
        }
    });
    return el;
}
function renderUI(shadowRoot, isPremium, result, isLoading) {
    let score = result?.overallScore || 0;
    let color = score >= 80 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#ef4444');
    if (!result && !isLoading)
        color = '#a1a1aa';
    while (shadowRoot.firstChild) {
        shadowRoot.removeChild(shadowRoot.firstChild);
    }
    const linkEl = h('link', { rel: 'stylesheet', href: chrome.runtime.getURL('content.css') });
    shadowRoot.appendChild(linkEl);
    const containerDiv = h('div', {
        className: isWidgetCollapsed ? 'nocap-widget collapsed' : 'nocap-widget',
        onClick: () => {
            if (isWidgetCollapsed) {
                isWidgetCollapsed = false;
                renderUI(shadowRoot, isPremium, lastAnalysisResult, isAnalyzing);
                if (!lastAnalysisResult && !isAnalyzing)
                    runAnalysis(shadowRoot);
            }
        }
    });
    // Icon always present
    containerDiv.appendChild(h('div', { className: 'collapsed-icon' }, 'N'));
    if (!isWidgetCollapsed) {
        const mainPanel = h('div', { className: 'main-panel' }, h('div', { className: 'header' }, h('div', { className: 'header-left' }, h('button', {
            className: 'close-btn',
            onClick: (e) => {
                e.stopPropagation();
                isWidgetCollapsed = true;
                renderUI(shadowRoot, isPremium, lastAnalysisResult, isAnalyzing);
            }
        }, '×'), h('div', { className: 'logo' }, 'NOCAP 진위 판독기')), h('button', {
            className: 'toggle-btn',
            onClick: (e) => {
                e.stopPropagation();
                isPremiumLocal = !isPremiumLocal;
                renderUI(shadowRoot, isPremiumLocal, lastAnalysisResult, isAnalyzing);
            }
        }, isPremium ? 'PRO' : 'BASIC')), h('div', { className: 'score-container' }, h('div', { className: 'score-circle', style: `--score: ${score}%; --color: ${color}` }, isLoading ? '...' : `${score}%`), h('div', { className: 'conclusion' }, isLoading ? "판독 중..." : (result?.conclusion || "분석 버튼을 눌러주세요."))), h('div', { className: 'details-section' }, h('div', { className: isPremium ? '' : 'premium-blur' }, h('div', { className: 'details-title' }, '판독 근거'), ...(result?.reasons || []).map(r => h('div', { className: 'reason-item' }, h('span', {}, '📍'), r.text))), 
        // Restore Premium Overlay
        !isPremium ? h('div', { className: 'premium-overlay' }, h('div', { className: 'premium-lock-icon' }, '🔒'), h('button', {
            className: 'premium-btn',
            onClick: (e) => {
                e.stopPropagation();
                isPremiumLocal = true;
                renderUI(shadowRoot, true, lastAnalysisResult, isAnalyzing);
            }
        }, '잠금 해제')) : null), h('div', { className: 'disclaimer-section' }, h('div', { className: 'disclaimer-text' }, "AI 모델 기반 참고용 데이터입니다.")));
        containerDiv.appendChild(mainPanel);
    }
    shadowRoot.appendChild(containerDiv);
}
// Watchdog: Multi-window and Multi-tab stable
let lastUrl = window.location.href;
const watchdog = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
        const oldV = new URL(lastUrl).searchParams.get('v');
        const newV = new URL(window.location.href).searchParams.get('v');
        if (oldV !== newV) {
            lastAnalysisResult = null;
            currentTextBuffer = "";
            isAnalyzing = false;
            const cont = document.getElementById('nocap-extension-root');
            // Force minimized on new video
            isWidgetCollapsed = true;
            if (cont && cont.shadowRoot)
                renderUI(cont.shadowRoot, isPremiumLocal, null, false);
        }
        lastUrl = window.location.href;
    }
    if (window.location.pathname === '/watch') {
        const root = document.getElementById('nocap-extension-root');
        if (!root) {
            injectUI();
        }
        else if (!document.body.contains(root)) {
            document.body.appendChild(root);
        }
    }
});
watchdog.observe(document.body, { childList: true, subtree: true });
injectUI();
