import { Injectable } from '@nestjs/common';
import { AiProvider, PROVIDERS } from './providers.config';

export interface PooledKey {
  key: string;
  index: number;
}

/**
 * 프로바이더당 API 키 풀. 환경변수에 쉼표로 여러 키를 등록할 수 있다
 * (예: GROQ_API_KEY="key1,key2"). 업스트림 429를 받은 키는 일정 시간 쿨다운된다.
 */
@Injectable()
export class KeyPoolService {
  private readonly cooldowns = new Map<string, number>(); // `${provider}:${index}` → until(ms)
  private readonly rotation = new Map<AiProvider, number>();

  keys(provider: AiProvider): string[] {
    const raw = process.env[PROVIDERS[provider].apiKeyEnv] || '';
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
  }

  keyCount(provider: AiProvider): number {
    return this.keys(provider).length;
  }

  isCooling(provider: AiProvider, index: number): boolean {
    const until = this.cooldowns.get(`${provider}:${index}`) || 0;
    return until > Date.now();
  }

  /** 쿨다운 중이 아닌 키 인덱스 목록 (라운드로빈 순서로 회전) */
  availableIndexes(provider: AiProvider): number[] {
    const total = this.keyCount(provider);
    const start = this.rotation.get(provider) || 0;
    const indexes: number[] = [];
    for (let i = 0; i < total; i += 1) {
      const idx = (start + i) % total;
      if (!this.isCooling(provider, idx)) indexes.push(idx);
    }
    return indexes;
  }

  pick(provider: AiProvider, index: number): PooledKey | null {
    const keys = this.keys(provider);
    if (index < 0 || index >= keys.length) return null;
    this.rotation.set(provider, (index + 1) % keys.length);
    return { key: keys[index], index };
  }

  reportRateLimited(provider: AiProvider, index: number, seconds = 60) {
    this.cooldowns.set(`${provider}:${index}`, Date.now() + Math.max(5, seconds) * 1000);
  }

  coolingCount(provider: AiProvider): number {
    return this.keys(provider).filter((_, idx) => this.isCooling(provider, idx)).length;
  }
}
