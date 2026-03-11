# NOCAP: 유튜브 가짜뉴스 판별 확장 프로그램

유튜브 영상에 내재된 다중 양태의 정보(자막, 문맥)를 실시간으로 수집하고, 온디바이스 AI 인프라와 백엔드 분석 파이프라인을 통해 교차 검증하여 직관적인 신뢰도 백분율로 제공하는 크롬 확장 프로그램입니다.

## 🚀 프로젝트 개요 및 아키텍처

본 프로젝트는 비용 효율적인 **로컬 AI(On-device)** 기반 1차 필터링과 강력한 **백엔드 AI 분석** 및 **클라우드 연동**을 결합한 하이브리드 아키텍처로 설계되었습니다. **Freemium(기본 무료, 프리미엄 유료)** 수익 모델을 채택하고 있습니다.

*   **Shadow DOM 격리**: 확장 프로그램의 UI 요소가 유튜브 본래의 CSS와 충돌하지 않도록 Shadow DOM 내부에 렌더링됩니다.
*   **Freemium 모델**:
    *   **Basic (무료)**: 영상의 종합 신뢰도 점수(%)와 시각적 인디케이터(색상)만 제한적으로 제공.
    *   **Premium (유료)**: 팩트체크 세부 근거, 페널티 요인, 상세 분석 로직 등 전체 분석 데이터를 해제(Blur 제거). (Firebase 또는 Supabase Auth 기반 인증)

---

## 💻 Tech Stack (기술 스택)

프로젝트의 안정성과 확장성을 위해 프론트엔드와 백엔드를 분리하여 구축합니다.

### Frontend (Chrome Extension)
*   **Language**: TypeScript (유지보수성 및 타입 안정성 확보)
*   **Build Tool**: Vite (CRXJS 플러그인 활용)
*   **UI/Styling**: Vanilla HTML/CSS (Shadow DOM 적용)

### Backend (API Server)
*   **Language & Framework**: Python + FastAPI (가벼운 비동기 웹 프레임워크, AI/NLP 생태계 최적화)
*   **Database (BaaS)**: Supabase (PostgreSQL 기반, 향후 `pgvector`를 통한 벡터 검색 대비 및 인증/저장소 활용)

---

## 📂 Directory Structure (디렉토리 구조)

### 6. 권한 및 최적화, 최상위 엣지케이스 대응
- [ ] SPA(Single Page Application) 라우팅 전환 시 구독/자원 해제 처리 로직 (메모리 누수 방지)
- [ ] 데이터 휘발성(Volatile 처리) 원칙을 적용하여 캐싱된 분석 데이터를 메모리에만 보관 후 탭 종료 시 삭제 처리
- [ ] [Google Docs Requirements](https://docs.google.com/document/d/1JpT8y7pWZnKCtm7rtDsrc1D6e80ZFMEZCNv0VbguMFw/edit?usp=sharing)

*   `extension/`: 크롬 확장 프로그램 소스코드 (TypeScript, Vite 기반)
*   `backend/`: 데이터 수집 및 딥러닝/NLP 서빙용 API 서버 (Python, FastAPI 기반)

---

## 🛠️ 개발 진행 상황 (Task Breakdown)

### 1. 프로젝트 초기 구조화 및 환경 설정
- [x] Tech Stack 확정 (TypeScript, Python FastAPI, Supabase)
- [ ] 디렉토리 구조 분리 (`extension`, `backend`)
- [ ] 프론트엔드(TypeScript/Vite) 환경 세팅
- [ ] 백엔드(Python/FastAPI) 의존성 설정 및 Supabase 연결

### 2. UI/UX 컴포넌트 개발 (Shadow DOM 내부)
- [x] 신뢰도 게이지 바 컴포넌트 기틀 구현
- [x] 베이직 플랜용 블러(Blur) 처리 기틀 구축
- [ ] Supabase Auth 연동을 통한 Premium 멤버십 상태 관리

### 3. 데이터 파이프라인 구축
- [ ] [Extension] 유튜브 동영상 내 자막 실시간 스크래핑 설계
- [ ] [Backend] FastAPI 팩트체크 API 라우터 구축

### 4. 분석 및 검증 엔진 통합
- [ ] Chrome Built-in AI (Gemini Nano) `window.ai` 1차 필터링 적용 여부 확인
- [ ] 외부 Fact Check API (Google 등) 서버스 연동
- [ ] NLP 감성 분석, 논리적 비약 등 점수 산출 로직 구현 (`backend`)

### 5. 최상위 엣지케이스 대응
- [ ] SPA(Single Page Application) 라우팅 전환 시 렌더링 최적화
- [ ] 데이터 캐싱 정책 수립 및 자원 누수 방지
