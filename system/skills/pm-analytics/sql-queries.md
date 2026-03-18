---
type: skill
id: sql-queries
name: SQL 쿼리 생성 (SQL Query Generator)
agency: data-intelligence
role: 데이터 엔지니어 (Data Engineer)
phase: all
triggers:
  - SQL 쿼리 만들어줘
  - 데이터 추출
  - sql query
  - 매출 데이터 쿼리
  - 재고 조회 쿼리
presets: []
outputs:
  - "output/[시즌]/[phase]_sql-queries.md"
source: pm-skills/pm-data-analytics/sql-queries
---

# SQL 쿼리 생성

> 자연어 요청을 BigQuery/PostgreSQL/MySQL 최적화 SQL 쿼리로 변환합니다 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 매출, 재고, 고객 데이터를 추출하는 SQL 쿼리가 필요할 때
- 비즈니스 질문을 데이터 쿼리로 변환해야 할 때
- 기존 쿼리를 최적화하거나 새로운 리포트 쿼리를 작성할 때
- 모든 PDCA 단계에서 데이터 기반 의사결정을 지원할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리 브랜드의 매출/재고/고객 데이터베이스 쿼리에 활용합니다
- 패션 이커머스 주요 테이블: 주문(orders), 상품(products), 고객(customers), 재고(inventory), 채널(channels)
- 시즌 코드(26SS, 26FW 등), SKU 체계, 카테고리 구분 등 패션 도메인 지식이 반영됩니다
- BigQuery, PostgreSQL, MySQL 등 주요 SQL 방언을 지원합니다

## 사전 준비
1. `.fpof-state.json` → 현재 시즌 확인
2. 데이터베이스 스키마 파일(SQL, 문서, 다이어그램) 또는 테이블 구조 설명 준비
3. 추출하고자 하는 데이터와 조건 명확화
4. SQL 방언(BigQuery/PostgreSQL/MySQL) 확인

## 실행 절차

### Step 1: 데이터베이스 스키마 이해
테이블 구조와 관계를 파악합니다.
- 스키마 파일이 제공되면 읽고 분석
- 테이블명, 컬럼 정의, 데이터 타입, 관계 추출
- PK, FK, 인덱스 전략 식별
- 패션 도메인 특화 테이블 구조 확인 (시즌, 카테고리, SKU)

### Step 2: 요청 분석
필요한 데이터를 정확히 파악합니다.
- 추출할 데이터의 범위와 조건 확인
- SQL 방언 확인 (BigQuery, PostgreSQL, MySQL, Snowflake 등)
- 필터, 집계, 정렬 등 추가 요구사항 확인
- 패션 도메인 용어를 SQL 용어로 매핑

### Step 3: 최적화된 쿼리 생성
효율적인 SQL을 작성합니다.
- 데이터베이스 구조를 활용한 효율적 SQL 작성
- 복잡한 로직에 주석 포함
- 대용량 데이터셋 성능 고려
- 대안적 접근 방식 제시 (가능한 경우)

### Step 4: 설명 및 검증
쿼리 로직을 설명하고 검증 방법을 제안합니다.
- 쿼리 로직을 한국어로 설명
- 결과 검증 및 테스트 방법 제안
- 성능 최적화 팁 제공
- 필요 시 테스트 스크립트 또는 샘플 데이터 생성

### Step 5: 와키윌리 도메인 적용
패션 비즈니스 맥락을 반영합니다.
- 시즌 코드 필터링 (WHERE season = '26SS')
- 채널별 매출 집계 (자사몰, 무신사, 29CM 등)
- 카테고리별 분석 (UNI/WOMAN/용품)
- SKU 레벨 성과 분석
- 고객 세그먼트별 구매 패턴

## 산출물 포맷
```markdown
# SQL 쿼리: [쿼리 목적]

## 작성일: YYYY-MM-DD
## 작성자: 데이터 엔지니어 (Data Engineer)

## 요청 사항
- 비즈니스 질문:
- 대상 DB:
- SQL 방언:

## SQL 쿼리
\```sql
-- [쿼리 설명]
SELECT ...
FROM ...
WHERE ...
\```

## 쿼리 설명
- 로직:
- 주요 조인:
- 필터 조건:

## 성능 고려사항
- 예상 처리량:
- 인덱스 활용:
- 최적화 팁:

## 검증 방법
- 테스트 쿼리:
- 예상 결과:
```

## 완료 조건
- [ ] 요청에 맞는 정확한 SQL 쿼리 작성 완료
- [ ] 주석 및 로직 설명 포함
- [ ] 성능 고려사항 문서화
- [ ] 검증/테스트 방법 제안

## 체크리스트
- [ ] SQL 방언(BigQuery/PostgreSQL/MySQL)에 맞는 문법인가?
- [ ] 패션 도메인 용어(시즌, SKU, 카테고리)가 정확히 매핑되었는가?
- [ ] 대용량 데이터 처리 시 성능이 고려되었는가?
- [ ] 쿼리 결과의 비즈니스 의미가 명확한가?
- [ ] 재사용 가능한 형태로 작성되었는가?
