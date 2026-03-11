(function(){console.log("NOCAP: Content script loaded. Injecting UI element directly...");function g(){const o=window.location.pathname==="/watch";let e=document.getElementById("nocap-extension-root");if(!o){e&&(e.style.display="none");return}if(e){e.style.display="block";return}e=document.createElement("div"),e.id="nocap-extension-root",e.style.position="fixed",e.style.top="65px",e.style.right="41px",e.style.zIndex="9999999",e.style.pointerEvents="auto";const c=e.attachShadow({mode:"open"});l(c,!1),document.body.appendChild(e)}function t(o,e,...c){const i=document.createElement(o);if(e)for(const[n,a]of Object.entries(e))n==="className"?i.className=a:n==="id"?i.id=a:n==="style"?i.style.cssText=a:n.startsWith("on")&&typeof a=="function"?i.addEventListener(n.substring(2).toLowerCase(),a):i.setAttribute(n,a);return c.forEach(n=>{!n&&n!==0||(typeof n=="string"||typeof n=="number"?i.appendChild(document.createTextNode(n.toString())):Array.isArray(n)?n.forEach(a=>a&&i.appendChild(a)):i.appendChild(n))}),i}let s=!1;function l(o,e){const i="#fbbf24",n="영상의 주장은 일부 사실이나, 선동적인 어휘와 확증 편향적 근거가 혼재되어 있습니다.",a=[{type:"penalty",text:"로컬 AI 문맥 분석 결과 '분노', '배신' 등 감정적 어휘 빈도 12%로 높음 (-15점)"},{type:"fact",text:"구글 팩트체크 API 결과, 2분 10초 발언은 Snopes에서 '거짓(False)' 판정 (-35점)"},{type:"bonus",text:"해당 채널은 과거 허위 조작 정보 이력이 없음 (+5점)"}],f=`
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
        background: conic-gradient(${i} 45%, rgba(255,255,255,0.1) 0);
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
    `;for(;o.firstChild;)o.removeChild(o.firstChild);const p=document.createElement("style");p.textContent=f,o.appendChild(p);const b=a.map(r=>t("div",{className:"reason-item"},t("span",{},r.type==="penalty"||r.type==="fact"?"🚨":"✅"),r.text)),d=t("div",{className:s?"nocap-widget collapsed":"nocap-widget",title:s?"NOCAP 판독기 열기":""},t("div",{className:"collapsed-icon"},"N"),t("div",{className:"header"},t("div",{className:"header-left"},t("button",{className:"close-btn",title:"판독기 숨기기",onClick:r=>{r.stopPropagation(),s=!0,l(o,e)}},"×"),t("div",{className:"logo"},"NOCAP 진위 판독기")),t("button",{className:"toggle-btn",id:"devToggle",onClick:r=>{r.stopPropagation(),l(o,!e)}},e?"PRO 모드 (테스트)":"BASIC 모드 (테스트)")),t("div",{className:"score-container"},t("div",{className:"score-circle",style:"color: "+i},"45%"),t("div",{className:"conclusion"},n)),t("div",{className:"details-section"},t("div",{className:e?"":"premium-blur"},t("div",{style:"font-size: 11px; color:#71717a; margin-bottom: 8px; font-weight:600;"},"상세 팩트체크 근거"),...b),e?null:t("div",{className:"premium-overlay"},t("div",{className:"premium-lock-icon"},"🔒"),t("button",{className:"premium-btn",onClick:r=>{r.stopPropagation(),l(o,!0)}},"Premium 잠금 해제 (테스트)"))));s&&d.addEventListener("click",()=>{s=!1,l(o,e)}),o.appendChild(d)}document.addEventListener("yt-navigate-finish",g);g();
})()
