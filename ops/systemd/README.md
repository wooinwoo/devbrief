# pulse systemd 유저 서비스

WSL 재부팅 때마다 nohup 프로세스(API/웹)가 죽어 cron 수집이 끊기는 문제 해결용.
cockpit 과 같은 패턴 (systemd user service, 자동 재시작).

## 설치 (1회)

```bash
cp /home/rst010/projects/side/devbrief/ops/systemd/pulse-*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now pulse-api pulse-web
```

## 확인

```bash
systemctl --user status pulse-api pulse-web
```

## 주의

- API 코드 변경 후엔 `pnpm --filter api build && systemctl --user restart pulse-api`
- 기존 nohup으로 띄운 프로세스가 있으면 포트 충돌 — 먼저 kill 후 enable
