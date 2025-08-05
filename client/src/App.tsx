import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-white text-lg">Loading Battle Arena...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={() => <Dashboard user={user} activeTab="ranking" />} />
      <Route path="/ranking" component={() => <Dashboard user={user} activeTab="ranking" />} />
      <Route path="/battle" component={() => <Dashboard user={user} activeTab="battle" />} />
      <Route path="/rooms" component={() => <Dashboard user={user} activeTab="rooms" />} />
      <Route path="/cards" component={() => <Dashboard user={user} activeTab="cards" />} />
      <Route path="/deck" component={() => <Dashboard user={user} activeTab="deck" />} />
      <Route path="/create-room" component={() => <Dashboard user={user} activeTab="create-room" />} />
      <Route path="/current-room" component={() => <Dashboard user={user} activeTab="current-room" />} />
      <Route path="/admin" component={() => <Dashboard user={user} activeTab="admin" />} />
      <Route path="/settings" component={() => <Settings />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
