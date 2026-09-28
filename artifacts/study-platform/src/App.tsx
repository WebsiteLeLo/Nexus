import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Shell } from "@/components/layout/shell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Library from "@/pages/library";
import Player from "@/pages/player";
import Notes from "@/pages/notes";
import Revision from "@/pages/revision";
import Playlists from "@/pages/playlists";
import Files from "@/pages/files";
import Search from "@/pages/search";
import Planner from "@/pages/planner";
import Reminders from "@/pages/reminders";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/library" component={Library} />
        <Route path="/player/:videoId" component={Player} />
        <Route path="/notes" component={Notes} />
        <Route path="/revision" component={Revision} />
        <Route path="/playlists" component={Playlists} />
        <Route path="/files" component={Files} />
        <Route path="/search" component={Search} />
        <Route path="/planner" component={Planner} />
        <Route path="/reminders" component={Reminders} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
