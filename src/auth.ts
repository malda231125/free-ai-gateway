import { timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** DOCS_USER/DOCS_PASSWORD 설정 시 Swagger 경로를 Basic Auth로 보호 */
export function docsBasicAuth(user: string, password: string) {
  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  return (req: any, res: any, next: any) => {
    if (safeEqual(String(req.headers.authorization || ''), expected)) return next();
    res.set('WWW-Authenticate', 'Basic realm="docs"');
    res.status(401).send('Authentication required');
  };
}

/**
 * GATEWAY_API_KEY 설정 시 /v1/* 호출 인증.
 * x-api-key 헤더 또는 Authorization: Bearer (OpenAI SDK 호환) 둘 다 허용한다.
 */
export function apiKeyAuth(apiKey: string) {
  return (req: any, res: any, next: any) => {
    const headerKey = String(req.headers['x-api-key'] || '');
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (safeEqual(headerKey, apiKey) || safeEqual(bearer, apiKey)) return next();
    res.status(401).json({ message: '유효한 x-api-key 헤더 또는 Bearer 토큰이 필요합니다.', code: 'INVALID_API_KEY' });
  };
}
