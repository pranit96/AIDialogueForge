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
    let keepAliveInterval: ReturnType<typeof setInterval>;
    let sessionId = localStorage.getItem('neural_nexus_session_id');

    function connect() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        // Include session ID in the URL if available
        const wsUrl = sessionId 
          ? `${protocol}//${host}/ws?sessionId=${sessionId}`
          : `${protocol}//${host}/ws`;
        
        console.log(`Attempting WebSocket connection to ${wsUrl}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connection established');
          setWsReady(true);
          setSocket(ws);
          reconnectAttempts = 0; // Reset counter on successful connection
          
          // Setup keep-alive messages every 15 seconds
          keepAliveInterval = setInterval(() => {
            if (ws && ws.readyState === 1) { // WebSocket.OPEN = 1
              try {
                ws.send(JSON.stringify({ type: 'KEEP_ALIVE', data: { timestamp: Date.now() } }));
              } catch (e) {
                console.error('Failed to send keep-alive message:', e);
              }
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'CONNECTION_ESTABLISHED' && message.data?.sessionId) {
              // Store the session ID for reconnection
              localStorage.setItem('neural_nexus_session_id', message.data.sessionId);
              sessionId = message.data.sessionId;
              console.log('Session established with ID:', sessionId);
            }
          } catch (e) {
            console.error('Error processing incoming WebSocket message:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          setWsReady(false);
          setSocket(null);
          clearInterval(keepAliveInterval);
          
          // Attempt to reconnect if not a clean close
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = reconnectInterval * Math.min(2, reconnectAttempts); // Exponential backoff
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms...`);
            reconnectTimeout = setTimeout(connect, delay);
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
      clearInterval(keepAliveInterval);
    };
  }, []);

  // Create subtle gradient dots for background
  const gradientDots = Array.from({ length: 20 }).map((_, i) => {
    const randomX = Math.floor(Math.random() * 100);
    const randomY = Math.floor(Math.random() * 100);
    const randomSize = Math.floor(Math.random() * 4) + 2;
    const randomOpacity = 0.03 + (Math.random() * 0.05);
    
    return (
      <div 
        key={i}
        className="absolute rounded-full"
        style={{
          left: `${randomX}%`,
          top: `${randomY}%`,
          width: `${randomSize}px`,
          height: `${randomSize}px`,
          background: i % 2 === 0 ? 'rgba(109, 40, 217, 0.3)' : 'rgba(228, 84, 168, 0.3)',
          filter: 'blur(1px)',
          opacity: randomOpacity
        }}
      />
    );
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="relative min-h-screen overflow-hidden">
          {/* Subtle background pattern */}
          <div className="subtle-pattern"></div>
          
          {/* Dot grid background */}
          <div className="dot-grid"></div>
          
          {/* Background gradient dots */}
          {gradientDots}
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-abyss opacity-10 -z-5 pointer-events-none"></div>
          
          {/* Subtle vignette effect */}
          <div className="absolute inset-0 -z-5 pointer-events-none" 
            style={{
              boxShadow: "inset 0 0 200px 100px rgba(14, 14, 16, 0.3)"
            }}
          ></div>
          
          {/* Very subtle animated gradient */}
          <div className="absolute inset-0 -z-10 opacity-5" 
            style={{
              background: "radial-gradient(circle at 30% 20%, rgba(109, 40, 217, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(228, 84, 168, 0.1) 0%, transparent 40%)"
            }}
          ></div>
          
          <Router />
          <Toaster />
          
          {/* Connection status indicator */}
          <div className="fixed bottom-3 right-3 z-50">
            <div className={`flex items-center text-xs px-2 py-1 rounded-md ${wsReady ? 'text-arcane bg-arcane bg-opacity-5' : 'text-ember bg-enigma bg-opacity-10'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${wsReady ? 'bg-arcane animate-dim-pulse' : 'bg-ember'}`}></div>
              {wsReady ? 'Connected' : 'Reconnecting'}
            </div>
          </div>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
