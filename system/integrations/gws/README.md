# FPOF × Google Workspace CLI 연동

> 기존 FPOF 시스템에 **영향 없이** Google Workspace와 연동하는 선택적 모듈입니다.

## 설치

```bash
# 1. gws CLI 설치 + 인증 (한 번만)
./integrations/gws/setup.sh

# 2. config.json 설정 (Google Sheet ID, Drive 폴더 ID 등)
vi integrations/gws/config.json
```

## config.json 설정 가이드

### Google Sheets ID 찾기
시트 URL에서 `/d/` 와 `/edit` 사이의 문자열이 ID입니다:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       이 부분이 spreadsheet ID
```

### Google Drive 폴더 ID 찾기
폴더 URL의 마지막 경로가 ID입니다:
```
https://drive.google.com/drive/folders/1dyUEebJaFnWa3Z4n0BFMVAXQ7mfUH11c
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       이 부분이 folder ID
```

### Google Calendar ID
- 기본 캘린더: `"primary"`
- 특정 캘린더: 캘린더 설정 → 캘린더 통합 → 캘린더 ID

## 스크립트 사용법

### 1. 주간 데이터 동기화 (Sheets → weekly/data/)
```bash
./integrations/gws/sync-weekly-data.sh          # 현재 주차
./integrations/gws/sync-weekly-data.sh w10       # 특정 주차
./integrations/gws/sync-weekly-data.sh --dry-run # 미리보기
```

### 2. 산출물 Drive 업로드
```bash
./integrations/gws/upload-artifacts.sh output/26SS/weekly/w10/deck_exec-report.pptx
./integrations/gws/upload-artifacts.sh output/26SS/weekly/w10/   # 폴더 전체
./integrations/gws/upload-artifacts.sh <file> --folder presentations
```

### 3. 리포트 이메일 발송
```bash
./integrations/gws/send-gmail-report.sh output/26SS/weekly/w10/review_board-summary_w10.md
./integrations/gws/send-gmail-report.sh <file> --to "team@bcave.co.kr"
./integrations/gws/send-gmail-report.sh <file> --type exec  # exec_report 수신자 그룹
```

### 4. PDCA 마일스톤 → Calendar
```bash
./integrations/gws/sync-calendar.sh              # 전체 PDCA + 프로젝트
./integrations/gws/sync-calendar.sh --phase plan  # Plan 단계만
./integrations/gws/sync-calendar.sh --dry-run
```

### 5. 회의록 → Google Docs
```bash
./integrations/gws/push-meeting-notes.sh output/26SS/weekly/w10/meeting_exec-review_2026-03-09.md
./integrations/gws/push-meeting-notes.sh <file> --dry-run
```

## 기존 FPOF 워크플로우와의 관계

```
기존 흐름 (변경 없음)                    gws 연동 (선택적 후처리)
─────────────────────                   ─────────────────────
엑셀 수동 업로드 → weekly/data/    ←──  sync-weekly-data.sh (자동화 대체)
산출물 로컬 저장                    ──→  upload-artifacts.sh (Drive 공유)
Teams webhook 발송                  +    send-gmail-report.sh (Gmail 보완)
.fpof-state.json 추적               ──→  sync-calendar.sh (시각화)
회의록 MD 저장                      ──→  push-meeting-notes.sh (Docs 협업)
```

- 기존 `scripts/` 폴더의 스크립트는 **일절 수정하지 않음**
- gws 스크립트는 모두 `integrations/gws/` 안에 격리
- config.json에 ID를 설정하지 않으면 해당 기능은 자동으로 건너뜀

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `gws: command not found` | `npm install -g @googleworkspace/cli` |
| 인증 만료 | `gws auth login` 재실행 |
| Sheet 읽기 실패 | Sheet ID 확인 + 해당 시트에 읽기 권한 있는지 확인 |
| Drive 업로드 실패 | 폴더 ID 확인 + 해당 폴더에 쓰기 권한 있는지 확인 |
| Gmail 발송 실패 | `gmail.recipients`에 수신자 설정 확인 |
