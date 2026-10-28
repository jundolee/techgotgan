"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "@seed-design/react";
import { ArticleLink } from "@/components/article-link";
import type { ArticleConnectionInsight } from "@/components/article-graph-view";
import { trackArticleReadingPathInteraction } from "@/lib/analytics";
import styles from "./article-reading-path.module.css";

export interface ReadingPathArticle {
  id: string;
  title: string;
  sourceTitle: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  kind: "semantic" | "topic" | "unscored" | "related";
  detailHref: string;
}

function relationLabel(relation: ArticleConnectionInsight["relation"]): string {
  return ({
    shared_problem: "같은 문제를 다뤄요",
    shared_approach: "비슷한 방식으로 풀었어요",
    complementary: "서로 보완되는 글이에요",
    contrast: "다른 해결 방식을 비교해요",
    insufficient_evidence: "공통점을 더 확인해 보세요",
  })[relation];
}

function recommendationLabel(kind: ReadingPathArticle["kind"]): string {
  if (kind === "semantic") return "내용이 비슷해요";
  if (kind === "topic") return "같은 주제예요";
  if (kind === "unscored") return "함께 볼 만한 글이에요";
  return "관련 글이에요";
}

export function ArticleReadingPath({
  current,
  articles,
  explanationsAvailable,
}: {
  current: { id: string; title: string; sourceTitle: string | null; excerpt: string | null; detailHref: string };
  articles: ReadingPathArticle[];
  explanationsAvailable: boolean;
}) {
  const [insights, setInsights] = useState<Record<string, ArticleConnectionInsight>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function explain(article: ReadingPathArticle) {
    if (loadingId) return;
    if (!explanationsAvailable) {
      setMessages((old) => ({ ...old, [article.id]: "지금은 연결 이유를 불러올 수 없어요. 잠시 후 다시 시도해 주세요." }));
      return;
    }
    setLoadingId(article.id);
    setMessages((old) => ({ ...old, [article.id]: "두 글을 비교해 보고 있어요…" }));
    trackArticleReadingPathInteraction("why_requested", articles.length);
    try {
      const response = await fetch("/api/article-graph-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: current.id, relatedId: article.id }),
      });
      const result = await response.json() as { insight?: ArticleConnectionInsight | null; rateLimited?: boolean };
      if (!response.ok) throw new Error("연결 이유를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      if (!result.insight) {
        setMessages((old) => ({ ...old, [article.id]: result.rateLimited ? "오늘은 연결 설명을 모두 사용했어요. 글은 계속 둘러볼 수 있습니다." : "두 글의 소개만으로 공통점을 확인하기 어려워요." }));
        return;
      }
      setInsights((old) => ({ ...old, [article.id]: result.insight! }));
      setMessages((old) => ({ ...old, [article.id]: "" }));
      trackArticleReadingPathInteraction("insight_shown", articles.length);
    } catch (error) {
      setMessages((old) => ({ ...old, [article.id]: error instanceof Error ? error.message : "연결 이유를 불러오지 못했어요." }));
    } finally {
      setLoadingId(null);
    }
  }

  return <section className={styles.path} aria-labelledby="reading-path-heading">
    <header className={styles.pathHeading}>
      <div>
        <Text as="h2" id="reading-path-heading" textStyle="t6Bold" color="fg.neutral">이어서 읽어볼 글</Text>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
          현재 글과 내용이나 주제가 닿는 글이에요. 관심 가는 글부터 골라 읽어보세요.
        </Text>
      </div>
      <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">{articles.length}편</Text>
    </header>

    {articles.length === 0 ? <p className={styles.empty}>아직 이어서 추천할 글이 없어요. 다른 글을 읽어보세요.</p> : <ol className={styles.list}>
      {articles.map((article) => {
        const insight = insights[article.id];
        return <li className={styles.item} key={article.id}>
          <span className={styles.branch} aria-hidden="true" />
          <article className={styles.article}>
            <div className={styles.meta}>
              <span className={styles.badge}>{recommendationLabel(article.kind)}</span>
              <span>{article.sourceTitle ?? "출처 정보 없음"}</span>
              {article.publishedAt && <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(article.publishedAt))}</time>}
            </div>
            <ArticleLink articleId={article.id} articleTitle={article.title} href={article.detailHref} style={{ color: "inherit", textDecoration: "none" }} onRead={() => trackArticleReadingPathInteraction("related_article_opened", articles.length)}>
              <Text as="h3" textStyle="t5Bold" color="fg.neutral" style={{ lineHeight: 1.5 }}>{article.title}</Text>
              {article.excerpt && <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" className={styles.excerpt}>{article.excerpt}</Text>}
            </ArticleLink>
            <div className={styles.actions}>
              <ArticleLink articleId={article.id} articleTitle={article.title} href={article.detailHref} className={styles.readLink} onRead={() => trackArticleReadingPathInteraction("related_article_opened", articles.length)}>이 글 읽기 →</ArticleLink>
              {!insight && <ActionButton type="button" size="small" variant="neutralWeak" disabled={loadingId !== null} onClick={() => void explain(article)}>{loadingId === article.id ? "이유를 살펴보는 중…" : "왜 이어서 읽나요?"}</ActionButton>}
            </div>
            {insight && <div className={styles.insight} aria-live="polite">
              <strong>{relationLabel(insight.relation)}</strong>
              <p>{insight.explanation}</p>
              {insight.currentEvidence && <blockquote><b>현재 글 {insight.currentEvidenceSource === "title" ? "제목" : "소개"}</b> · “{insight.currentEvidence}”</blockquote>}
              {insight.relatedEvidence && <blockquote><b>추천 글 {insight.relatedEvidenceSource === "title" ? "제목" : "소개"}</b> · “{insight.relatedEvidence}”</blockquote>}
              <small>{insight.currentEvidenceSource === "title" || insight.relatedEvidenceSource === "title" ? "제목의 공통점만으로 구체적인 해결 과정까지 같다고 단정하지 않아요." : "각 글의 소개에서 확인한 문장을 근거로 설명했어요."}</small>
            </div>}
            {messages[article.id] && <p className={styles.message} role="status">{messages[article.id]}</p>}
          </article>
        </li>;
      })}
    </ol>}
    <ArticleLink articleId={current.id} articleTitle={current.title} href={current.detailHref} className={styles.returnLink}>현재 글로 돌아가기</ArticleLink>
  </section>;
}
