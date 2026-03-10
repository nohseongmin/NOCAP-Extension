// content.js - 유튜브 화면에 UI를 주입하는 역할

console.log('NOCAP: Content script loaded. Injecting UI element directly...');

function injectUI() {
  if (document.getElementById('nocap-extension-root')) return;

  const container = document.createElement('div');
  container.id = 'nocap-extension-root';

  // 유튜브 Z-index 간섭 방지 (항상 최상단)
  container.style.position = 'fixed';
  container.style.top = '80px';
  container.style.right = '20px';
  container.style.zIndex = '9999999';
  // SPA 네비게이션 시 포인터 이벤트 허용 확인
  container.style.pointerEvents = 'auto';

  const shadowRoot = container.attachShadow({ mode: 'open' });

  // 초기 렌더링 호출
  renderUI(shadowRoot, false);

  document.body.appendChild(container);
}

// DOM 엘리먼트 생성 헬퍼 함수 (innerHTML 우회)
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (key === 'className') el.className = val;
      else if (key === 'id') el.id = val;
      else if (key === 'style') el.style.cssText = val;
      else if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), val);
      }
      else el.setAttribute(key, val);
    }
  }
  children.forEach(child => {
    if (!child && child !== 0) return;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child));
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

function renderUI(shadowRoot, isPremium) {
  const score = 45;
  const color = '#fbbf24'; // Yellow
  const conclusion = "영상의 주장은 일부 사실이나, 선동적인 어휘와 확증 편향적 근거가 혼재되어 있습니다.";
  const reasoning = [
    { type: "penalty", text: "로컬 AI 문맥 분석 결과 '분노', '배신' 등 감정적 어휘 빈도 12%로 높음 (-15점)" },
    { type: "fact", text: "구글 팩트체크 API 결과, 2분 10초 발언은 Snopes에서 '거짓(False)' 판정 (-35점)" },
    { type: "bonus", text: "해당 채널은 과거 허위 조작 정보 이력이 없음 (+5점)" }
  ];

  const styleContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      :host {
        all: initial;
        font-family: 'Inter', -apple-system, sans-serif;
      }

      .nocap-widget {
        width: 340px;
        background: rgba(18, 18, 20, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        color: white;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      
      /* 숨겨진 상태일 때 */
      .nocap-widget.collapsed {
        width: 48px;
        height: 48px;
        padding: 0;
        border-radius: 24px;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: rgba(18, 18, 20, 0.6);
      }
      .nocap-widget.collapsed > *:not(.collapsed-icon) {
        display: none !important;
      }
      .collapsed-icon {
        display: none;
        font-size: 20px;
        font-weight: 700;
        background: linear-gradient(90deg, #60a5fa, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .nocap-widget.collapsed .collapsed-icon {
        display: block;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .logo {
        font-weight: 700;
        font-size: 16px;
        letter-spacing: -0.5px;
        background: linear-gradient(90deg, #60a5fa, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #a1a1aa;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color 0.2s;
      }
      .close-btn:hover { color: white; }

      .toggle-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #a1a1aa;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        cursor: pointer;
        transition: 0.2s;
      }
      .toggle-btn:hover { background: rgba(255,255,255,0.2); }

      .score-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .score-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        position: relative;
      }

      .score-circle::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        padding: 4px;
        background: conic-gradient(${color} ${score}%, rgba(255,255,255,0.1) 0);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }

      .conclusion {
        font-size: 13px;
        color: #e4e4e7;
        text-align: center;
        line-height: 1.5;
      }

      .details-section {
        position: relative;
        background: rgba(0,0,0,0.3);
        border-radius: 12px;
        padding: 16px;
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .reason-item {
        font-size: 12px;
        color: #a1a1aa;
        line-height: 1.4;
        display: flex;
        gap: 6px;
      }
      .reason-item span {
        flex-shrink: 0;
      }

      .premium-blur {
        filter: blur(5px);
        user-select: none;
        pointer-events: none;
        opacity: 0.5;
      }

      .premium-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: rgba(18, 18, 20, 0.4);
        border-radius: 12px;
        z-index: 10;
      }

      .premium-lock-icon {
        font-size: 24px;
      }

      .premium-btn {
        background: linear-gradient(90deg, #8b5cf6, #3b82f6);
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        color: white;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .premium-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
      }
    `;

  // shadowRoot 초기화
  while (shadowRoot.firstChild) {
    shadowRoot.removeChild(shadowRoot.firstChild);
  }

  // 스타일 엘리먼트 생성
  const styleEl = document.createElement('style');
  styleEl.textContent = styleContent;
  shadowRoot.appendChild(styleEl);

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
          onClick: (e) => {
            e.stopPropagation(); // 위젯 전체 클릭 방지
            isWidgetCollapsed = true;
            renderUI(shadowRoot, isPremium);
          }
        }, '×'),
        h('div', { className: 'logo' }, 'NOCAP 진위 판독기')
      ),
      h('button', {
        className: 'toggle-btn',
        id: 'devToggle',
        onClick: (e) => {
          e.stopPropagation();
          renderUI(shadowRoot, !isPremium);
        }
      },
        isPremium ? 'PRO 모드 (테스트)' : 'BASIC 모드 (테스트)'
      )
    ),
    // Score Container
    h('div', { className: 'score-container' },
      h('div', { className: 'score-circle', style: 'color: ' + color }, score + '%'),
      h('div', { className: 'conclusion' }, conclusion)
    ),
    // Details Section
    h('div', { className: 'details-section' },
      h('div', { className: isPremium ? '' : 'premium-blur' },
        h('div', { style: 'font-size: 11px; color:#71717a; margin-bottom: 8px; font-weight:600;' }, '상세 팩트체크 근거'),
        ...reasonsNodes
      ),
      !isPremium ? h('div', { className: 'premium-overlay' },
        h('div', { className: 'premium-lock-icon' }, '🔒'),
        h('button', {
          className: 'premium-btn',
          onClick: (e) => {
            e.stopPropagation();
            // 테스트 단계이므로 누르면 바로 풀리도록 설정
            renderUI(shadowRoot, true);
          }
        }, 'Premium 잠금 해제 (테스트)')
      ) : null
    )
  );

  // 축소 상태일 때 위젯을 클릭하면 다시 복구
  if (isWidgetCollapsed) {
    nocapWidget.addEventListener('click', () => {
      isWidgetCollapsed = false;
      renderUI(shadowRoot, isPremium);
    });
  }

  shadowRoot.appendChild(nocapWidget);
}

// 유튜브 SPA 네비게이션 감지 이벤트 리스너
document.addEventListener('yt-navigate-finish', injectUI);

// 스크립트 최초 실행
injectUI();
