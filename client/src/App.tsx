import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [wsReady, setWsReady] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection with retry mechanism
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectInterval = 3000;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        console.log(`Attempting WebSocket connection to ${wsUrl}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connection established');
          setWsReady(true);
          setSocket(ws);
          reconnectAttempts = 0; // Reset counter on successful connection
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          setWsReady(false);
          setSocket(null);
          
          // Attempt to reconnect if not a clean close
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
            reconnectTimeout = setTimeout(connect, reconnectInterval);
          } else {
            console.log('Maximum reconnection attempts reached.');
          }
        };
      } catch (err) {
        console.error('Error establishing WebSocket connection:', err);
      }
    }

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="relative min-h-screen">
          {/* Background hexagonal pattern */}
          <div className="hex-pattern"></div>
          
          {/* CRT scanlines effect */}
          <div className="scan-lines"></div>
          
          <Router />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
