# LLM API Guide — 모델 무관 LLM 개발 가이드

> **어댑터 출처:** `.claude/skills/claude-api/SKILL.md` 기반, Claude/Anthropic 전용 참조 제거
> **대상:** OpenAI GPT, Anthropic Claude, Google Gemini, Mistral, Ollama 등 모든 LLM

---

## 어떤 서피스를 써야 할까?

> **단순하게 시작하라.** 필요를 충족하는 가장 단순한 계층부터. 대부분의 케이스는 단일 API 호출이나 워크플로우로 충분하다 — 오픈엔드 탐색이 진짜로 필요할 때만 에이전트를 선택하라.

| 사용 케이스 | 계층 | 권장 방식 | 이유 |
|------------|------|----------|------|
| 분류, 요약, 추출, Q&A | Single LLM call | **LLM API 직접** | 요청 1회, 응답 1회 |
| 배치 처리, 임베딩 | Single LLM call | **LLM API 직접** | 전용 엔드포인트 활용 |
| 코드 제어 멀티스텝 파이프라인 | Workflow | **LLM API + 툴 유즈** | 루프를 코드가 오케스트레이션 |
| 커스텀 툴이 있는 에이전트 | Agent | **LLM API + 툴 유즈** | 최대 유연성 |
| 파일/웹/터미널 접근이 필요한 에이전트 | Agent | **Agent SDK** | 내장 툴, 안전장치, MCP |

### 결정 트리

```
애플리케이션에 무엇이 필요한가?

1. 단일 LLM 호출 (분류, 요약, 추출, Q&A)
   └── LLM API — 요청 1회, 응답 1회

2. LLM이 파일 읽기/쓰기, 웹 검색, 셸 명령 실행이 필요한가?
   └── Yes → Agent SDK / Agent 프레임워크 (LangChain, AutoGen 등)

3. 워크플로우 (멀티스텝, 코드 오케스트레이션, 커스텀 툴)
   └── LLM API + 툴 유즈 — 루프를 직접 제어

4. 오픈엔드 에이전트 (모델이 경로를 스스로 결정, 커스텀 툴)
   └── LLM API 에이전틱 루프 (최대 유연성)
```

---

## SDK 선택

### Python

```python
# Anthropic Claude
pip install anthropic
from anthropic import Anthropic
client = Anthropic(api_key="...")

# OpenAI GPT / 호환 API
pip install openai
from openai import OpenAI
client = OpenAI(api_key="...")

# Google Gemini
pip install google-generativeai
import google.generativeai as genai
genai.configure(api_key="...")

# Ollama (로컬 모델)
pip install ollama
import ollama
```

### TypeScript / JavaScript

```typescript
// Anthropic Claude
npm install @anthropic-ai/sdk
import Anthropic from '@anthropic-ai/sdk';

// OpenAI GPT / 호환 API
npm install openai
import OpenAI from 'openai';

// Google Gemini
npm install @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';
```

---

## 모델 선택 가이드

| 제공사 | 고성능 모델 | 균형 모델 | 경량 모델 | 비고 |
|--------|-----------|---------|---------|------|
| Anthropic | Claude Opus 4.6 | Claude Sonnet 4.6 | Claude Haiku 4.5 | |
| OpenAI | GPT-4o | GPT-4o-mini | GPT-3.5-turbo | |
| Google | Gemini 1.5 Pro | Gemini 1.5 Flash | Gemini 1.5 Flash-8B | |
| Mistral | Mistral Large | Mistral Small | Mistral 7B | |
| Ollama | llama3.1:70b | llama3.1:8b | llama3.2:3b | 로컬 |

> **기본값:** 필요에 맞는 가장 경량 모델부터 시작. 품질이 부족할 때 업그레이드.

---

## 언어 감지 → SDK 선택

프로젝트 파일을 보고 언어를 감지한다:

- `*.py`, `requirements.txt`, `pyproject.toml` → **Python**
- `*.ts`, `*.tsx`, `package.json`, `tsconfig.json` → **TypeScript**
- `*.js`, `*.jsx` (ts 없음) → **TypeScript/JavaScript**
- `*.java`, `pom.xml`, `build.gradle` → **Java**
- `*.go`, `go.mod` → **Go**
- `*.rb`, `Gemfile` → **Ruby**

---

## Thinking / Reasoning 파라미터 비교

