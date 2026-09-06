// content.js - 유튜브 화면에 UI를 주입하는 역할
import { AnalysisResult, calculateCredibility } from './scoring';
import { mockAnalyzeCloud, runGatekeeper } from './api';

const extVersion = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) ? chrome.runtime.getManifest().version : 'dev';
console.log(`NOCAP: Content script loaded (v${extVersion}).`);

let isWidgetCollapsed = true;
let isAnalyzing = false;
let lastAnalysisResult: AnalysisResult | null = null;
let currentTextBuffer: string = "";
let isPremiumLocal = true; // ALL FEATURES FREE NOW
let nocapEnabled = true;

try {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ nocapEnabled: true }, (res) => {
      nocapEnabled = !!res?.nocapEnabled;
      updateExtensionVisibility();
    });
    
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes?.nocapEnabled !== undefined) {
        nocapEnabled = !!changes.nocapEnabled.newValue;
        updateExtensionVisibility();
      }
    });
  }
} catch (e) {
  console.warn("NOCAP: Extension context not available.", e);
}

// Ensure initial visibility is checked anyway
updateExtensionVisibility();

function updateExtensionVisibility() {
  const container = document.getElementById('nocap-extension-root');
  if (container) {
    container.style.display = (nocapEnabled && window.location.pathname === '/watch') ? 'block' : 'none';
  }
}


