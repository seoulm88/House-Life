/**
 * Mamma AI Service - Gemini Integration
 */

const GEMINI_API_KEY = "AIzaSyAtXMulLUMQEpvbO7XR36oG1t2Z5H5Dx6U";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function analyzeDiet(recentLogs, recipesInfo) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API Key is missing.");
    }

    const prompt = `
당신은 전문 영양사이자 헬스케어 어드바이저입니다.
사용자의 최근 7일간의 식단 기록을 분석하여 다음 사항들을 친근하고 전문적인 어조로 평가해주세요.
가급적 마크다운 포맷팅(볼드체, 하이픈 등)을 사용하여 깔끔하게 정리해주세요.

1. 식단의 전반적인 영양소 밸런스와 평가
2. 현재 식단에서 부족하거나 채워야 할 영양소와 추천 식재료
3. 비용 효율성 및 개선점
4. 종합적인 한줄 평

[최근 식단 데이터]
${JSON.stringify(recentLogs, null, 2)}

[레시피 및 식재료 정보]
${JSON.stringify(recipesInfo, null, 2)}
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Request failed: ${errorText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("AI Analysis Error:", error);
        throw error;
    }
}

async function analyzeFishing(fishingLogs) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API Key is missing.");
    }

    const prompt = `
당신은 전문 낚시 가이드이자 데이터 분석가입니다.
사용자의 낚시 기록 데이터를 분석하여 다음 사항들을 친근하고 전문적인 어조로 피드백해주세요.
가급적 마크다운 포맷팅(볼드체, 하이픈 등)을 사용하여 깔끔하게 정리해주세요.

1. 포인트별 조과 분석 및 특징 (어느 포인트에서 어떤 어종이 주로 잘 잡히는지)
2. 물때(tide), 시간대, 날씨 등 환경 조건에 따른 패턴 분석 및 최적의 낚시 타이밍 추천
3. 조과를 개선하기 위한 기술적 조언 (예: 채비, 미끼 추천, 공략 수심 등)
4. 종합적인 한줄 평 및 다음 출조 추천 (추천 포인트, 대상 어종 및 타이밍 제시)

[낚시 기록 데이터]
${JSON.stringify(fishingLogs, null, 2)}
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Request failed: ${errorText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("AI Fishing Analysis Error:", error);
        throw error;
    }
}

window.MammaAI = { analyzeDiet, analyzeFishing };
export const MammaAI = window.MammaAI;
