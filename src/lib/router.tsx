import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

// Minimal client-side router: tracks window.location.pathname and
// intercepts same-origin <Link> clicks so pages switch without a reload.

const NAVIGATE_EVENT = "app:navigate";

export function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);

  return pathname;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Link({ href, onClick, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    const isModified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    // Let the browser handle in-page anchors, new tabs, and non-left clicks.
    if (event.defaultPrevented || isModified || event.button !== 0 || href.startsWith("#")) {
      return;
    }
    event.preventDefault();
    navigate(href);
    window.scrollTo(0, 0);
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