function injectUI() {
  const isWatchPage = window.location.pathname === '/watch';
  let container = document.getElementById('nocap-extension-root');

  if (!isWatchPage || !nocapEnabled) {
    if (container) container.style.display = 'none';
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
  
  const linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = chrome.runtime.getURL('content.css');
  shadowRoot.appendChild(linkEl);

  const uiRoot = document.createElement('div');
  uiRoot.id = 'nocap-ui-root';
  shadowRoot.appendChild(uiRoot);

  renderUI(uiRoot, isPremiumLocal, lastAnalysisResult, isAnalyzing);
  document.body.appendChild(container);

  startCaptionScraper();
}

let activeObserver: MutationObserver | null = null;

function startCaptionScraper() {
  if (activeObserver) activeObserver.disconnect();
  
  activeObserver = new MutationObserver((mutations) => {
    for (let m of mutations) {
      if (m.type === 'childList') {
        const captionElements = document.querySelectorAll('.ytp-caption-segment');
        if (captionElements.length > 0) {
          const text = Array.from(captionElements).map(el => (el as HTMLElement).innerText).join(' ');
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

async function runAnalysis(containerNode: HTMLElement) {
  if (isAnalyzing) return;
  
  isAnalyzing = true;
  renderUI(containerNode, isPremiumLocal, null, true);

  await new Promise(r => setTimeout(r, 800)); // Wait for captions

  const videoTitle = (document.querySelector('h1.ytd-video-primary-info-renderer') as HTMLElement)?.innerText || 
                     (document.querySelector('yt-formatted-string.ytd-video-primary-info-renderer') as HTMLElement)?.innerText || 
                     document.title.replace(' - YouTube', '');
  const channelName = (document.querySelector('#channel-name a') as HTMLElement)?.innerText || 
                      (document.querySelector('ytd-channel-name yt-formatted-string') as HTMLElement)?.innerText || "Unknown Channel";

  let textToAnalyze = currentTextBuffer.trim();
  
  // 1. Gatekeeper Early Exit
  const gate = runGatekeeper(textToAnalyze + " " + videoTitle);
  if (gate.skipAI) {
      console.log('[NOCAP] Gatekeeper: Clean content detected. Skipping intensive AI.');
      // Give a highly credible score directly without touching Gemini Nano
      const finalResult = calculateCredibility(gate.baseScore, 85, 30, gate.reasons || []);
      lastAnalysisResult = finalResult;
      isAnalyzing = false;
      renderUI(containerNode, isPremiumLocal, finalResult, false);
      return;
  }

  // 2. Fetch Wikipedia context (Local RAG)
  // Use the first word or two of the video title as a generic search query
  const searchKeyword = videoTitle.split(' ').slice(0, 2).join(' ').replace(/[^a-zA-Z0-9가-힣\s]/g, "");
  const wikiContext = await new Promise<string | null>(resolve => {
     try {
         chrome.runtime.sendMessage({ action: 'FETCH_WIKI', query: searchKeyword }, (response) => {
             resolve(response?.result || null);
         });
     } catch (e) { resolve(null); }
  });

  // 3. Summarize using built-in AI (Sliding Window compression)
  let summarizedText = textToAnalyze;
  const ai = (window as any).ai;
  if (ai?.summarizer && textToAnalyze.length > 200) {
      try {
          const caps = await ai.summarizer.capabilities();
          if (caps.available !== 'no') {
              const summarizer = await ai.summarizer.create();
              summarizedText = await summarizer.summarize(textToAnalyze);
              summarizer.destroy();
              console.log('[NOCAP] Text summarized down to:', summarizedText.length, 'chars');
          }
      } catch (e) {
          console.warn("[NOCAP] Summarizer failed, falling back to raw text", e);
      }
  }

  // Prepare final prompt context
  if (!summarizedText) {
    textToAnalyze = `[자막 없음] 영상 제목: ${videoTitle} / 채널: ${channelName}`;
  } else {
    textToAnalyze = `채널: ${channelName} / 제목: ${videoTitle}\n\n내용요약: ${summarizedText}`;
  }
  
  if (wikiContext) {
      textToAnalyze += `\n\n[팩트체크 참고용 위키백과 데이터]: ${wikiContext}`;
  }

  console.log('[NOCAP] Analyzing with enriched context:', { channelName, videoTitle, wikiFound: !!wikiContext, textLength: textToAnalyze.length });

  try {
    const aiFactScore = await analyzeClaimsWithLocalAI(textToAnalyze);
    const heuristicRes = await mockAnalyzeCloud({ textContext: textToAnalyze });
    
    // Apply Gatekeeper's heavy penalty to heuristics if a dangerous keyword was found
    if (gate.baseScore === 0) {
        heuristicRes.factScore = Math.min(heuristicRes.factScore, 20);
        heuristicRes.sourceScore = Math.min(heuristicRes.sourceScore, 20);
    }

    // Aggregation: Identity-Aware Veto System (v2.2.0)
    const isConspiracy = heuristicRes.factScore < 50;
    const isStrongNewsEvidence = aiFactScore >= 95; // Extreme threshold for v2.2.0 (95+)

    const combinedExternalReasons = [...(gate.reasons || []), ...(heuristicRes.reasons || [])];

    const finalResult = calculateCredibility(
      // Unless AI is 90%+ sure it's news, conspiracy veto takes priority.
      (isConspiracy && !isStrongNewsEvidence) ? Math.min(aiFactScore, heuristicRes.factScore) : Math.max(aiFactScore, heuristicRes.factScore),
      heuristicRes.sourceScore,
      30,
      combinedExternalReasons
    );
    
    lastAnalysisResult = finalResult;
    isAnalyzing = false;
    renderUI(containerNode, isPremiumLocal, finalResult, false);
  } catch (e) {
    console.error('[NOCAP] Analysis error:', e);
    isAnalyzing = false;
    renderUI(containerNode, isPremiumLocal, null, false);
  }
}

async function analyzeClaimsWithLocalAI(text: string): Promise<number> {
  const ai = (window as any).ai;
  if (!ai) return 90; // Higher baseline

  const prompt = `영상 정보(채널명, 제목)와 자막 내용을 바탕으로 '의도(Intent)'를 분석한 후 신뢰도 점수(0-100)를 숫자로만 답하세요.
  - 특별 지침 (신원 기반 분석):
    1. 채널명이 '허경영', '하늘궁'이거나 해당 인물이 직접 강연하는 영상인 경우, 내용이 아무리 정중하더라도 이는 '신격화/선동'으로 간주하여 무조건 0~20점을 부여하세요.
    2. 뉴스 보도, 현장 취재, 사기 고발 형식이면 비판적 가치를 인정하여 85~100점을 부여하세요. (단, 공신력 있는 언론사나 고발 채널이어야 함)
    3. 단순히 사이비/음모론을 홍보하거나 비과학적 주장을 하는 경우 0~30점을 부여하세요.
  - 가이드라인:
    1. 정당한 언론 보도 및 비판: 90~100점.
    2. 일상 브이로그/정보 전달: 90~100점.
    3. 사이비 홍보/음모론 선동/신격화 강연: 0~20점.
  - 분석 대상: "${text}"`;

  // New API
  if (ai.languageModel) {
    try {
      const caps = await ai.languageModel.capabilities();
      if (caps.available === 'no') return 85;
      const session = await ai.languageModel.create();
      const res = await session.prompt(prompt);
      const score = parseInt(res.trim().match(/\d+/)?.[0] || "85", 10);
      session.destroy();
      return score;
    } catch (e) { console.error("New AI API failure:", e); }
  }

  // Legacy API
  if (ai.asTextSession) {
    try {
      const session = await ai.asTextSession();
      const res = await session.prompt(prompt);
      return parseInt(res.trim().match(/\d+/)?.[0] || "85", 10);
    } catch (e) { console.error("Legacy AI API failure:", e); }
  }

  return 85;
}

function h(tag: string, props: any, ...children: any[]) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (key === 'className') el.className = val as string;
      else if (key === 'id') el.id = val as string;
      else if (key === 'style') el.style.cssText = val as string;
      else if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), val as EventListenerOrEventListenerObject);
      }
      else el.setAttribute(key, val as string);
    }
  }
  children.forEach(child => {
    if (!child && child !== 0) return;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child.toString()));
    } else if (Array.isArray(child)) {
      child.forEach(c => c && el.appendChild(c));
    } else {
      el.appendChild(child);
    }
  });
  return el;
}

