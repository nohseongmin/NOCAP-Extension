// content.js - 유튜브 화면에 UI를 주입하는 역할
import { AnalysisResult } from './scoring';

console.log('NOCAP: Content script loaded. Injecting UI element directly...');

function injectUI() {
  // 현재 URL이 유튜브 영상 시청 페이지(/watch)인지 확인
  const isWatchPage = window.location.pathname === '/watch';

  let container = document.getElementById('nocap-extension-root');

  if (!isWatchPage) {
    // 영상 시청 페이지가 아니면 UI 숨김
    if (container) container.style.display = 'none';
    return;
  }

  // 영상 시청 페이지라면 UI를 보이게 처리
  if (container) {
    container.style.display = 'block';
    // Reset UI and Pipeline on SPA navigation
    if (container.shadowRoot) {
      currentTextBuffer = "";
      renderUI(container.shadowRoot, false, null, true);
      startAnalysisPipeline(container.shadowRoot);
    }
    return;
  }

  // 아직 생성되지 않았다면 새로 생성
  container = document.createElement('div');
  container.id = 'nocap-extension-root';

  // 유튜브 Z-index 간섭 방지 (항상 최상단)
  container.style.position = 'fixed';
  container.style.top = '65px';
  container.style.right = '41px';
  container.style.zIndex = '9999999';
  // SPA 네비게이션 시 포인터 이벤트 허용 확인
  container.style.pointerEvents = 'auto';

  const shadowRoot = container.attachShadow({ mode: 'closed' }); // Security: Prevent page scripts from accessing the widget internals

  // Initial render (Loading state)
  renderUI(shadowRoot, false, null, true);

  document.body.appendChild(container);

  // Start analysis pipeline
  startAnalysisPipeline(shadowRoot);
}

let activeObserver: MutationObserver | null = null;
let currentTextBuffer: string = "";
let analysisTimeoutId: number | null = null;

async function startAnalysisPipeline(shadowRoot: ShadowRoot) {
  console.log('[NOCAP] Starting Analysis Pipeline...');

  // Reset state
  currentTextBuffer = "";
  if (analysisTimeoutId) {
    clearTimeout(analysisTimeoutId);
    analysisTimeoutId = null;
  }

  // 1. Setup subtitle scraper
  if (activeObserver) activeObserver.disconnect();

  activeObserver = new MutationObserver((mutations) => {
    for (let m of mutations) {
      if (m.type === 'childList') {
        const captionElements = document.querySelectorAll('.ytp-caption-segment');
        if (captionElements.length > 0) {
          const text = Array.from(captionElements).map(el => (el as HTMLElement).innerText).join(' ');
          if (text && !currentTextBuffer.includes(text)) {
            currentTextBuffer += " " + text;
            // Keep buffer reasonable size (~500 chars)
            if (currentTextBuffer.length > 500) {
              currentTextBuffer = currentTextBuffer.substring(currentTextBuffer.length - 500);
            }
          }
        }
      }
    }
  });

  // Observe the whole player body for caption box injections
  const player = document.getElementById('ytd-player');
  if (player) {
    activeObserver.observe(player, { childList: true, subtree: true });
  }

  // 2. Wait 2.5 seconds to gather captions or use fallback text, then analyze
  analysisTimeoutId = window.setTimeout(() => {
    analysisTimeoutId = null;
    let textToAnalyze = currentTextBuffer.trim();
    
    // Fallback if no captions are active/found, use the video title to ensure dynamic scores per video
    if (!textToAnalyze) {
      const videoTitle = document.title || "Unknown Video";
      // Generate a string with variable length based on the title to randomize the mock score
      const randomPadding = Array(Math.floor(Math.random() * 50) + 10).fill("데이터").join(" ");
      textToAnalyze = `[자막 없음] 영상 제목 기반 임시 분석: ${videoTitle}. ${randomPadding}`;
    }

    try {
      chrome.runtime.sendMessage({
        action: 'ANALYZE_CONTENT',
        payload: { text: textToAnalyze }
      }, (response) => {
        console.log('[NOCAP] Background response received:', response);
        if (chrome.runtime.lastError) {
          console.error('[NOCAP] Runtime error (Background may be inactive):', chrome.runtime.lastError);
          renderUI(shadowRoot, false, null, false);
          return;
        }
        if (!response) {
          console.error('[NOCAP] Received empty response from background.');
          renderUI(shadowRoot, false, null, false);
          return;
        }
        if (!response.success) {
          console.error('[NOCAP] Pipeline error in background:', response.error);
          renderUI(shadowRoot, false, null, false);
          return;
        }
        
        // Update UI with result
        console.log('[NOCAP] Updating UI with score:', response.result.overallScore);
        renderUI(shadowRoot, false, response.result, false);
      });
    } catch (e) {
      console.error('[NOCAP] sendMessage error:', e);
      renderUI(shadowRoot, false, null, false);
    }
  }, 2500);
}


