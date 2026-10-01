import { SiteHeader } from "@/components/SiteHeader";
import { usePathname } from "@/lib/router";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SchoolPage } from "@/pages/SchoolPage";
import { WorkPage } from "@/pages/WorkPage";
import { NotesPage } from "@/pages/NotesPage";


function CurrentPage({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/login":
      return <LoginPage />;
    case "/signup":
      return <SignupPage />;
    case "/dashboard":
      return <DashboardPage />;
    case "/school":
      return <SchoolPage />;
    case "/work":
      return <WorkPage />;
    case "/notes":
      return <NotesPage />;
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