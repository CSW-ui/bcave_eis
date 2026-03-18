---
type: skill
id: dummy-dataset
name: 더미 데이터셋 생성 (Data Engineer)
agency: data-intelligence
role: 데이터 엔지니어 (Data Engineer)
phase: all
triggers:
  - "더미 데이터 만들어줘"
  - "테스트 데이터 생성"
  - "generate data"
  - "매출 시뮬레이션 데이터"
presets:
  - categories.json
  - channels.json
outputs:
  - "output/[시즌]/_season/[phase]_dummy-dataset.md"
source: pm-skills/pm-execution/dummy-dataset
---

# 더미 데이터셋 생성

> 매출 시뮬레이션, 테스트 데이터 등 현실적인 더미 데이터를 CSV/JSON/SQL/Python 스크립트 포맷으로 생성 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 시즌 매출 시뮬레이션 데이터가 필요할 때
- 채널별/카테고리별 테스트 데이터 생성 시
- 분석 대시보드 프로토타입용 더미 데이터 필요 시
- 데이터 기반 의사결정 연습용 샘플 데이터 생성 시

## FPOF 컨텍스트
- `categories.json`의 유니/우먼스/용품 카테고리 구조를 데이터 스키마에 반영
- `channels.json`의 6개 채널(매출/목표/성장률)을 현실적인 데이터 분포에 활용
- 와키윌리 브랜드 특성(18~25세 타겟, IP 캐릭터, 시즌 주기)을 데이터 패턴에 반영

## 사전 준비
- `.fpof-state.json`에서 현재 시즌/단계 확인
- `categories.json`에서 상품 카테고리 구조 확인
- `channels.json`에서 채널별 매출/목표 확인
- 사용자가 요청하는 데이터 유형, 행 수, 컬럼, 포맷 파악

## 실행 절차

### Step 1: 데이터셋 유형 파악
데이터 도메인을 이해한다 (매출, 고객, 재고, 주문, 피드백 등).

### Step 2: 컬럼 스펙 정의
컬럼명, 데이터 타입, 값 범위를 정의한다.

### Step 3: 행 수 결정
필요한 샘플 레코드 수를 확인한다 (기본값: 100).

### Step 4: 출력 포맷 선택
CSV, JSON, SQL INSERT, Python 스크립트 중 선택한다.

### Step 5: 현실적 패턴 적용
데이터가 실제처럼 보이고 유효하도록 분포와 패턴을 적용한다.

### Step 6: 비즈니스 제약 조건 반영
비즈니스 로직과 관계를 준수한다.

### Step 7: 데이터 생성 또는 스크립트 작성
실행 가능한 결과물을 생성한다.

### Step 8: 와키윌리 적용 필터링
- 카테고리 분포가 `categories.json`의 상품 전략과 정합하는지 확인
- 채널별 매출 비중이 `channels.json`의 목표/성장률과 정합하는지 확인
- 시즌성(SS/FW) 패턴이 패션 업계 현실에 맞는지 점검

## Python 스크립트 템플릿
```python
import csv
import json
from datetime import datetime, timedelta
import random

# Configuration
ROWS = 100
FILENAME = "wacky_willy_sales.csv"

# 와키윌리 채널/카테고리 기반 설정
channels = ["자사몰", "무신사", "29CM", "W컨셉", "백화점", "글로벌"]
categories = ["UNI 상의", "UNI 하의", "WOMAN 원피스", "용품"]

def generate_dataset():
    """Generate realistic dummy dataset"""
    data = []
    for i in range(1, ROWS + 1):
        record = {
            "id": f"ORD{i:06d}",
            "channel": random.choice(channels),
            "category": random.choice(categories),
            # Generate values based on column definitions
        }
        data.append(record)
    return data

def save_as_csv(data, filename):
    """Save dataset as CSV"""
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

if __name__ == "__main__":
    dataset = generate_dataset()
    save_as_csv(dataset, FILENAME)
    print(f"Generated {len(dataset)} records in {FILENAME}")
```

## 산출물 포맷

**CSV:** 플랫 테이블 형식, 스프레드시트와 데이터베이스에 바로 임포트 가능

**JSON:** 중첩 구조, API와 NoSQL 데이터베이스에 적합

**SQL:** INSERT 문, 관계형 데이터베이스에 직접 실행 가능

**Python Script:** 대량 또는 커스텀 데이터셋을 위한 실행 가능한 생성기

## 완료 조건
- 요청한 포맷으로 실행 가능한 결과물 생성
- 컬럼 스펙과 제약 조건이 모두 반영됨
- 데이터 분포가 현실적이고 비즈니스 로직을 준수
- 데이터 생성 로직이 문서화됨

## 체크리스트
- [ ] 데이터 유형과 스키마가 요청 사항과 일치하는가?
- [ ] 카테고리/채널 분포가 `categories.json`/`channels.json`과 정합하는가?
- [ ] 데이터 값이 현실적인 범위 내에 있는가?
- [ ] 출력 포맷이 요청한 형식(CSV/JSON/SQL/Python)인가?
- [ ] 비즈니스 제약 조건이 모두 반영되었는가?
- [ ] 데이터 생성 로직이 문서화되었는가?