// DOM 엘리먼트 생성 헬퍼 함수 (innerHTML 우회 및 XSS 방어)
function h(tag: string, props: any, ...children: any[]) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (key === 'className') el.className = val as string;
      else if (key === 'id') el.id = val as string;
      else if (key === 'style') el.style.cssText = val as string;
      // Security: Block script execution vectors
      else if (key === 'innerHTML' || key === 'outerHTML') continue; 
      else if (key === 'href' && (val as string).toLowerCase().trim().startsWith('javascript:')) continue;
      else if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), val as EventListenerOrEventListenerObject);
      }
      else el.setAttribute(key, val as string);
    }
  }
  children.forEach(child => {
    if (!child && child !== 0) return;
    if (typeof child === 'string' || typeof child === 'number') {
      // Security: Text content is automatically escaped by createTextNode, preventing XSS injection
      el.appendChild(document.createTextNode(child.toString()));
    } else if (Array.isArray(child)) {
      child.forEach(c => c && el.appendChild(c));
    } else {
      el.appendChild(child);
    }
  });
  return el;
}

// 위젯 축소/확장 상태 관리용 전역 변수
let isWidgetCollapsed = false;

function renderUI(shadowRoot: ShadowRoot, isPremium: boolean, result: AnalysisResult | null, isLoading: boolean) {
  let score = 0;
  let color = '#a1a1aa'; // Gray (Loading)
  let conclusion = "영상을 분석 중입니다...";
  let reasoning: Array<{ type: string, text: string }> = [];

  if (result && !isLoading) {
    score = result.overallScore;
    conclusion = result.conclusion;
    reasoning = result.reasons;
    
    // Determine color based on score
    if (score >= 80) color = '#10b981'; // Green
    else if (score >= 50) color = '#f59e0b'; // Orange
    else color = '#ef4444'; // Red
  }

  // shadowRoot 초기화
  while (shadowRoot.firstChild) {
    shadowRoot.removeChild(shadowRoot.firstChild);
  }

  // Load external stylesheet instead of inline styles for CSP compliance
  const linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = chrome.runtime.getURL('content.css');
  shadowRoot.appendChild(linkEl);

  // 상세 팩트체크 리스트
  const reasonsNodes = reasoning.map(r =>
    h('div', { className: 'reason-item' },
      h('span', {}, (r.type === 'penalty' || r.type === 'fact') ? '🚨' : '✅'),
      r.text
    )
  );

  // 전체 UI 위젯 트리 생성
  const nocapWidget = h('div', {
    className: isWidgetCollapsed ? 'nocap-widget collapsed' : 'nocap-widget',
    title: isWidgetCollapsed ? 'NOCAP 판독기 열기' : ''
  },
    // 축소 아이콘 (숨김 상태일 때만 보임)
    h('div', { className: 'collapsed-icon' }, 'N'),

    // Header
    h('div', { className: 'header' },
      h('div', { className: 'header-left' },
        h('button', {
          className: 'close-btn',
          title: '판독기 숨기기',
          onClick: (e: Event) => {
            e.stopPropagation(); // 위젯 전체 클릭 방지
            isWidgetCollapsed = true;
            renderUI(shadowRoot, isPremium, result, isLoading);
          }
        }, '×'),
        h('div', { className: 'logo' }, 'NOCAP 진위 판독기')
      ),
      h('button', {
        className: 'toggle-btn',
        id: 'devToggle',
        onClick: (e: Event) => {
          e.stopPropagation();
          renderUI(shadowRoot, !isPremium, result, isLoading);
        }
      },
        isPremium ? 'PRO 모드 (테스트)' : 'BASIC 모드 (테스트)'
      )
    ),
    // Score Container
    h('div', { className: 'score-container' },
      h('div', { className: 'score-circle', style: '--score: ' + score + '%; --color: ' + color }, score + '%'),
      h('div', { className: 'conclusion' }, conclusion)
    ),
    // Details Section
    h('div', { className: 'details-section' },
      h('div', { className: isPremium ? '' : 'premium-blur' },
        h('div', { className: 'details-title' }, '상세 팩트체크 근거'),
        ...reasonsNodes
      ),
      !isPremium ? h('div', { className: 'premium-overlay' },
        h('div', { className: 'premium-lock-icon' }, '🔒'),
        h('button', {
          className: 'premium-btn',
          onClick: (e: Event) => {
            e.stopPropagation();
            // 테스트 단계이므로 누르면 바로 풀리도록 설정
            renderUI(shadowRoot, true, result, isLoading);
          }
        }, 'Premium 잠금 해제 (테스트)')
      ) : null
    )
  );

  // 축소 상태일 때 위젯을 클릭하면 다시 복구
  if (isWidgetCollapsed) {
    nocapWidget.addEventListener('click', () => {
      isWidgetCollapsed = false;
      renderUI(shadowRoot, isPremium, result, isLoading);
    });
  }

  shadowRoot.appendChild(nocapWidget);
}

// 유튜브 SPA 네비게이션 감지 이벤트 리스너
document.addEventListener('yt-navigate-finish', injectUI);

// 스크립트 최초 실행
injectUI();
