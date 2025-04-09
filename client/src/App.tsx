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
        const wsUrl = `${protocol}//${host}/ws`;
        
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

  // Create floating symbols that appear randomly
  const floatingSymbols = Array.from({ length: 12 }).map((_, i) => {
    const randomX = Math.floor(Math.random() * 100);
    const randomY = Math.floor(Math.random() * 100);
    const randomSize = Math.floor(Math.random() * 10) + 10;
    const randomDelay = Math.floor(Math.random() * 5);
    const symbol = ['◆', '◇', '○', '◎', '△', '▲', '□', '▣', '✧', '✦', '⟡', '⟠'][i % 12];
    
    return (
      <div 
        key={i}
        className="floating-symbol text-arcane"
        style={{
          left: `${randomX}%`,
          top: `${randomY}%`,
          fontSize: `${randomSize}px`,
          animationDelay: `${randomDelay}s`,
          opacity: 0.1 + (Math.random() * 0.2)
        }}
      >
        {symbol}
      </div>
    );
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="relative min-h-screen overflow-hidden">
          {/* Enigmatic background pattern */}
          <div className="enigma-pattern"></div>
          
          {/* Arcane background symbols */}
          <div className="arcane-symbols"></div>
          
          {/* Mysterious floating symbols */}
          {floatingSymbols}
          
          {/* Dark fog effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-abyss opacity-30 -z-5 pointer-events-none"></div>
          
          {/* Vignette effect */}
          <div className="absolute inset-0 -z-5 pointer-events-none" 
            style={{
              boxShadow: "inset 0 0 150px 60px rgba(0, 0, 0, 0.8)"
            }}
          ></div>
          
          {/* Subtle animated gradient */}
          <div className="absolute inset-0 -z-10 opacity-5 animate-morph" 
            style={{
              background: "radial-gradient(circle at 30% 20%, rgba(157, 48, 165, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(207, 69, 32, 0.2) 0%, transparent 40%)"
            }}
          ></div>
          
          <Router />
          <Toaster />
          
          {/* Connection status indicator */}
          <div className="fixed bottom-3 right-3 z-50">
            <div className={`flex items-center text-xs font-enigmatic px-2 py-1 rounded-md ${wsReady ? 'text-white bg-arcane bg-opacity-20' : 'text-rune bg-shadow bg-opacity-40'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${wsReady ? 'bg-arcane animate-dim-pulse' : 'bg-ember'}`}></div>
              {wsReady ? 'CONNECTED' : 'RECONNECTING'}
            </div>
          </div>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
