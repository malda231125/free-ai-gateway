import { Injectable } from '@nestjs/common';
import { AiProvider, PROVIDERS } from './providers.config';
import { KeyPoolService, PooledKey } from './key-pool.service';
import { UsageStoreService } from './usage-store.service';

export interface LimitCheck {
  allowed: boolean;
  reason?: 'rpm' | 'rpd' | 'cooldown' | 'no-key';
  retryAfterSeconds?: number;
  usage: { rpm: string; rpd: string; keys: number; cooling: number };
}

/**
 * 프로바이더×키 단위로 분당/일간 사용량을 추적해 무료 한도 초과 전에 차단한다.
 * 카운트는 UsageStore(SQLite) 기록 기반이라 재시작 후에도 유지되고,
 * 키 풀을 쓰면 전체 한도가 키 수만큼 늘어난다.
 */
@Injectable()
export class RateLimiterService {
  constructor(
    private readonly usageStore: UsageStoreService,
    private readonly keyPool: KeyPoolService,
  ) {}

  /** 사용 가능한(쿨다운 아님 + 한도 잔여) 키가 하나라도 있는지 */
  check(provider: AiProvider): LimitCheck {
    const limits = PROVIDERS[provider].limits;
    const totalKeys = this.keyPool.keyCount(provider);
    const cooling = this.keyPool.coolingCount(provider);
    const now = Date.now();
    const rpmTotal = this.usageStore.countProviderSince(provider, now - 60_000);
    const rpdTotal = this.usageStore.countProviderSince(provider, now - 86_400_000);
    const usage = {
      rpm: `${rpmTotal}/${limits.rpm * Math.max(totalKeys, 1)}`,
      rpd: `${rpdTotal}/${limits.rpd * Math.max(totalKeys, 1)}`,
      keys: totalKeys,
      cooling,
    };
    if (!totalKeys) return { allowed: false, reason: 'no-key', usage };
    if (this.pickKeyIndex(provider) !== null) return { allowed: true, usage };
    if (cooling >= totalKeys) return { allowed: false, reason: 'cooldown', retryAfterSeconds: 60, usage };
    const reason = rpmTotal >= limits.rpm * totalKeys ? 'rpm' : 'rpd';
    return { allowed: false, reason, retryAfterSeconds: reason === 'rpm' ? 60 : 3600, usage };
  }

  /** 한도가 남은 키를 골라 반환. 없으면 null. */
  pickKey(provider: AiProvider): PooledKey | null {
    const idx = this.pickKeyIndex(provider);
    return idx === null ? null : this.keyPool.pick(provider, idx);
  }

  private pickKeyIndex(provider: AiProvider): number | null {
    const limits = PROVIDERS[provider].limits;
    const now = Date.now();
    for (const idx of this.keyPool.availableIndexes(provider)) {
      const rpm = this.usageStore.countSince(provider, idx, now - 60_000);
      if (rpm >= limits.rpm) continue;
      const rpd = this.usageStore.countSince(provider, idx, now - 86_400_000);
      if (rpd >= limits.rpd) continue;
      return idx;
    }
    return null;
  }

  snapshot() {
    const out: Record<string, LimitCheck['usage']> = {};
    for (const provider of Object.values(AiProvider)) {
      out[provider] = this.check(provider).usage;
    }
    return out;
  }
}
