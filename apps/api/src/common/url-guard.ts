import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { BadRequestException } from '@nestjs/common';

/**
 * SSRF 가드 — 어드민이 넘긴 임의 URL 을 서버가 fetch 하기 전에 검증한다.
 *
 * 차단 대상:
 * - http/https 외 프로토콜 (file:, ftp:, gopher: 등)
 * - localhost / *.localhost
 * - 사설대역(10/8, 172.16/12, 192.168/16), 루프백(127/8, ::1),
 *   링크로컬·클라우드 메타데이터(169.254/16 — 169.254.169.254 포함, fe80::/10),
 *   CGNAT(100.64/10), unspecified(0.0.0.0, ::), IPv6 ULA(fc00::/7)
 * - 호스트명이 위 대역으로 DNS resolve 되는 경우 (resolve 후 전 주소 검사)
 *
 * 한계(주석으로 명시): DNS 리바인딩(TOCTOU)까지 완전 차단하려면 resolve 된 IP 로
 * 직접 접속하는 커스텀 agent 가 필요하다. 여기서는 검증 시점 resolve + 리다이렉트
 * 훅(sync 검사)으로 방어심층을 확보한다. 대상이 어드민 인증 뒤 엔드포인트라
 * 위협 모델상 이 수준이 비용 대비 적절하다.
 */

/** IPv4 문자열이 차단 대역인지 */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // 루프백
  if (a === 169 && b === 254) return true; // 링크로컬 + 클라우드 메타데이터(169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  return false;
}

/** IPv6 문자열이 차단 대역인지 (IPv4-mapped 는 내장 IPv4 로 재검사) */
function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true; // unspecified / 루프백
  // IPv4-mapped (::ffff:127.0.0.1 등) — 내장 IPv4 기준으로 판정
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isBlockedIpv4(mapped[1]);
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  ) {
    return true; // 링크로컬 fe80::/10
  }
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  return false;
}

/** IP 리터럴이 사설/루프백/링크로컬/메타데이터 등 차단 대역인지 */
export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true; // IP 형식이 아니면 여기서는 판단 불가 → 차단 취급 (호출부가 DNS 검사로 분기)
}

/**
 * 호스트명 단독(sync) 검사 — DNS 없이 판정 가능한 것만.
 * 리다이렉트 훅처럼 async 불가능한 곳에서 사용한다.
 */
export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase(); // IPv6 대괄호 제거
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isIP(host)) return isBlockedIp(host);
  return false;
}

/**
 * URL 을 파싱해 http/https + 공인 호스트만 통과시킨다.
 * 호스트명은 DNS resolve 후 모든 주소를 검사한다. 위반 시 BadRequestException.
 * 통과하면 파싱된 URL 을 반환한다.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('올바른 URL 형식이 아닙니다.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('http/https URL 만 허용됩니다.');
  }

  if (isBlockedHostname(url.hostname)) {
    throw new BadRequestException('내부망/사설 대역 URL 은 허용되지 않습니다.');
  }

  // IP 리터럴이 아니면 DNS resolve 후 전 주소 검사 (사설 IP 로 풀리는 도메인 차단)
  const bareHost = url.hostname.replace(/^\[|\]$/g, '');
  if (!isIP(bareHost)) {
    let addresses: Array<{ address: string }>;
    try {
      addresses = await lookup(bareHost, { all: true });
    } catch {
      throw new BadRequestException('호스트를 확인할 수 없습니다.');
    }
    if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
      throw new BadRequestException('내부망/사설 대역 URL 은 허용되지 않습니다.');
    }
  }

  return url;
}
