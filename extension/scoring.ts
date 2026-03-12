export interface AnalysisResult {
    factScore: number;
    visualScore: number;
    sourceScore: number;
    overallScore: number;
    conclusion: string;
    reasons: Array<{ type: 'fact' | 'penalty' | 'bonus', text: string }>;
}

/**
 * Calculates the overall credibility score based on the mathematical model.
 * @param factScore Factual Integrity Score (0-100)
 * @param visualScore Visual Authenticity Score (0-100)
 * @param sourceScore Source/Channel Transparency Score (0-100)
 * @param localSentimentScore Local AI sentiment penalty (0-100)
 * @returns AnalysisResult
 */
export function calculateCredibility(
    factScore: number,
    visualScore: number,
    sourceScore: number,
    localSentimentScore: number
): AnalysisResult {
    // Basic weightings (can be adjusted later)
    const W_FACT = 0.50;
    const W_VISUAL = 0.30;
    const W_SOURCE = 0.20;

    let baseScore = (factScore * W_FACT) + (visualScore * W_VISUAL) + (sourceScore * W_SOURCE);
    let reasons: Array<{ type: 'fact' | 'penalty' | 'bonus', text: string }> = [];

    // Apply local sentiment penalty (e.g., highly emotional or clickbait language)
    if (localSentimentScore > 50) {
        const penalty = Math.min(20, (localSentimentScore - 50) * 0.5);
        baseScore -= penalty;
        reasons.push({ type: 'penalty', text: `감정적/선동적 어휘 다수 감지 (-${penalty.toFixed(1)}점)` });
    }

    // Apply Source bonus/penalty
    if (sourceScore >= 80) {
        reasons.push({ type: 'bonus', text: '과거 허위 정보 이력이 없는 신뢰할 수 있는 채널 (+가산점 반영됨)' });
    } else if (sourceScore < 40) {
        reasons.push({ type: 'penalty', text: '과거 허위 정보 유포 이력이 의심되는 채널 (-감점 반영됨)' });
    }

    // Add general fact check reason based on score
    if (factScore > 80) {
        reasons.push({ type: 'fact', text: '대부분의 주장이 교차 검증된 사실과 일치함' });
    } else if (factScore > 50) {
        reasons.push({ type: 'fact', text: '일부 주장이 과장되었거나 검증되지 않음' });
    } else {
        reasons.push({ type: 'fact', text: '다수의 허위 사실 또는 심각한 논리적 비약 발견' });
    }

    // VETO LOGIC: If visual authenticity is very low (Deepfake likely)
    if (visualScore < 30) {
        baseScore = Math.min(baseScore, 20); // Clamp to max 20%
        reasons = [{ type: 'penalty', text: '🚨 딥페이크 또는 시각적 조작의 가능성이 매우 높음 (Veto 적용: 최대 20점 제한)' }, ...reasons];
    }

    // Ensure score is within 0-100 limits
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

    // Generate conclusion text
    let conclusion = "";
    if (finalScore >= 80) conclusion = "신뢰도가 높은 영상입니다. 교차 검증 결과 대부분 사실에 부합합니다.";
    else if (finalScore >= 50) conclusion = "영상의 주장은 일부 사실이나, 주의가 필요한 정보가 섞여 있습니다.";
    else if (finalScore >= 30) conclusion = "선동적인 내용이나 검증되지 않은 정보가 다수 포함되어 주의가 필요합니다.";
    else conclusion = "허위 정보 또는 조작된 영상일 확률이 매우 높습니다. 맹신하지 마세요.";

    return {
        factScore,
        visualScore,
        sourceScore,
        overallScore: finalScore,
        conclusion,
        reasons
    };
}
