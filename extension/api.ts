export interface FactCheckRequest {
    textContext: string;
    videoFrameBase64?: string;
    channelId?: string;
}

export interface FactCheckResponse {
    factScore: number;
    sourceScore: number;
}

/**
 * Enhanced Heuristic-based Analysis 
 * Uses regex and international keywords to detect common conspiracy patterns.
 */
export async function mockAnalyzeCloud(request: FactCheckRequest): Promise<FactCheckResponse> {
    console.log('[API] Starting Enhanced Heuristic Analysis...');

    const text = (request.textContext || "").trim();
    
    // 1. Structural Penalty
    let penalty = 0;
    const exclamationMatches = text.match(/!/g);
    if (exclamationMatches && exclamationMatches.length > 5) penalty += 15;
    
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
            penalty += 30;
        }
    });

    return {
        factScore: Math.max(10, 65 - penalty),
        sourceScore: Math.max(10, 60 - penalty)
    };
}
