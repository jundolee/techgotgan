"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackSourceArticleClick, type SourceArticleSurface } from "@/lib/source-article-analytics";

export function SourceArticleLink({
  href,
  surface,
  children,
  className,
  style,
}: {
  href: string;
  surface: SourceArticleSurface;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={() => trackSourceArticleClick(href, surface)}
    >
      {children}
    </a>
  );
}
