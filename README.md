# NOCAP: 유튜브 가짜뉴스 판별 확장 프로그램 (Zero-Cost Edition)

유튜브 영상의 신뢰도를 실시간으로 판별하는 크롬 확장 프로그램입니다. 본 프로젝트는 사용자의 비용 부담과 개인정보 노출을 최소화하기 위해 **100% 온디바이스(On-device) AI 및 로컬 분석** 기술을 사용합니다.

## 🚀 프로젝트 개요 및 아키텍처

NOCAP은 외부 서버나 유료 API 호출 없이, 사용자의 브라우저 성능만을 활용하여 가짜뉴스를 판별하는 **Zero-Cost Edge 아키텍처**로 설계되었습니다.

*   **Zero-Cost (비용 0원)**: 별도의 백엔드 서버나 유료 API(Google Fact Check 등) 연동을 제거하여 유지비용이 발생하지 않습니다.
*   **Privacy-First (개인정보 보호)**: 모든 분석 데이터(자막, 제목 등)는 사용자의 컴퓨터 내부에서만 처리되며 외부 서버로 전송되지 않습니다.
*   **Edge AI (온디바이스)**: 크롬의 내장 AI(`window.ai`)와 로컬 텍스트 분석 알고리즘을 결합하여 실시간으로 신뢰도를 산출합니다.
*   **Shadow DOM 격리**: 유튜브 웹사이트의 기존 스타일과 충돌하지 않도록 UI 요소를 Shadow DOM 내부에서 독립적으로 렌더링합니다.

---

## 💻 Tech Stack (기술 스택)

*   **Language**: TypeScript
*   **Build Tool**: Vite + CRXJS
*   **Local AI**: Chrome Built-in AI (Gemini Nano via `window.ai`)
*   **Scraping**: Native DOM MutationObserver (자막 추출)

---

## 📂 디렉토리 구조

*   `extension/`: 크롬 확장 프로그램 소스코드
    *   `content.ts`: 유튜브 DOM 분석 및 UI 주입
    *   `api.ts`: 로컬 AI 및 엣지 분석 로직 (비용 0원 모드)
    *   `scoring.ts`: 다중 양태 가중치 산출 엔진
    *   `background.ts`: 비동기 처리 및 서비스 워커

---

## 🛠️ 개발 진행 상황

### 1. 프로젝트 기반 구현 (완료)
- [x] TypeScript 및 Vite 빌드 환경 설정
- [x] Shadow DOM 기반 UI 위젯 주입 기술 확보

### 2. 분석 엔진 (Zero-Cost 전환 완료)
- [x] **[Pivoted]** 외부 클라우드 API 의존성 완전 제거 (비용 절감)
- [x] 크롬 내장 AI(`window.ai`) 연동 로직 구현
- [x] 텍스트 패턴 및 해시 기반 로직 고도화

### 3. 사용자 경험 및 안정성 (완료)
- [x] 유튜브 SPA 네비게이션 시 상태 초기화 로직 (영상 이동 대응)
- [x] 팩트체크 근거(Reasoning) 시각화 및 프리미엄 모드 토글 (테스트용)

---

## 🔒 보안 정책
*   본 프로젝트는 코드 내에 어떠한 API Key나 민감한 정보를 포함하지 않습니다.
    *   *2024.03.11 점검 완료: Google Fact Check API Key 제거됨.*
*   사용자의 유튜브 활동 데이터는 로컬 분석 후 즉시 휘발 처리됩니다.
