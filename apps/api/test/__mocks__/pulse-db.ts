// Jest stub. spec에서는 PrismaService를 통째로 useValue 모킹하므로
// PrismaClient의 실 메서드는 호출되지 않음. import만 통과시키면 됨.
export class PrismaClient {
  $connect(): Promise<void> {
    return Promise.resolve();
  }
  $disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
