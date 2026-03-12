export interface FactCheckRequest {
    textContext: string;
    videoFrameBase64?: string;
    channelId?: string;
}

export interface FactCheckResponse {
    factScore: number;
    visualScore: number;
    sourceScore: number;
}

const getStringHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

/**
 * Edge-based Analysis (Local Only)
 * Uses hashing and local AI to determine credibility without external server costs.
 */
export async function mockAnalyzeCloud(request: FactCheckRequest): Promise<FactCheckResponse> {
    console.log('[API] Starting Edge Analysis (Zero Cost Mode)...');

    // Simulate short processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    const hash = getStringHash(request.textContext);
    
    // Heuristic Score based on text content hash and length
    // In a real production edge version, this would use a more complex local NLP model or window.ai
    const pseudoRandom = (hash % 50) + 40; // 40~90 range

    // Simulated Visual score (Deepfake detection placeholder)
    const isDeepfakeMock = (hash % 100) < 10; 
    const visualScore = isDeepfakeMock ? Math.floor((hash % 15) + 5) : Math.floor((hash % 15) + 85);

    return {
        factScore: pseudoRandom,
        visualScore: visualScore,
        sourceScore: 70 + (hash % 20)
    };
}



/**
 * Local AI Filter using Chrome's Built-in AI (window.ai)
 * Fallbacks to simple regex if window.ai is not available.
 */
export async function analyzeLocalSentiment(text: string): Promise<number> {
    // Safely check for window.ai since 'window' is not defined in Service Workers
    const ai = typeof window !== 'undefined' ? (window as any).ai : undefined;

    if (ai && ai.asTextSession) {
        try {
            const session = await ai.asTextSession();
            const prompt = `Analyze the emotional intensity and clickbait nature of this text on a scale of 0 to 100 (100 being highly inflammatory/clickbait, 0 being completely neutral). Return ONLY the integer number. Text: "${text}"`;
            const result = await session.prompt(prompt);

            const score = parseInt(result.trim(), 10);
            return isNaN(score) ? 30 : score; // Default to 30 if parsing fails
        } catch (e) {
            console.warn("[Local AI] Error using window.ai, falling back to heuristic:", e);
        }
    } else {
        console.warn("[Local AI] window.ai not available. Please enable Chrome flags. Using heuristic fallback.");
    }

    // Heuristic fallback
    let score = 0;
    const inflammatoryWords = ['충격', '경악', '분노', '배신', '폭로', '단독', '거짓말', '조작', '진실', '무조건'];
    inflammatoryWords.forEach(word => {
        if (text.includes(word)) score += 15;
    });
    const exclamationCount = (text.match(/!/g) || []).length;
    score += (exclamationCount * 10);

    return Math.min(100, score);
}
