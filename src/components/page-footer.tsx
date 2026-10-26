import Link from "next/link";
import { SITE_NAME } from "@/app/seo";

export function PageFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-links">
        <Link href="/terms" className="app-footer-link">
          이용약관
        </Link>
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <Link href="/privacy" className="app-footer-link app-footer-link-privacy">
          개인정보처리방침
        </Link>
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <a
          href="mailto:yijunsuc@gmail.com?subject=%EA%B2%8C%EC%8B%9C%EA%B8%80%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD&body=%EC%9B%90%EB%AC%B8%20%EA%B2%8C%EC%8B%9C%EA%B8%80%20URL%3A%0A%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD%20%EC%82%AC%EC%9C%A0%3A%0A"
          className="app-footer-link"
        >
          게시글 삭제 요청
        </a>
        <span className="app-footer-separator" aria-hidden="true">·</span>
        <a href="/feed.xml" className="app-footer-link">
          RSS
        </a>
      </div>
      <p className="app-footer-copy">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
