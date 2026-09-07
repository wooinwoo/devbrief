import { BadRequestException } from '@nestjs/common';

// DNS resolve 를 통제하기 위해 node:dns/promises 를 모킹한다 (네트워크 미사용).
jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

import { lookup } from 'node:dns/promises';
import { assertPublicHttpUrl, isBlockedHostname, isBlockedIp } from './url-guard';

const lookupMock = lookup as unknown as jest.Mock;

describe('isBlockedIp', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '169.254.169.254', // 클라우드 메타데이터
    '169.254.0.1',
    '100.64.0.1', // CGNAT
    '0.0.0.0',
    '::1',
    '::',
    '::ffff:127.0.0.1', // IPv4-mapped 루프백
    'fe80::1', // 링크로컬
    'fd00::1', // ULA
  ])('%s 는 차단', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '203.0.113.10', '172.32.0.1', '2606:4700::1111'])(
    '%s 는 공인 대역이라 허용',
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );
});

describe('isBlockedHostname', () => {
  it('localhost / *.localhost 차단', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('api.localhost')).toBe(true);
  });

  it('IP 리터럴은 대역 기준 판정 (IPv6 대괄호 포함)', () => {
    expect(isBlockedHostname('169.254.169.254')).toBe(true);
    expect(isBlockedHostname('[::1]')).toBe(true);
    expect(isBlockedHostname('8.8.8.8')).toBe(false);
  });

  it('일반 도메인은 sync 검사에서 통과 (DNS 검사는 assertPublicHttpUrl 몫)', () => {
    expect(isBlockedHostname('blog.example.com')).toBe(false);
  });
});

describe('assertPublicHttpUrl', () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it('http/https 외 프로토콜 거부 (file:, ftp:)', async () => {
    await expect(assertPublicHttpUrl('file:///etc/passwd')).rejects.toThrow(BadRequestException);
    await expect(assertPublicHttpUrl('ftp://example.com/x')).rejects.toThrow(BadRequestException);
  });

  it('URL 형식이 아니면 거부', async () => {
    await expect(assertPublicHttpUrl('not-a-url')).rejects.toThrow(BadRequestException);
  });

  it('메타데이터/사설/루프백 IP 리터럴 거부 (DNS 없이 즉시)', async () => {
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
      BadRequestException,
    );
    await expect(assertPublicHttpUrl('http://10.0.0.5:8080/admin')).rejects.toThrow(
      BadRequestException,
    );
    await expect(assertPublicHttpUrl('http://127.0.0.1/')).rejects.toThrow(BadRequestException);
    await expect(assertPublicHttpUrl('http://[::1]/')).rejects.toThrow(BadRequestException);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('localhost 거부', async () => {
    await expect(assertPublicHttpUrl('http://localhost:3000/')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('사설 IP 로 resolve 되는 도메인 거부 (DNS 리바인딩성 도메인)', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.7' }]);
    await expect(assertPublicHttpUrl('https://internal.example.com/feed')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('일부 주소만 사설이어도 거부 (전 주소 검사)', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8' }, { address: '169.254.169.254' }]);
    await expect(assertPublicHttpUrl('https://mixed.example.com/')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('DNS resolve 실패 시 거부', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertPublicHttpUrl('https://no-such-host.example/')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('공인 주소로 resolve 되는 정상 URL 은 파싱된 URL 반환', async () => {
    lookupMock.mockResolvedValue([{ address: '203.0.113.10' }]);
    const url = await assertPublicHttpUrl('https://blog.example.com/rss');
    expect(url.hostname).toBe('blog.example.com');
    expect(url.protocol).toBe('https:');
  });

  it('공인 IP 리터럴은 DNS 없이 허용', async () => {
    const url = await assertPublicHttpUrl('http://203.0.113.10/feed');
    expect(url.hostname).toBe('203.0.113.10');
    expect(lookupMock).not.toHaveBeenCalled();
  });
});