| 제공사/모델 | Thinking 파라미터 | 비고 |
|-----------|----------------|------|
| Anthropic Opus 4.6 / Sonnet 4.6 | `thinking: {type: "adaptive"}` | budget_tokens 사용 금지 (deprecated) |
| Anthropic 구형 모델 | `thinking: {type: "enabled", budget_tokens: N}` | max_tokens보다 작아야 함, 최소 1024 |
| OpenAI o1 / o3 / o4-mini | `reasoning_effort: "low"\|"medium"\|"high"` | |
| Google Gemini 2.0 Flash Thinking | 자동 활성화 (별도 파라미터 없음) | |
| Mistral | 현재 지원 없음 | 일반 프롬프트 엔지니어링 사용 |

---

## 아키텍처 계층

### 1. Single Call — 단일 API 호출

```python
# Anthropic
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "요약해줘: ..."}]
)
text = response.content[0].text

# OpenAI
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "요약해줘: ..."}]
)
text = response.choices[0].message.content
```

### 2. Workflow — 코드가 오케스트레이션

```python
# 멀티스텝: LLM → 툴 실행 → LLM
def run_workflow(user_input):
    # Step 1: LLM이 분석
    plan = call_llm(f"다음을 분석하라: {user_input}")

    # Step 2: 코드가 툴 실행
    data = fetch_data(plan.query)

    # Step 3: LLM이 결과 해석
    result = call_llm(f"데이터를 해석하라: {data}")
    return result
```

### 3. Tool Use / Function Calling

```python
# Anthropic
tools = [{
    "name": "search_web",
    "description": "웹을 검색합니다",
    "input_schema": {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"]
    }
}]

# OpenAI (동일 개념, 다른 스키마)
tools = [{
    "type": "function",
    "function": {
        "name": "search_web",
        "description": "웹을 검색합니다",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"]
        }
    }
}]
```

### 4. Streaming — 긴 출력/실시간 UI

```python
# Anthropic
with client.messages.stream(model=..., ...) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()

# OpenAI
stream = client.chat.completions.create(..., stream=True)
for chunk in stream:
    delta = chunk.choices[0].delta.content or ""
    print(delta, end="", flush=True)
```

---

## Structured Outputs (구조화 출력)

```python
# Anthropic — output_config 사용 (output_format은 deprecated)
response = client.messages.create(
    model="claude-opus-4-6",
    output_config={"format": {"type": "json_object"}},
    messages=[...]
)

# OpenAI — response_format 사용
response = client.chat.completions.create(
    model="gpt-4o",
    response_format={"type": "json_object"},
    messages=[...]
)
```

---

## 에러 처리

| HTTP 코드 | 원인 | 대응 |
|----------|------|------|
| 400 | 잘못된 요청 파라미터 | 요청 검토 |
| 401 | 인증 실패 | API 키 확인 |
| 429 | Rate limit | 지수 백오프 재시도 |
| 500 | 서버 에러 | 재시도 또는 지원 문의 |
| 529 | 과부하 | 지수 백오프 재시도 |

```python
import time

def call_with_retry(fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            return fn()
        except RateLimitError:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
```

---

## 흔한 실수

- **입력 잘리게 하지 말 것** — 콘텍스트 한도를 초과하면 자르지 말고 사용자에게 알릴 것
- **SDK 기능을 직접 재구현하지 말 것** — SDK의 스트리밍 헬퍼, 타입, 예외 클래스를 그대로 사용
- **툴 input은 항상 JSON 파싱** — `json.loads()` / `JSON.parse()` 사용, raw 문자열 매칭 금지
- **Anthropic: budget_tokens 사용 금지** — Opus 4.6, Sonnet 4.6에서 deprecated. `thinking: {type: "adaptive"}` 사용
- **Anthropic: 구형 `output_format` 사용 금지** — `output_config: {format: {...}}` 사용
- **모델 ID 추측 금지** — 항상 공식 문서나 API 응답에서 확인한 정확한 ID 사용

---

## FPOF 연계

FPOF 패션 하우스에서 LLM API를 사용하는 경우:
- `bridges/fpof-universal-map.md` → "AI 개발 연동" 섹션 참조
- 브랜드 기반 AI 응답이 필요하면 `presets/wacky-willy/` JSON을 시스템 프롬프트로 주입
