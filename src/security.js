import crypto from 'node:crypto';

const b64 = value => Buffer.from(value).toString('base64url');
const safeEqual = (a, b) => {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function issueToken(secret, origin, ttl = 300) {
  const payload = b64(JSON.stringify({origin, exp: Math.floor(Date.now()/1000)+ttl, nonce: crypto.randomUUID()}));
  const signature = b64(crypto.createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${signature}`;
}

export function verifyToken(secret, token, origin) {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = b64(crypto.createHmac('sha256', secret).update(payload).digest());
  if (!safeEqual(signature, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url'));
    return value.origin === origin && value.exp >= Math.floor(Date.now()/1000);
  } catch { return false; }
}

export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
