// 공개 읽기 API에서 쓰지 않는 서버 전용 라이브러리(bullmq, youtubei.js, cheerio, rss-parser 등)의 자리.
// import는 통과시키되, 실제로 호출되면 바로 알 수 있게 오류를 던진다.
function unavailable(): never {
  throw new Error("이 기능은 Worker 읽기 API에서 지원하지 않습니다.");
}

export class Queue {
  add = unavailable;
}
export class Worker {}
export class Job {}
export class Innertube {
  static create = unavailable;
}
export const load = unavailable;

export default class Unavailable {
  constructor() {
    unavailable();
  }
}

export class GoogleGenAI {
  constructor() {
    unavailable();
  }
}
