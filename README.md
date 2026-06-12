# Free AI Gateway

무료로 제공되는 AI API들을 **하나의 엔드포인트**로 묶어주는 NestJS 게이트웨이입니다.
프롬프트 하나만 보내면 되고, 원하는 서비스를 enum으로 골라 쓸 수 있습니다. 따로 지정하지 않으면 Google Gemini를 사용합니다.

```bash
curl -X POST http://localhost:3000/v1/generate \
  -H 'content-type: application/json' \
  -d '{"prompt": "안녕을 영어로 번역해줘"}'
```

```bash
# 프로바이더 지정
curl -X POST http://localhost:3000/v1/generate \
  -H 'content-type: application/json' \
  -d '{"prompt": "안녕을 영어로 번역해줘", "provider": "GROQ"}'
```

응답 예시:

```json
{
  "provider": "GOOGLE",
  "model": "gemini-3.5-flash",
  "text": "Hello",
  "usage": { "prompt_tokens": 12, "completion_tokens": 2 },
  "latencyMs": 820,
  "gatewayUsage": { "rpm": "1/10", "rpd": "1/1500" }
}
```

## 지원 서비스 및 무료 한도

모두 **카드 등록 없이** 키를 발급받을 수 있습니다. 아래 한도는 2026년 6월 기준 추정치이며, 정확한 최신 한도는 각 서비스 문서를 확인하세요.

| Provider (enum) | 서비스 | 무료 한도 (대략) | 기본 모델 | 키 발급 |
|---|---|---|---|---|
| `GOOGLE` (기본값) | [Google AI Studio](https://aistudio.google.com) | Flash 계열 일 1,500요청, 100만 토큰 컨텍스트, 멀티모달 | `gemini-3.5-flash` | [발급](https://aistudio.google.com/apikey) |
| `GROQ` | [Groq](https://groq.com) | Llama 70B 분당 30회 / 일 1,000회, 초고속 추론 | `llama-3.3-70b-versatile` | [발급](https://console.groq.com/keys) |
| `CEREBRAS` | [Cerebras](https://cloud.cerebras.ai) | 일 100만 토큰, 초당 2,000토큰(업계 최속) | `llama-3.3-70b` | [발급](https://cloud.cerebras.ai) |
| `MISTRAL` | [Mistral La Plateforme](https://mistral.ai) | 월 10억 토큰 (분당 2회로 느림 — 배치용) | `mistral-small-latest` | [발급](https://console.mistral.ai/api-keys) |
| `NVIDIA` | [NVIDIA Build (NIM)](https://build.nvidia.com) | 가입 시 1,000크레딧(신청 시 최대 5,000), 분당 40회, 대형 오픈모델 다수 | `meta/llama-3.3-70b-instruct` | [발급](https://build.nvidia.com) |
| `OPENROUTER` | [OpenRouter](https://openrouter.ai) | `:free` 모델 일 50회 (잔액 $10 보유 시 일 1,000회) | `meta-llama/llama-3.3-70b-instruct:free` | [발급](https://openrouter.ai/settings/keys) |
| `GITHUB` | [GitHub Models](https://github.com/marketplace/models) | GitHub 계정만으로 GPT-4o-mini 등 100+ 모델 (등급별 일일 한도) | `openai/gpt-4o-mini` | [PAT 발급](https://github.com/settings/tokens) |

### 어떤 걸 골라야 하나

- **품질/일반 용도**: `GOOGLE` — 무료 중 가장 강한 프론티어 모델, 한도도 넉넉
- **속도가 생명**: `GROQ` 또는 `CEREBRAS` — 오픈모델을 전용 하드웨어로 초고속 서빙
- **대량 배치 작업**: `MISTRAL` — 월 10억 토큰이지만 분당 2회 제한
- **대형 오픈모델 실험**: `NVIDIA` — DeepSeek-R1 671B급 모델도 무료 크레딧으로
- **키 발급이 귀찮을 때**: `GITHUB` — 이미 있는 GitHub 토큰으로 바로 사용

## 실행 방법

```bash
npm install
cp .env.example .env   # 사용할 프로바이더의 키만 채우면 됩니다
npm run build
npm start              # http://localhost:3000
```

Swagger 문서: `http://localhost:3000/docs`

환경변수는 `.env.example` 참고. **사용할 프로바이더의 키만 설정하면 됩니다.**
키가 없는 프로바이더를 호출하면 503과 함께 발급 안내 URL을 돌려줍니다.

> dotenv를 따로 안 쓰므로 `.env`는 셸에서 로드하거나(`export $(cat .env | xargs)`),
> 배포 플랫폼(Render, Cloud Run 등)의 환경변수 설정을 사용하세요.

## API

### `POST /v1/generate`

| 필드 | 필수 | 설명 |
|---|---|---|
| `prompt` | O | 모델에 전달할 프롬프트 |
| `provider` | X | `GOOGLE` `GROQ` `CEREBRAS` `MISTRAL` `NVIDIA` `OPENROUTER` `GITHUB` (기본 `GOOGLE`) |
| `model` | X | 프로바이더 기본 모델 대신 사용할 모델 ID |

### `GET /v1/providers`

프로바이더별 키 설정 여부, 게이트웨이 한도, 현재 사용량을 반환합니다.

### `GET /health`

헬스체크.

## 내장 한도 관리

게이트웨이가 프로바이더별 **분당/일간 요청 수를 자체 카운트**해서, 무료 한도를 넘기 전에 429로 차단하고 재시도 가능 시각을 알려줍니다. 카운터는 인메모리라 재시작 시 초기화됩니다(개인/소규모 사용 전제). 한도 값은 [`src/generate/providers.config.ts`](src/generate/providers.config.ts)에서 조정할 수 있습니다.

## 동작 원리

7개 서비스 모두 OpenAI 호환 `chat/completions` 엔드포인트를 제공하기 때문에, 어댑터 하나로 통합됩니다. 프로바이더별로 베이스 URL / 키 / 기본 모델만 다릅니다.

## License

MIT
