/**
 * Mamma App Version & Release Notes
 */
export const APP_VERSION = 'v2.4.0';

export const RELEASE_NOTES = {
    version: APP_VERSION,
    date: '2026. 08. 08',
    title: 'Mamma 업데이트 안내',
    items: [
        {
            type: 'new',
            tag: '신규',
            title: '미니다이닝 탭 추가',
            desc: '요리 사진, 메뉴판, 레시피(텍스트/PDF)를 보관하고 언제든 쉽게 찾아볼 수 있습니다.'
        },
        {
            type: 'enhancement',
            tag: '개선',
            title: '사진 초경량 스마트 자동 압축',
            desc: '카메라 사진을 등록해도 자동으로 30~45KB로 압축되어 파이어베이스 1MB 용량 걱정 없이 빠르게 동기화됩니다.'
        },
        {
            type: 'enhancement',
            tag: '개선',
            title: '앱 재설치 없는 무중단 자동 업데이트',
            desc: '더 이상 앱을 삭제하고 다시 깔 필요 없이, 새 버전이 배포되면 자동으로 감지하고 적용됩니다.'
        },
        {
            type: 'new',
            tag: '신규',
            title: '업데이트 내역 알림 & 확인 기능',
            desc: '새로운 기능이 업데이트되면 첫 시작 시 안내창이 뜨며, 사이드바 하단 버전명을 눌러 언제든 다시 확인할 수 있습니다.'
        }
    ]
};
