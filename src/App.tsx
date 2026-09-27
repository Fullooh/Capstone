import { SiteHeader } from "@/components/SiteHeader";
import { usePathname } from "@/lib/router";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";

function CurrentPage({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/login":
      return <LoginPage />;
    case "/signup":
      return <SignupPage />;
    default:
      return <HomePage />;
  }
}

function App() {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <CurrentPage pathname={pathname} />
    </div>
  );
}

export default App;
