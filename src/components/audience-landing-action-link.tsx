"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackAudienceLandingAction } from "@/lib/analytics";

export function AudienceLandingActionLink({
  href,
  action,
  children,
  className,
  external = false,
}: {
  href: string;
  action: "planner_search" | "developer_topic" | "mcp_setup";
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const handleClick = () => trackAudienceLandingAction(action);

  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
