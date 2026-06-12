import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, PROVIDERS } from './providers.config';

/** AI 라우터가 후보 중 적합 모델을 추천. 실패 시 null을 반환하고 호출부가 정적 우선순위로 폴백한다. */
@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  /** 추천 호출에 쓰는 빠른 모델 (본 호출보다 가볍게) */
  static readonly ROUTER_MODEL = 'gemini-2.5-flash-lite';

  async recommend(prompt: string, candidates: AiProvider[]): Promise<{ provider: AiProvider; reason: string } | null> {
    const apiKey = process.env[PROVIDERS[AiProvider.GOOGLE].apiKeyEnv];
    if (!apiKey || candidates.length < 2) return null;

    const catalog = candidates
      .map((p) => `- ${p}: ${PROVIDERS[p].defaultModel} — ${PROVIDERS[p].description}`)
      .join('\n');
    const routerPrompt = [
      '너는 AI 모델 라우터다. 아래 후보 중 사용자 요청을 처리하기에 가장 적합한 프로바이더 하나를 골라라.',
      '속도가 중요한 짧은 작업은 빠른 모델, 복잡한 추론·번역·긴 글은 품질 좋은 모델을 골라라.',
      '반드시 JSON 한 줄로만 답하라: {"provider":"<후보 중 하나>","reason":"<한 문장 한국어 이유>"}',
      '',
      '[후보]',
      catalog,
      '',
      '[사용자 요청 (일부일 수 있음)]',
      prompt.slice(0, 2000),
    ].join('\n');

    try {
      const res = await fetch(`${PROVIDERS[AiProvider.GOOGLE].baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: ModelRouterService.ROUTER_MODEL,
          messages: [{ role: 'user', content: routerPrompt }],
          temperature: 0,
        }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      const text: string = body.choices?.[0]?.message?.content ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      const provider = String(parsed.provider || '').toUpperCase() as AiProvider;
      if (!candidates.includes(provider)) return null;
      return { provider, reason: String(parsed.reason || '') };
    } catch (error) {
      this.logger.warn(`router recommendation failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }
}
