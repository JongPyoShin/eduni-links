# OpenCodex 복구 프로세스 (Windows)

이 문서는 Docker 없이 Windows의 OpenCodex 프록시를 복구하고 모델 카탈로그를 갱신하는 절차입니다.

## 한 번에 복구

바탕화면의 `OpenCodex 복구` 바로가기를 실행합니다. 바로가기가 없다면 PowerShell에서 다음 명령을 순서대로 실행합니다.

```powershell
ocx service start
ocx ensure
```

복구 도구는 다음 순서로 동작합니다.

1. `ocx service start`로 Windows 백그라운드 서비스를 시작합니다.
2. `ocx ensure`로 이미 실행 중인 프록시도 모델 카탈로그, Codex 설정, 모델 캐시를 갱신합니다.
3. `http://127.0.0.1:10100/healthz`가 정상 응답할 때까지 기다립니다.
4. 라우팅 종류, 서비스 보호 상태, 재부팅 안전 상태를 출력합니다.

## 모델 업데이트 직후

모델을 바꾼 뒤에는 같은 `OpenCodex 복구` 바로가기를 한 번 실행합니다. `service start`만 실행하면 이미 실행 중인 프록시의 모델 목록이 그대로 남을 수 있으므로 `ocx ensure`까지 실행해야 합니다.

현재 열려 있는 Codex 세션이 이전 모델 목록을 메모리에 가지고 있으면 새 세션을 시작합니다. 실행 중인 작업을 끊기 위해 강제 app-server 재시작을 사용하지 않습니다.

## 상태 확인

```powershell
ocx status --json
ocx doctor --json
Invoke-RestMethod http://127.0.0.1:10100/healthz
```

정상 기준은 다음과 같습니다.

- 프록시 상태가 실행 중입니다.
- `healthz` 응답의 `status`가 `ok`입니다.
- 포트는 `10100`입니다.
- `ocx status --json`의 `startup.protection`이 `service`입니다.
- `ocx status --json`의 `startup.rebootSafe`가 `true`입니다.

## 재부팅과 모델 업데이트의 차이

Windows 재부팅은 `opencodex-proxy` 작업의 로그온 트리거가 처리합니다. 모델 업데이트는 로그온 이벤트가 아니므로 모델 카탈로그 동기화 명령인 `ocx ensure`가 별도로 필요합니다.

## 실패 시

`healthz`가 응답하지 않으면 다음 순서로 확인합니다.

```powershell
ocx service status
ocx status --json
ocx doctor --json
```

현재 서비스 로그는 다음 위치에 있습니다.

```text
%USERPROFILE%\.opencodex\service.log
```

`config.toml`의 `openai_base_url`을 수동으로 삭제하거나 순정 endpoint로 바꾸지 않습니다. 복구 도구와 `ocx ensure`가 기존 로컬 경유지를 유지하면서 필요한 설정을 갱신합니다.

## 순정 Codex로 롤백

OpenCodex를 거치지 않고 기존 Codex 설정으로 실행해야 할 때는 바탕화면의 `OpenCodex 순정 복구` 바로가기를 실행합니다. 이 바로가기는 다음 작업을 한 번에 수행합니다.

```powershell
ocx stop
```

`ocx stop`은 프록시와 자동 재시작 서비스를 멈추고 Codex 설정을 원래의 네이티브 라우팅으로 복원합니다. 진행 중인 요청이 있다면 먼저 완료될 때까지 기다린 뒤 롤백합니다. 중지 과정에서 요청이 끊길 수 있습니다. 바로가기는 롤백 뒤 `ocx status --json`을 확인하며, `proxy.running=false`, `startup.routingKind=native`, `startup.localRoutingDependency=false`, `startup.protection=none`이 아닐 경우 성공으로 처리하지 않습니다.

OpenCodex를 다시 사용하려면 기존 `OpenCodex 복구` 바로가기를 실행합니다. `ocx restore`만 실행하면 설정만 바뀌고 프록시가 계속 실행될 수 있으므로, 완전히 경유지를 끄려면 `ocx stop`을 사용합니다.
