import { generateToken, hashToken } from './token.util';

describe('token.util', () => {
  it('generates a token whose hash matches hashToken(token)', () => {
    const { token, tokenHash } = generateToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  it('generates unique tokens on each call', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('hashToken is deterministic for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('hashToken never reveals the original token', () => {
    const { token, tokenHash } = generateToken();
    expect(tokenHash).not.toContain(token);
  });
});
