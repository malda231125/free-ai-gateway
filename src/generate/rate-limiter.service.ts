import { Injectable } from '@nestjs/common';
import { AiProvider, PROVIDERS } from './providers.config';

interface Window {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

export interface LimitCheck {
  allowed: boolean;
  reason?: 'rpm' | 'rpd';
  retryAfterSeconds?: number;
  usage: { rpm: string; rpd: string };
}

/**
 * 프로바이더별 인메모리 카운터로 무료 한도를 넘기 전에 게이트웨이 단에서 차단한다.
 * 인스턴스 재시작 시 카운터가 초기화되는 단순한 구조 — 1인/소규모 사용 전제.
 */
@Injectable()
export class RateLimiterService {
  private readonly windows = new Map<AiProvider, Window>();

  check(provider: AiProvider): LimitCheck {
    const limits = PROVIDERS[provider].limits;
    const now = Date.now();
    const w = this.windows.get(provider) ?? { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };

    if (now - w.minuteStart >= 60_000) { w.minuteStart = now; w.minuteCount = 0; }
    if (now - w.dayStart >= 86_400_000) { w.dayStart = now; w.dayCount = 0; }
    this.windows.set(provider, w);

    const usage = { rpm: `${w.minuteCount}/${limits.rpm}`, rpd: `${w.dayCount}/${limits.rpd}` };
    if (w.minuteCount >= limits.rpm) {
      return { allowed: false, reason: 'rpm', retryAfterSeconds: Math.ceil((w.minuteStart + 60_000 - now) / 1000), usage };
    }
    if (w.dayCount >= limits.rpd) {
      return { allowed: false, reason: 'rpd', retryAfterSeconds: Math.ceil((w.dayStart + 86_400_000 - now) / 1000), usage };
    }
    return { allowed: true, usage };
  }

  consume(provider: AiProvider) {
    const w = this.windows.get(provider);
    if (!w) return;
    w.minuteCount += 1;
    w.dayCount += 1;
  }

  snapshot() {
    const out: Record<string, { rpm: string; rpd: string }> = {};
    for (const provider of Object.values(AiProvider)) {
      out[provider] = this.check(provider).usage;
    }
    return out;
  }
}
