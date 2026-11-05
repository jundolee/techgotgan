"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { trackAudienceLandingAction } from "@/lib/analytics";

export function AudienceLandingActionLink({
  href,
  action,
  children,
  className,
  style,
  external = false,
}: {
  href: string;
  action:
    | "planner_search"
    | "planner_guide"
    | "planner_landing"
    | "developer_topic"
    | "mcp_setup"
    | "topic_hub_landing"
    | "home_entry"
    | "blog_directory_entry"
    | "explore_menu_entry";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  external?: boolean;
}) {
  const handleClick = () => trackAudienceLandingAction(action);

  if (external) {
    return (
      <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </Link>
  );
}
