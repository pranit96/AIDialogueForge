import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [wsReady, setWsReady] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setWsReady(true);
      setSocket(ws);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWsReady(false);
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen">
        {/* Background hexagonal pattern */}
        <div className="hex-pattern"></div>
        
        {/* CRT scanlines effect */}
        <div className="scan-lines"></div>
        
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
