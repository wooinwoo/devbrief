// Worker에서 PrismaService는 타입 자리만 차지한다. 실제 client는 api.ts가 요청마다 주입한다.
export class PrismaService {}
