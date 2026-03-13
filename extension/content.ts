// content.js - 유튜브 화면에 UI를 주입하는 역할
import { AnalysisResult, calculateCredibility } from './scoring';
import { mockAnalyzeCloud } from './api';

console.log('NOCAP: Content script loaded (v1.6.0).');

// UI State (Persistent across small DOM changes)
let isWidgetCollapsed = true;
let isAnalyzing = false;
let lastAnalysisResult: AnalysisResult | null = null;
let currentTextBuffer: string = "";
let isPremiumLocal = false; // BASIC by default

function injectUI() {
  const isWatchPage = window.location.pathname === '/watch';
  let container = document.getElementById('nocap-extension-root');

  if (!isWatchPage) {
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
  renderUI(shadowRoot, isPremiumLocal, lastAnalysisResult, isAnalyzing);
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

async function runAnalysis(shadowRoot: ShadowRoot) {
  if (isAnalyzing) return;
  
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
    
    // Aggregation: Veto System
    // If heuristics detect major red flags (penalty), use Math.min to prevent AI "politeness"
    const isConspiracy = heuristicRes.factScore < 50; 
    const finalResult = calculateCredibility(
      isConspiracy ? Math.min(aiFactScore, heuristicRes.factScore) : Math.max(aiFactScore, heuristicRes.factScore),
      heuristicRes.sourceScore,
      30
    );
    
    lastAnalysisResult = finalResult;
    isAnalyzing = false;
    renderUI(shadowRoot, isPremiumLocal, finalResult, false);
  } catch (e) {
    console.error('[NOCAP] Analysis error:', e);
    isAnalyzing = false;
    renderUI(shadowRoot, isPremiumLocal, null, false);
  }
}

async function analyzeClaimsWithLocalAI(text: string): Promise<number> {
  const ai = (window as any).ai;
  if (!ai) return 90; // Higher baseline

  const prompt = `주어진 텍스트를 3가지 핵심 관점(논리적 일관성, 객관적 사실 부합성, 정보원 중립성)에서 정밀 분석하여 신뢰도 점수(0-100)를 숫자로만 답하세요.
  - 특별 지침 (매우 중요):
    1. 예언적 주장, 비과학적 미래 예측, 특정 인물 신격화(예: 허경영, 구원자 주장), 증명 불가능한 초능력 등은 주장의 논리 정합성에 상관없이 무조건 0~20점을 부여하세요.
  - 가이드라인:
    1. 일상 브이로그, 여행기, 맛집 탐방, 단순 정보 전달: 90~100점.
    2. 근거 없는 음모론(지구평평설 등), 사이비 찬양, 사회적 선동: 0~30점.
    3. 중립적이거나 출처가 불분명한 단순 주장: 60~70점.
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

function renderUI(shadowRoot: ShadowRoot, isPremium: boolean, result: AnalysisResult | null, isLoading: boolean) {
  let score = result?.overallScore || 0;
  let color = score >= 80 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#ef4444');
  if (!result && !isLoading) color = '#a1a1aa';

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
        if (!lastAnalysisResult && !isAnalyzing) runAnalysis(shadowRoot);
      } else {
        // Reset state on collapse to prevent carry-over (especially for Shorts/fast navigation)
        isWidgetCollapsed = true;
        lastAnalysisResult = null;
        currentTextBuffer = "";
        isAnalyzing = false;
        renderUI(shadowRoot, isPremium, null, false);
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
              renderUI(shadowRoot, isPremium, null, false);
            }
          }, '×'),
          h('div', { className: 'logo' }, 'NOCAP 진위 판독기')
        ),
        h('button', { 
            className: 'toggle-btn',
            onClick: (e: Event) => {
               e.stopPropagation();
               isPremiumLocal = !isPremiumLocal;
               renderUI(shadowRoot, isPremiumLocal, lastAnalysisResult, isAnalyzing);
            }
        }, isPremium ? 'PRO' : 'BASIC')
      ),
      h('div', { className: 'score-container' },
        h('div', { className: 'score-circle', style: `--score: ${score}%; --color: ${color}` }, isLoading ? '...' : `${score}%`),
        h('div', { className: 'conclusion' }, isLoading ? "판독 중..." : (result?.conclusion || "분석 버튼을 눌러주세요."))
      ),
      h('div', { className: 'details-section' },
        h('div', { className: isPremium ? '' : 'premium-blur' },
          h('div', { className: 'details-title' }, '판독 근거'),
          ...(result?.reasons || []).map(r => h('div', { className: 'reason-item' }, h('span', {}, '📍'), r.text))
        ),
        // Restore Premium Overlay with Text
        !isPremium ? h('div', { className: 'premium-overlay' },
          h('div', { className: 'premium-lock-icon' }, '🔒'),
          h('span', { className: 'premium-text' }, '프리미엄 요금제')
        ) : null
      ),
      h('div', { className: 'disclaimer-section' },
        h('div', { className: 'disclaimer-text' }, 
          "면책공고: 본 결과는 AI 알고리즘에 의해 생성된 참고용 데이터로, 실제 사실과 다를 수 있습니다. 서비스 제공자는 결과의 정확성을 보증하지 않으며, 이용으로 인한 명예훼손 등 모든 법적 책임은 이용자 본인에게 있습니다. 단순 보조 지표로만 활용하십시오."
        )
      )
    );
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
    // Stronger reset: if either video ID changed OR it's a Shorts navigation
    if (oldV !== newV || window.location.pathname.includes('/shorts/')) {
      console.log('NOCAP: Navigation detected, resetting state.');
      lastAnalysisResult = null;
      currentTextBuffer = "";
      isAnalyzing = false;
      isWidgetCollapsed = true; // Always collapse on new video
      const cont = document.getElementById('nocap-extension-root');
      if (cont && cont.shadowRoot) renderUI(cont.shadowRoot as any, isPremiumLocal, null, false);
    }
    lastUrl = window.location.href;
  }

  if (window.location.pathname === '/watch') {
    const root = document.getElementById('nocap-extension-root');
    if (!root) {
      injectUI();
    } else if (!document.body.contains(root)) {
      document.body.appendChild(root);
    }
  }
});

watchdog.observe(document.body, { childList: true, subtree: true });
injectUI();
