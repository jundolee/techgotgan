"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./article-graph-view.module.css";
import { trackArticleGraphInteraction } from "@/lib/analytics";

export interface ArticleGraphNode {
  id: string;
  title: string;
  sourceTitle: string | null;
  kind: "current" | "semantic" | "topic" | "unscored" | "related";
  similarityScore?: number | null;
  detailHref: string;
}

export interface ArticleGraphEdge {
  from: string;
  to: string;
  kind: "semantic" | "topic" | "unscored" | "related";
  insight?: ArticleConnectionInsight | null;
}

export interface ArticleConnectionInsight {
  relation: "shared_problem" | "shared_approach" | "complementary" | "contrast" | "insufficient_evidence";
  explanation: string;
  currentEvidence: string | null;
  relatedEvidence: string | null;
  currentEvidenceSource: "title" | "excerpt";
  relatedEvidenceSource: "title" | "excerpt";
}

interface Position { x: number; y: number; angle: number; }

function shortLabel(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function nodeColor(kind: ArticleGraphNode["kind"]): string {
  if (kind === "current") return "#e38b54";
  if (kind === "semantic") return "#8bb7a1";
  if (kind === "topic") return "#8da4bf";
  if (kind === "unscored") return "#c4a36e";
  return "#9a9da9";
}

function relationLabel(relation: ArticleConnectionInsight["relation"]): string {
  const labels: Record<ArticleConnectionInsight["relation"], string> = {
    shared_problem: "같은 문제를 다뤄요",
    shared_approach: "비슷한 방식으로 풀었어요",
    complementary: "서로 보완되는 글이에요",
    contrast: "다른 해결 방식을 비교해요",
    insufficient_evidence: "직접 연결은 확인되지 않았어요",
  };
  return labels[relation];
}

function commonSpecificTitleTerms(left: string, right: string): string[] {
  const broadTerms = new Set(["ai", "ml", "llm", "기술", "개발", "글", "방법", "사례"]);
  const terms = (value: string) => new Set(value.normalize("NFKC").toLocaleLowerCase().match(/[\p{Script=Hangul}]{2,}|[a-z0-9]{2,}/gu) ?? []);
  const leftTerms = terms(left);
  return [...terms(right)].filter((term) => leftTerms.has(term) && !broadTerms.has(term));
}

export function ArticleGraphView({ nodes: initialNodes, edges: initialEdges, expandedIds: initialExpandedIds, explanationsAvailable }: { nodes: ArticleGraphNode[]; edges: ArticleGraphEdge[]; expandedIds: string[]; explanationsAvailable: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 780, height: 540 });
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [expandedIds, setExpandedIds] = useState(() => new Set(initialExpandedIds));
  const [loadingIds, setLoadingIds] = useState(() => new Set<string>());
  const [loadMessage, setLoadMessage] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightMessage, setInsightMessage] = useState("");
  const [selectedId, setSelectedId] = useState(initialNodes[0]?.id ?? "");
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selected = nodeById.get(selectedId) ?? nodes[0];
  const selectedInsightEdge = edges.find((edge) => edge.to === selectedId) ?? edges.find((edge) => edge.from === selectedId);
  const selectedInsight = selectedInsightEdge?.insight ?? null;
  const insightSourceNode = selectedInsightEdge ? nodeById.get(selectedInsightEdge.from) : null;
  const titleOverlap = selectedInsight?.relation === "insufficient_evidence" && selectedInsight.currentEvidenceSource === "title" && selectedInsight.relatedEvidenceSource === "title" && insightSourceNode
    ? commonSpecificTitleTerms(insightSourceNode.title, selected.title)
    : [];
  const insightLabel = selectedInsight && titleOverlap.length >= 2 ? "제목에 공통 과업이 있어요" : selectedInsight && titleOverlap.length === 1 ? "넓은 주제가 겹쳐요" : selectedInsight ? relationLabel(selectedInsight.relation) : null;

  async function explainSelectedConnection() {
    if (!selectedInsightEdge || insightLoading) return;
    if (!explanationsAvailable) {
      setInsightMessage("지금은 연결 이유를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setInsightLoading(true);
    setInsightMessage("두 글을 비교해 보고 있어요…");
    try {
      const response = await fetch("/api/article-graph-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: selectedInsightEdge.from, relatedId: selectedInsightEdge.to }),
      });
      const result = await response.json() as { insight?: ArticleConnectionInsight | null; error?: string; rateLimited?: boolean };
      if (!response.ok) throw new Error(result.error ?? "연결 이유를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      if (!result.insight) {
        setInsightMessage(result.rateLimited ? "오늘은 연결 설명을 모두 사용했어요. 그래프에서 글은 계속 둘러볼 수 있어요." : "두 글의 소개만으로 연결 이유를 확인하기 어려워요.");
        return;
      }
      setEdges((current) => current.map((edge) => edge.from === selectedInsightEdge.from && edge.to === selectedInsightEdge.to ? { ...edge, insight: result.insight } : edge));
      setInsightMessage("");
      trackArticleGraphInteraction("insight_shown", { graph_size: nodes.length });
    } catch (error) {
      setInsightMessage(error instanceof Error ? error.message : "연결 이유를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setInsightLoading(false);
    }
  }

  const selectNode = useCallback(async (node: ArticleGraphNode) => {
    setSelectedId(node.id);
    trackArticleGraphInteraction("node_selected", { node_kind: node.kind, graph_size: nodes.length });
    if (expandedIds.has(node.id) || loadingIds.has(node.id)) return;
    setLoadingIds((current) => new Set(current).add(node.id));
    setLoadMessage(`“${node.title}”와 이어지는 글을 찾고 있어요…`);
    try {
      const response = await fetch(`/api/article-graph/${encodeURIComponent(node.id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`이 글과 이어지는 글을 불러오지 못했어요. 다시 눌러 주세요.`);
      const result = await response.json() as { nodes: ArticleGraphNode[]; edges: ArticleGraphEdge[] };
      const knownNodes = new Set(nodes.map((item) => item.id));
      const knownEdges = new Set(edges.map((edge) => `${edge.from}:${edge.to}`));
      const newNodeCount = result.nodes.filter((item) => !knownNodes.has(item.id)).length;
      const newEdgeCount = result.edges.filter((edge) => !knownEdges.has(`${edge.from}:${edge.to}`)).length;
      trackArticleGraphInteraction("neighbors_loaded", { node_kind: node.kind, graph_size: nodes.length + newNodeCount, added_nodes: newNodeCount, added_edges: newEdgeCount });
      setNodes((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        result.nodes.forEach((item) => byId.set(item.id, byId.has(item.id) ? { ...byId.get(item.id)!, ...item } : item));
        return [...byId.values()];
      });
      setEdges((current) => {
        const byPair = new Map(current.map((edge) => [`${edge.from}:${edge.to}`, edge]));
        result.edges.forEach((edge) => byPair.set(`${edge.from}:${edge.to}`, { ...edge, insight: byPair.get(`${edge.from}:${edge.to}`)?.insight ?? null }));
        return [...byPair.values()];
      });
      setExpandedIds((current) => new Set(current).add(node.id));
      setLoadMessage(newNodeCount || newEdgeCount ? `새 글 ${newNodeCount}편을 찾았어요.` : "새로 찾은 글이 없어요. 다른 점을 눌러 살펴보세요.");
    } catch (error) {
      setLoadMessage(error instanceof Error ? error.message : "이 글과 이어지는 글을 불러오지 못했어요.");
    } finally {
      setLoadingIds((current) => { const next = new Set(current); next.delete(node.id); return next; });
    }
  }, [edges, expandedIds, loadingIds, nodes]);

  const measure = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSize({ width: Math.max(320, rect.width), height: window.innerWidth <= 640 ? 430 : 560 });
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (canvasRef.current) observer.observe(canvasRef.current);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure]);

  const positions = useMemo(() => {
    const center = { x: size.width / 2, y: size.height / 2 };
    const adjacent = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      adjacent.set(edge.from, new Set([...(adjacent.get(edge.from) ?? []), edge.to]));
      adjacent.set(edge.to, new Set([...(adjacent.get(edge.to) ?? []), edge.from]));
    });
    const depth = new Map<string, number>([[selectedId, 0]]);
    const queue = [selectedId];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      for (const neighbor of adjacent.get(current) ?? []) {
        if (depth.has(neighbor)) continue;
        depth.set(neighbor, (depth.get(current) ?? 0) + 1);
        queue.push(neighbor);
      }
    }
    const map = new Map<string, Position>();
    map.set(selectedId, { ...center, angle: 0 });
    const rings = new Map<number, string[]>();
    depth.forEach((distance, id) => {
      if (distance === 0) return;
      rings.set(distance, [...(rings.get(distance) ?? []), id]);
    });
    rings.forEach((ids, distance) => {
      const radius = Math.min(size.width * 0.43, size.height * 0.46) * (distance === 1 ? 0.7 : 1);
      ids.forEach((id, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / ids.length;
        map.set(id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius, angle });
      });
    });
    return map;
  }, [edges, selectedId, size]);

  if (!selected) return null;

  return <section className={styles.explorer} aria-label="글 연결 그래프 탐색">
    <div className={styles.graphPane}>
      <div className={styles.graphTopline}><span>글 연결</span><span>글 {nodes.length}편 · 연결 {edges.length}개</span></div>
      <div className={styles.canvas} ref={canvasRef}>
        <svg className={styles.svg} viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={`현재 글 ${nodes.length}편과 연결 ${edges.length}개`}>
          <defs><radialGradient id="graphGlow"><stop offset="0" stopColor="#e38b54" stopOpacity=".2"/><stop offset="1" stopColor="#e38b54" stopOpacity="0"/></radialGradient></defs>
          {nodes[0] && <circle cx={size.width / 2} cy={size.height / 2} r={92} fill="url(#graphGlow)" aria-hidden="true"/>}
          {edges.map((edge) => {
            const start = positions.get(edge.from);
            const end = positions.get(edge.to);
            if (!start || !end) return null;
            const distance = Math.hypot(end.x - start.x, end.y - start.y);
            const curve = Math.min(34, distance * 0.14);
            const controlX = (start.x + end.x) / 2 + Math.sin(start.angle + Math.PI / 2) * curve;
            const controlY = (start.y + end.y) / 2 - Math.cos(start.angle + Math.PI / 2) * curve;
            return <path key={`${edge.from}-${edge.to}`} className={`${styles.edge} ${styles[`edge_${edge.kind}`]}`} d={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`} />;
          })}
          {nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const active = node.id === selectedId;
            const radius = node.kind === "current" ? 9 : active ? 8 : 6;
            return <g key={node.id} className={`${styles.graphNode} ${active ? styles.selected : ""}`} role="button" tabIndex={0} aria-pressed={active} aria-label={`${node.title}, 이어 읽을 글 보기`} onClick={() => selectNode(node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); } }}>
              <title>{node.title} · {node.sourceTitle ?? "출처 미상"}</title>
              <circle cx={position.x} cy={position.y} r={radius + 12} className={styles.hitArea} />
              {active && <circle cx={position.x} cy={position.y} r={radius + 5} className={styles.nodeHalo} />}
              <circle cx={position.x} cy={position.y} r={radius} fill={active ? "#f2c2a2" : nodeColor(node.kind)} className={styles.nodeDot} />
              <text x={position.x} y={position.y + radius + 20} textAnchor="middle" className={active ? styles.activeLabel : styles.label}>{shortLabel(node.title, nodes.length > 8 ? (size.width < 500 ? 9 : 15) : (size.width < 500 ? 17 : 25))}</text>
            </g>;
          })}
        </svg>
        <div className={styles.legend} aria-label="글 연결 표시">
          <span><i className={styles.legendCurrent} />지금 보는 글</span><span><i className={styles.legendSemantic} />내용이 비슷한 글</span><span><i className={styles.legendOther} />같은 주제 글</span><span><i className={styles.legendUnscored} />함께 볼 글</span>
        </div>
      </div>
    </div>
    <aside className={styles.inspector} aria-live="polite">
      <span className={styles.inspectorKicker}>{selectedId === nodes[0]?.id ? "지금 보고 있는 글" : "선택한 글"}</span>
      <p className={styles.source}>{selected.sourceTitle ?? "출처 미상"}</p>
      <h2>{selected.title}</h2>
      <p className={styles.relationship}>{selected.kind === "current" ? "주변의 점을 눌러 다른 글을 둘러보세요. 선택한 글을 중심으로 연결이 이어집니다." : selected.kind === "semantic" ? "글 제목과 소개 내용이 비슷해 추천됐어요. 같은 문제를 다룬다고 확정된 것은 아니에요." : selected.kind === "topic" ? "같은 주제나 기술 태그의 글이에요. 최근 글이 먼저 보일 수 있어요." : selected.kind === "unscored" ? "내용이 관련 있을 수 있어 추천됐어요. 자세한 비교는 제공되지 않습니다." : "함께 읽어볼 만한 글로 추천됐어요."}</p>
      {selectedInsight && <section className={styles.insight} aria-label="두 글의 연결 설명">
        <span>{insightLabel}</span>
        <p>{selectedInsight.explanation}</p>
        {selectedInsight.currentEvidence && <blockquote><b>{selectedInsight.currentEvidenceSource === "title" ? "현재 글 제목" : "현재 글 발췌"}</b><br />“{selectedInsight.currentEvidence}”</blockquote>}
        {selectedInsight.relatedEvidence && <blockquote><b>연결 글 {selectedInsight.relatedEvidenceSource === "title" ? "제목" : "발췌"}</b><br />“{selectedInsight.relatedEvidence}”</blockquote>}
        <small>{selectedInsight.currentEvidenceSource === "title" || selectedInsight.relatedEvidenceSource === "title" ? "제목에서 찾은 공통점이에요. 구체적인 해결 방법까지 같다는 뜻은 아니에요." : "두 글의 소개에서 확인한 문장을 근거로 설명했어요."}</small>
      </section>}
      {!selectedInsight && selectedInsightEdge && <button type="button" className={styles.primaryAction} disabled={insightLoading} onClick={() => void explainSelectedConnection()}>{insightLoading ? "글을 비교하고 있어요…" : "왜 함께 읽어볼까요?"}</button>}
      {insightMessage && <p className={styles.insightUnavailable} role="status">{insightMessage}</p>}
      <div className={styles.actions}>
        {!expandedIds.has(selected.id) && <button type="button" className={styles.primaryAction} disabled={loadingIds.has(selected.id)} onClick={() => void selectNode(selected)}>{loadingIds.has(selected.id) ? "이어 읽을 글을 찾고 있어요…" : "이어 읽을 글 더 보기"}</button>}
        <a className={styles.secondaryAction} href={selected.detailHref} onClick={() => trackArticleGraphInteraction("detail_opened", { node_kind: selected.kind, graph_size: nodes.length })}>글 상세 열기</a>
      </div>
      <p className={styles.liveStatus} aria-live="polite">{loadMessage}</p>
    </aside>
  </section>;
}
