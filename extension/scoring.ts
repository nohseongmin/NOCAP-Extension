export interface AnalysisResult {
    factScore: number;
    sourceScore: number;
    overallScore: number;
    conclusion: string;
    reasons: Array<{ type: 'fact' | 'penalty' | 'bonus', text: string }>;
}

/**
 * Calculates the overall credibility score based on the mathematical model.
 */
export function calculateCredibility(
    factScore: number,
    sourceScore: number,
    localSentimentScore: number
): AnalysisResult {
    // Revised weightings (Fact 70%, Source 30% - Visual removed)
    const W_FACT = 0.70;
    const W_SOURCE = 0.30;

    let baseScore = (factScore * W_FACT) + (sourceScore * W_SOURCE);
    let reasons: Array<{ type: 'fact' | 'penalty' | 'bonus', text: string }> = [];

    // Apply local sentiment penalty (if AI detected high emotional intensity)
    if (localSentimentScore > 50) {
        const penalty = Math.min(15, (localSentimentScore - 50) * 0.3);
        baseScore -= penalty;
        reasons.push({ type: 'penalty', text: `AI 감지: 감정적 표현 및 선동성 주의 (-${penalty.toFixed(1)}점)` });
    }

    // Apply Source bonus/penalty
    if (sourceScore >= 80) {
        reasons.push({ type: 'bonus', text: '신뢰할 수 있는 정보원 패턴 (+가산점)' });
    } else if (sourceScore < 40) {
        reasons.push({ type: 'penalty', text: '공신력이 낮거나 비과학적인 근거 보임 (-감점)' });
    }

    // Fact score description
    if (factScore > 80) {
        reasons.push({ type: 'fact', text: 'AI 분석 결과 주장의 논리성과 정합성이 높음' });
    } else if (factScore > 50) {
        reasons.push({ type: 'fact', text: '일부 주장이 객관적 사실과 다르거나 논리가 부족함' });
    } else {
        reasons.push({ type: 'fact', text: '비과학적, 음모론적 또는 허황된 주장 다수 발생' });
    }

    // Ensure score is within 0-100 limits
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

    // Generate conclusion text
    let conclusion = "";
    if (finalScore >= 80) conclusion = "신뢰도가 매우 높습니다. AI 분석 결과 논리적 일관성이 우수합니다.";
    else if (finalScore >= 50) conclusion = "정보가 섞여 있습니다. 일부 주장에 대해 비판적 수용이 필요합니다.";
    else if (finalScore >= 30) conclusion = "신뢰도가 낮습니다. 선동적이거나 비과학적인 주장이 포함되어 있습니다.";
    else conclusion = "허위 정보 또는 음모론일 가능성이 매우 높으므로 주의하십시오.";

    return {
        factScore,
        sourceScore,
        overallScore: finalScore,
        conclusion,
        reasons
    };
}
