/** Stand-in for next/link in the single-file preview: routes become plain #hash names. */
import type { AnchorHTMLAttributes, ReactNode } from "react";

export function toHash(href: string): string {
  const u = new URL(href, "https://preview.local");
  if (u.pathname === "/play") return `#${u.searchParams.get("mode") ?? "daily"}`;
  if (u.pathname === "/") return "#home";
  return `#${u.pathname.replace(/^\//, "")}`;
}

export default function Link({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  return (
    <a href={toHash(href)} {...rest}>
      {children}
    </a>
  );
}
