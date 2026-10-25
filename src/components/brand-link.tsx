import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/app/seo";

export function BrandLink() {
  return (
    <Link
      href="/"
      aria-label={`${SITE_NAME} 홈`}
      style={{ display: "flex", alignItems: "center", lineHeight: 1 }}
    >
      <Image
        src="/brand-logo.svg"
        alt=""
        aria-hidden="true"
        width={127}
        height={28}
      />
    </Link>
  );
}
