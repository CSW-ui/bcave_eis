# Skill: format-conversion

## 역할
문서 포맷 변환 전용 스킬. PDCA 단계와 무관한 온디맨드 유틸리티 작업을 수행한다.

## 입력
- 입력 파일 경로 (`--in`)
- 출력 파일 경로 (`--out`)

## 출력
- 변환된 파일 1개
- 변환 성공/실패 메시지

## 실행 절차
1. 입력 파일 존재 여부 확인
2. 출력 확장자 허용 여부 확인 (`pdf`, `docx`, `xlsx`, `pptx`)
3. `soffice --headless --convert-to ...` 실행
4. 산출 파일 경로 정리 및 결과 반환

## 실행 명령
```bash
./scripts/task-agent.sh format-converter --in <input> --out <output>
```

## 빠른 예시
```bash
./scripts/task-agent.sh format-converter --in sample.docx --out sample.pdf
./scripts/task-agent.sh format-converter --in slides.pptx --out slides.pdf
./scripts/task-agent.sh format-converter --in budget.xlsx --out budget.pdf
```

## 주의
- 변환 품질은 원본 문서 레이아웃과 폰트 환경에 영향받음
- 다른 계열 간 직접 변환(예: 스프레드시트 -> 워드)은 실패 가능
- 실패 시 먼저 `pdf`로 변환 후 필요 포맷으로 후처리하는 2단계 방식을 고려

