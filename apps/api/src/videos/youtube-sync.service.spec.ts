import { parseIsoDuration } from './youtube-sync.service';

describe('parseIsoDuration', () => {
  it('PT0S → 0', () => {
    expect(parseIsoDuration('PT0S')).toBe(0);
  });

  it('PT42S → 42', () => {
    expect(parseIsoDuration('PT42S')).toBe(42);
  });

  it('PT5M → 300', () => {
    expect(parseIsoDuration('PT5M')).toBe(300);
  });

  it('PT42M18S → 2538', () => {
    expect(parseIsoDuration('PT42M18S')).toBe(2538);
  });

  it('PT1H → 3600', () => {
    expect(parseIsoDuration('PT1H')).toBe(3600);
  });

  it('PT1H2M3S → 3723', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
  });

  it('PT2H30M → 9000', () => {
    expect(parseIsoDuration('PT2H30M')).toBe(9000);
  });

  it('유효하지 않은 입력은 0', () => {
    expect(parseIsoDuration('INVALID')).toBe(0);
    expect(parseIsoDuration('')).toBe(0);
  });
});
