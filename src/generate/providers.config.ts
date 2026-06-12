export enum AiProvider {
  GOOGLE = 'GOOGLE',
  GROQ = 'GROQ',
  CEREBRAS = 'CEREBRAS',
  MISTRAL = 'MISTRAL',
  NVIDIA = 'NVIDIA',
  OPENROUTER = 'OPENROUTER',
  GITHUB = 'GITHUB',
}

export interface ProviderConfig {
  /** OpenAI 호환 chat/completions 베이스 URL */
  baseUrl: string;
  /** API 키를 읽을 환경변수 이름 */
  apiKeyEnv: string;
  /** model 미지정 시 사용할 무료 등급 기본 모델 */
  defaultModel: string;
  /** 게이트웨이 자체 한도(보수적 추정치). 실제 한도는 각 서비스 문서 기준. */
  limits: { rpm: number; rpd: number };
  /** 키 발급 안내 URL */
  signupUrl: string;
  /** 요청에 추가로 필요한 헤더 */
  extraHeaders?: Record<string, string>;
}

export const PROVIDERS: Record<AiProvider, ProviderConfig> = {
  [AiProvider.GOOGLE]: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    defaultModel: 'gemini-3.5-flash',
    limits: { rpm: 10, rpd: 1500 },
    signupUrl: 'https://aistudio.google.com/apikey',
  },
  [AiProvider.GROQ]: {
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    limits: { rpm: 30, rpd: 1000 },
    signupUrl: 'https://console.groq.com/keys',
  },
  [AiProvider.CEREBRAS]: {
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    defaultModel: 'llama-3.3-70b',
    limits: { rpm: 30, rpd: 1000 },
    signupUrl: 'https://cloud.cerebras.ai',
  },
  [AiProvider.MISTRAL]: {
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
    limits: { rpm: 2, rpd: 1000 },
    signupUrl: 'https://console.mistral.ai/api-keys',
  },
  [AiProvider.NVIDIA]: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_API_KEY',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    limits: { rpm: 40, rpd: 5000 },
    signupUrl: 'https://build.nvidia.com',
  },
  [AiProvider.OPENROUTER]: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    limits: { rpm: 20, rpd: 50 },
    signupUrl: 'https://openrouter.ai/settings/keys',
  },
  [AiProvider.GITHUB]: {
    baseUrl: 'https://models.github.ai/inference',
    apiKeyEnv: 'GITHUB_TOKEN',
    defaultModel: 'openai/gpt-4o-mini',
    limits: { rpm: 15, rpd: 150 },
    signupUrl: 'https://github.com/settings/tokens',
  },
};

export const DEFAULT_PROVIDER = AiProvider.GOOGLE;
