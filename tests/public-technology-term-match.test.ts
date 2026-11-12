import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesTechnologyTermText } from "../src/lib/data/public-hubs";

test("Spark hub keeps Apache Spark cases and excludes unrelated product names", () => {
  assert.equal(matchesTechnologyTermText("Spark Connect on Kubernetes", null, "spark"), true);
  assert.equal(matchesTechnologyTermText("Oozie/Sqoop에서 Airflow/Spark로", null, "spark"), true);
  assert.equal(matchesTechnologyTermText("메타 Muse Spark Open, 집에 슈퍼컴퓨터가 필요해지는 걸까요", "LLM 공개 소식", "spark"), false);
  assert.equal(matchesTechnologyTermText("Gemini Robotics 2, Gemini Spark 소식", "Google 개발자 제품 뉴스", "spark"), false);
  assert.equal(matchesTechnologyTermText("AI 실시간 추천 시스템을 위한 Flink 기반 스트림 조인", "기존 Spark 처리와 비교합니다", "spark"), false);
});

test("ambiguous technology names require the article title to identify the topic", () => {
  assert.equal(matchesTechnologyTermText("FE News 11월 소식", "Go, Swift 등 도구 소식", "go"), false);
  assert.equal(matchesTechnologyTermText("Go embed: 불필요한 메모리 사용 줄이기", null, "go"), true);
  assert.equal(matchesTechnologyTermText("FE News 10월 소식", "Swift 6 소식", "swift"), false);
  assert.equal(matchesTechnologyTermText("SwiftUI 도입기", null, "swift"), true);
  assert.equal(matchesTechnologyTermText("대출 조회 서비스 지정", "관련 AI 에이전트 기사를 소개합니다", "agent"), false);
  assert.equal(matchesTechnologyTermText("AI 에이전트 운영 최적화", null, "agent"), true);
  assert.equal(matchesTechnologyTermText("AI 테스트 자동화 도전기", "SQL 테스트도 수행", "sql"), false);
  assert.equal(matchesTechnologyTermText("LLM이 만든 SQL을 검증하기", null, "sql"), true);
});

test("clear excerpt matches still work for less ambiguous terms", () => {
  assert.equal(matchesTechnologyTermText("DaaS의 개념과 구조", "클라우드 서비스 운영 방식", "cloud"), true);
  assert.equal(matchesTechnologyTermText("POS 서버 현대화", "온프레미스에서 Cloud로 전환", "cloud"), true);
  assert.equal(matchesTechnologyTermText("30B 로컬 모델을 맥북에서 돌리기", "LLM 추론 최적화", "llm"), true);
});
