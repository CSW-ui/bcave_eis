# FPOF 상태 확인

`.fpof-state.json` 파일을 읽고 현재 시스템 상태를 요약해주세요:

1. **현재 시즌**: active_brand, current_season
2. **PDCA 단계**: current_phase, completion_pct
3. **Quality Gate**: QG1~QG4 상태
4. **최근 산출물**: 각 단계별 artifacts 목록
5. **작업 메모**: work_memory의 todo, context_notes

`workspace/` 폴더의 실제 파일도 확인하여 `.fpof-state.json`과 일치하는지 크로스체크하세요.

마지막으로 다음에 할 수 있는 작업을 추천해주세요.
