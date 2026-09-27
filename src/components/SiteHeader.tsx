import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/router";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          My Schedule 360
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Home
          </Link>
          <a href="/#how-it-works" className={buttonVariants({ variant: "ghost" })}>
            How it Works
          </a>
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Login
          </Link>
          <Link href="/signup" className={buttonVariants()}>
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
}
