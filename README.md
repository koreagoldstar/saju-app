# saju-app

Starter project structure for a Saju application.

## Folders

- src/app: app entry and runtime bootstrap
- src/core: core domain logic
- src/features: feature modules
- src/shared: shared constants/components
- src/utils: helper functions
- tests: test files
- docs: documentation

## Setup

1. Install Node.js
2. Run `npm install`
3. Run `npm start`


## Claude API 설정

- 환경변수 ANTHROPIC_API_KEY를 설정하면 사주 8자 데이터를 Claude로 보내 명리 풀이를 생성합니다.
- 미설정 또는 API 오류 시 서버는 기본 로컬 풀이 문구로 자동 대체(fallback)합니다.

## .env 설정

1. 프로젝트 루트의 `.env` 파일에 아래 값을 넣어주세요.

```env
ANTHROPIC_API_KEY=여기에_Claude_API_키
```

2. 서버 재시작 후 `/api/saju` 요청 시 Claude 풀이를 사용합니다.
3. 키가 없거나 호출 실패 시 fallback 풀이가 반환됩니다.

## Monitoring and Self-Healing

- Sentry backend monitoring is enabled when `SENTRY_DSN` is configured.
- See `docs/self-healing-workflow.md` for n8n/Make + Gemini + Kakao alert automation design.
