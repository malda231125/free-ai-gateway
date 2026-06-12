import { BadGatewayException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GenerateDto } from './dto';
import { AiProvider, DEFAULT_PROVIDER, PROVIDERS } from './providers.config';
import { RateLimiterService } from './rate-limiter.service';

@Injectable()
export class GenerateService {
  constructor(private readonly rateLimiter: RateLimiterService) {}

  async generate(dto: GenerateDto) {
    const provider = dto.provider ?? DEFAULT_PROVIDER;
    const config = PROVIDERS[provider];
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new ServiceUnavailableException({
        message: `${provider} API 키가 설정되지 않았습니다. 환경변수 ${config.apiKeyEnv}를 설정하세요.`,
        signupUrl: config.signupUrl,
      });
    }

    const limit = this.rateLimiter.check(provider);
    if (!limit.allowed) {
      throw new HttpException(
        {
          message: `${provider} 무료 한도(${limit.reason === 'rpm' ? '분당' : '일간'} 요청 수) 도달. ${limit.retryAfterSeconds}초 후 재시도하세요.`,
          provider,
          usage: limit.usage,
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        429,
      );
    }

    const model = dto.model || config.defaultModel;
    const startedAt = Date.now();
    this.rateLimiter.consume(provider);

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...config.extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: dto.prompt }],
      }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      throw new BadGatewayException({
        message: `${provider} 호출 실패 (HTTP ${res.status})`,
        provider,
        model,
        upstream: bodyText.slice(0, 500),
      });
    }

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new BadGatewayException({ message: `${provider} 응답 파싱 실패`, upstream: bodyText.slice(0, 300) });
    }

    return {
      provider,
      model,
      text: body.choices?.[0]?.message?.content ?? '',
      usage: body.usage ?? null,
      latencyMs: Date.now() - startedAt,
      gatewayUsage: this.rateLimiter.check(provider).usage,
    };
  }

  providers() {
    const usage = this.rateLimiter.snapshot();
    return Object.entries(PROVIDERS).map(([name, c]) => ({
      provider: name,
      defaultModel: c.defaultModel,
      configured: Boolean(process.env[c.apiKeyEnv]),
      gatewayLimits: c.limits,
      gatewayUsage: usage[name],
      signupUrl: c.signupUrl,
    }));
  }
}
