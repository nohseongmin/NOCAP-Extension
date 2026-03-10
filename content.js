// content.js - 유튜브 화면에 UI를 주입하는 역할

console.log('NOCAP: Content script loaded. Injecting UI element directly...');

function injectUI() {
    if (document.getElementById('nocap-extension-root')) return;

    const container = document.createElement('div');
    container.id = 'nocap-extension-root';

    // 유튜브 Z-index 간섭 방지 (항상 최상단)
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999999';

    const shadowRoot = container.attachShadow({ mode: 'open' });

    // 초기 렌더링 호출
    renderUI(shadowRoot, false);

    document.body.appendChild(container);
}

function renderUI(shadowRoot, isPremium) {
    const score = 45;
    const color = '#fbbf24'; // Yellow
    const conclusion = "영상의 주장은 일부 사실이나, 선동적인 어휘와 확증 편향적 근거가 혼재되어 있습니다.";
    const reasoning = [
        { type: "penalty", text: "로컬 AI 문맥 분석 결과 '분노', '배신' 등 감정적 어휘 빈도 12%로 높음 (-15점)" },
        { type: "fact", text: "구글 팩트체크 API 결과, 2분 10초 발언은 Snopes에서 '거짓(False)' 판정 (-35점)" },
        { type: "bonus", text: "해당 채널은 과거 허위 조작 정보 이력이 없음 (+5점)" }
    ];

    const style = `
    <style>
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
        transition: all 0.3s ease;
        overflow: hidden;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo {
        font-weight: 700;
        font-size: 16px;
        letter-spacing: -0.5px;
        background: linear-gradient(90deg, #60a5fa, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

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

      /* 링 애니메이션 및 색상 */
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

      /* 상세 근거 리스트 */
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

      /* 프리미엄 블러 효과 */
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
    </style>
  `;

    const reasonsHtml = reasoning.map(r =>
        `<div class="reason-item">
      <span>${r.type === 'penalty' || r.type === 'fact' ? '🚨' : '✅'}</span>
      ${r.text}
    </div>`
    ).join('');

    const html = `
    <div class="nocap-widget">
      <div class="header">
        <div class="logo">NOCAP 진위 판독기</div>
        <button class="toggle-btn" id="devToggle">
          ${isPremium ? 'PRO 모드' : 'BASIC 모드'} (테스트)
        </button>
      </div>

      <div class="score-container">
        <div class="score-circle" style="color: ${color}">
          ${score}%
        </div>
        <div class="conclusion">${conclusion}</div>
      </div>

      <div class="details-section">
        <div class="${isPremium ? '' : 'premium-blur'}">
          <div style="font-size: 11px; color:#71717a; margin-bottom: 8px; font-weight:600;">상세 팩트체크 근거</div>
          ${reasonsHtml}
        </div>
        
        ${!isPremium ? `
          <div class="premium-overlay">
            <div class="premium-lock-icon">🔒</div>
            <button class="premium-btn">Premium 잠금 해제</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

    let combinedHtml = style + html;

    // 유튜브의 TrustedTypes 보안 정책 통과를 위한 커스텀 Policy 생성
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            const policy = window.trustedTypes.createPolicy('nocap-policy', {
                createHTML: (string) => string
            });
            combinedHtml = policy.createHTML(combinedHtml);
        } catch (e) {
            console.warn("NOCAP: TrustedTypes policy creation failed:", e);
        }
    }

    shadowRoot.innerHTML = combinedHtml;

    // 이벤트 리스너 다시 등록 (innerHTML 덮어쓰기 때문)
    shadowRoot.getElementById('devToggle').addEventListener('click', () => {
        // 상태 토글 후 다시 렌더링
        renderUI(shadowRoot, !isPremium);
    });
}

// 스크립트 실행
injectUI();
