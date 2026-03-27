/**
 * Gatekeeper (Early Exit Analysis)
 * 1. Filtering non-informational content (Music, Games) early.
 * 2. Checks for suspicious keywords or heavy exclamation usage.
 */
export function runGatekeeper(text) {
    const textLower = text.toLowerCase();
    // 1. Entertainment pre-filter (Early Pass)
    const entertainmentKeywords = [
        "뮤직비디오", "official video", "music video", "예고편", "trailer",
        "게임", "gameplay", "티저", "teaser", "ost", "라이브 밴드", "concert"
    ];
    for (const kw of entertainmentKeywords) {
        if (textLower.includes(kw)) {
            return {
                skipAI: true,
                baseScore: 95,
                reasons: [{ type: 'bonus', text: '검사 제외: 신뢰도 평가와 무관한 컨텐츠 (음악/게임/영화 등)' }]
            };
        }
    }
    const reasons = [];
    const exclamationMatches = text.match(/!/g);
    if (exclamationMatches && exclamationMatches.length > 3) {
        reasons.push({ type: 'penalty', text: '의심 패턴: 자극적인 제목이나 내용 (과도한 느낌표 사용)' });
    }
    // 2. Comprehensive Dictionary Matching (Optimized string matching)
    const hotKeywords = [
        // 글로벌 음모론
        "지구 평평", "flat earth", "달 착륙 조작", "달 착륙 거짓", "지구 공동설", "켐트레일", "화학운",
        "블루빔 프로젝트", "니비루", "플래닛 x", "일루미나티", "프리메이슨", "딥 스테이트", "그림자 정부",
        "신세계 질서", "렙틸리언", "큐어논", "피자게이트", "5g 마인드 컨트롤", "마이크로칩 삽입", "조작설",
        // 사이비 종교
        "허경영", "하늘궁", "신천지", "이만희", "jms", "기독교복음선교회", "정명석", "만민중앙교회",
        "아가동산", "오대양", "돌나라", "백백교", "은혜로교회", "옴진리교", "사이언톨로지", "천국의 문",
        // 유사과학 / 가짜 의학
        "백신 자폐증", "안아키", "mrna 백신 조작", "백신 칩", "산화그래핀", "구충제 항암치료",
        "mms 요법", "소금물 관장", "육각수", "게르마늄 팔찌", "음이온 치료"
    ];
    let isConspiracy = false;
    for (const kw of hotKeywords) {
        if (textLower.includes(kw)) {
            reasons.push({ type: 'penalty', text: `주의: 분석 대상에서 [${kw}] 관련 극단적/유해성 패턴 감지됨` });
            isConspiracy = true;
            break; // Record only the first matched big keyword to avoid spam
        }
    }
    if (isConspiracy || (exclamationMatches && exclamationMatches.length > 3)) {
        return { skipAI: false, baseScore: 0, reasons };
    }
    // If text is extremely clean, skip AI safely
    return {
        skipAI: true,
        baseScore: 92,
        reasons: [{ type: 'fact', text: '1차 검증: 유해성 키워드나 자극성 요소 유무 통과 (안전)' }]
    };
}
/**
 * Enhanced Heuristic-based Analysis
 * Uses regex and international keywords to detect common conspiracy patterns.
 */
export async function mockAnalyzeCloud(request) {
    console.log('[API] Starting Enhanced Heuristic Analysis...');
    const text = (request.textContext || "").trim();
    let reasons = [];
    // 1. Structural Penalty
    let penalty = 0;
    const exclamationMatches = text.match(/!/g);
    if (exclamationMatches && exclamationMatches.length > 5) {
        penalty += 15;
        reasons.push({ type: 'penalty', text: '형식 분석: 지나치게 과도한 느낌표나 자극적 통신어체 사용' });
    }
    // 2. International Conspiracy Regex
    // Matches variations of: Flat Earth, Deep State, Fake News, Secret society, etc.
    const conspiracyPatterns = [
        /지구\s*평평/i, /flat\s*earth/i,
        /그림자\s*정부/i, /shadow\s*government/i, /deep\s*state/i,
        /딥\s*스테이트/i, /음모론/i, /conspiracy/i,
        /조작\s*설/i, /fake\s*news/i, /가짜\s*뉴스/i,
        /비밀\s*리에/i, /secretly/i, /진실을\s*숨긴/i,
        /허경영/i, /하늘궁/i, /사이비/i
    ];
    conspiracyPatterns.forEach(pattern => {
        if (pattern.test(text)) {
            console.log(`[Heuristic] Flagged by pattern: ${pattern}`);
            penalty += 55; // Significantly higher penalty to bypass AI optimism
            reasons.push({ type: 'penalty', text: '휴리스틱: 전형적인 음모론 및 조작설 패턴 구조 발견' });
        }
    });
    // 3. Journalism/News Context (Whitelist)
    const newsKeywords = [/속보/i, /뉴스/i, /보도/i, /고발/i, /기자/i, /취재/i, /앵커/i, /평론/i];
    let newsScore = 0;
    newsKeywords.forEach(pattern => {
        if (pattern.test(text))
            newsScore += 1;
    });
    // If strong journalistic indicators, drastically reduce the conspiracy penalty
    if (newsScore >= 2) {
        console.log(`[Heuristic] Journalistic context detected (score: ${newsScore}). Reducing penalty.`);
        penalty = Math.max(0, penalty - 40);
        reasons.push({ type: 'bonus', text: '구조 분석: 뉴스 보도, 현장 취재, 기자 등 신뢰성 높은 문맥 확인' });
    }
    return {
        factScore: Math.max(10, 85 - penalty),
        sourceScore: Math.max(10, 80 - penalty),
        reasons
    };
}
