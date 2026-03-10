// content.js - 유튜브 화면에 UI를 주입하는 역할

console.log('NOCAP: Content script loaded. Injecting UI element...');

// shadow-ui.js 스크립트를 페이지 DOM에 삽입
const script = document.createElement('script');
script.src = chrome.runtime.getURL('shadow-ui.js');
script.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// 자막 스크래핑 로직 (차후 Phase 1에서 연동 예정)
// ...