function renderUI(containerNode: HTMLElement, isPremium: boolean, result: AnalysisResult | null, isLoading: boolean) {
  let score = result?.overallScore || 0;
  let color = score >= 80 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#ef4444');
  if (!result && !isLoading) color = '#a1a1aa';

  while (containerNode.firstChild) {
    containerNode.removeChild(containerNode.firstChild);
  }

  const containerDiv = h('div', {
    className: isWidgetCollapsed ? 'nocap-widget collapsed' : 'nocap-widget',
    onClick: () => {
      if (isWidgetCollapsed) {
        isWidgetCollapsed = false;
        renderUI(containerNode, isPremium, lastAnalysisResult, isAnalyzing);
        if (!lastAnalysisResult && !isAnalyzing) runAnalysis(containerNode);
      }
    }
  });

  // Icon always present
  containerDiv.appendChild(h('div', { className: 'collapsed-icon' }, 'N'));

  if (!isWidgetCollapsed) {
    const mainPanel = h('div', { className: 'main-panel' },
      h('div', { className: 'header' },
        h('div', { className: 'header-left' },
          h('button', {
            className: 'close-btn',
            onClick: (e: Event) => {
              e.stopPropagation();
              isWidgetCollapsed = true;
              // Also reset on close button
              lastAnalysisResult = null;
              currentTextBuffer = "";
              isAnalyzing = false;
              renderUI(containerNode, isPremium, null, false);
            }
          }, '×'),
          h('div', { className: 'logo' }, 'NOCAP 진위 판독기')
        ),
        h('button', { 
            className: 'toggle-btn',
            onClick: (e: Event) => e.stopPropagation()
        }, 'FREE')
      ),
      h('div', { className: 'score-container' },
        h('div', { className: 'score-circle', style: `--score: ${score}%; --color: ${color}` }, isLoading ? '...' : `${score}%`),
        h('div', { className: 'conclusion' }, isLoading ? "판독 중..." : (result?.conclusion || "분석 버튼을 눌러주세요."))
      ),
      h('div', { className: 'details-section' },
        h('div', { className: '' },
          h('div', { className: 'details-title' }, '판독 근거'),
          ...(result?.reasons || []).map(r => h('div', { className: 'reason-item' }, h('span', {}, '📍'), r.text))
        )
      ),
      h('div', { className: 'disclaimer-section' },
        h('div', { className: 'disclaimer-text' }, 
          "면책공고: 본 결과는 AI 알고리즘에 의해 생성된 참고용 데이터로, 실제 사실과 다를 수 있습니다. 서비스 제공자는 결과의 정확성을 보증하지 않으며, 이용으로 인한 명예훼손 등 모든 법적 책임은 이용자 본인에게 있습니다. 단순 보조 지표로만 활용하십시오."
        )
      )
    );
    containerDiv.appendChild(mainPanel);
  }

  containerNode.appendChild(containerDiv);
}

// Watchdog: Multi-window and Multi-tab stable
let lastUrl = window.location.href;
const watchdog = new MutationObserver(() => {
  if (lastUrl !== window.location.href) {
    const oldV = new URL(lastUrl).searchParams.get('v');
    const newV = new URL(window.location.href).searchParams.get('v');
    // Stronger reset: if either video ID changed OR it's a Shorts navigation
    if (oldV !== newV || window.location.pathname.includes('/shorts/')) {
      console.log('NOCAP: Navigation detected, resetting state.');
      lastAnalysisResult = null;
      currentTextBuffer = "";
      isAnalyzing = false;
      isWidgetCollapsed = true; // Always collapse on new video
      const cont = document.getElementById('nocap-extension-root');
      if (cont && cont.shadowRoot) {
        const uiRoot = cont.shadowRoot.getElementById('nocap-ui-root');
        if (uiRoot) renderUI(uiRoot as HTMLElement, isPremiumLocal, null, false);
      }
    }
    lastUrl = window.location.href;
  }

  if (window.location.pathname === '/watch' && nocapEnabled) {
    const root = document.getElementById('nocap-extension-root');
    if (!root) {
      injectUI();
    } else if (!document.body.contains(root)) {
      document.body.appendChild(root);
      root.style.display = 'block';
    } else {
      root.style.display = 'block';
    }
  } else {
    const root = document.getElementById('nocap-extension-root');
    if (root) root.style.display = 'none';
  }
});

watchdog.observe(document.body, { childList: true, subtree: true });
injectUI();
