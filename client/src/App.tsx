import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import KnowledgeQuery from "@/pages/KnowledgeQuery";
import Conversation from "@/pages/Conversation";
import Settings from "@/pages/Settings";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import EnigmaNetworkViz from "@/components/NeuralNetworkViz";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/knowledge" />
      </Route>
      {/* Main flow: Login → Knowledge Query → Conversation → Settings */}
      <ProtectedRoute path="/knowledge" component={KnowledgeQuery} />
      <ProtectedRoute path="/conversation/:id" component={Conversation} />
      <ProtectedRoute path="/settings" component={Settings} />
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

  // Create ethereal cosmic particles for background
  const gradientDots = Array.from({ length: 35 }).map((_, i) => {
    const randomX = Math.floor(Math.random() * 100);
    const randomY = Math.floor(Math.random() * 100);
    const randomSize = Math.floor(Math.random() * 6) + 2;
    const randomOpacity = 0.04 + (Math.random() * 0.08);
    const randomDelay = Math.floor(Math.random() * 15);
    const randomDuration = 15 + Math.floor(Math.random() * 20);
    
    // Decide particle type
    let particleType;
    if (i % 5 === 0) {
      particleType = 'star';
    } else if (i % 4 === 0) {
      particleType = 'nebula';
    } else {
      particleType = 'energy';
    }
    
    // Style based on particle type
    let particleStyle = {};
    
    if (particleType === 'star') {
      // Bright star particles
      particleStyle = {
        background: 'rgba(255, 255, 255, 0.7)',
        boxShadow: `0 0 ${randomSize * 2}px rgba(255, 255, 255, 0.8), 0 0 ${randomSize * 3}px rgba(123, 43, 254, 0.5)`,
        animation: `pulse-glow ${randomDuration}s infinite alternate ease-in-out ${randomDelay}s`
      };
    } else if (particleType === 'nebula') {
      // Colorful nebula particles
      const hue = Math.floor(Math.random() * 60) + 260; // Purple to blue range
      particleStyle = {
        background: `hsla(${hue}, 80%, 70%, 0.6)`,
        filter: 'blur(2px)',
        animation: `cosmic-drift ${randomDuration}s infinite alternate ease-in-out ${randomDelay}s`,
        boxShadow: `0 0 ${randomSize * 1.5}px hsla(${hue}, 80%, 70%, 0.5)`
      };
    } else {
      // Energy particles
      const isArcane = i % 2 === 0;
      particleStyle = {
        background: isArcane ? 'rgba(123, 43, 254, 0.4)' : 'rgba(228, 84, 168, 0.4)',
        filter: 'blur(1px)',
        animation: `ethereal-float ${randomDuration}s infinite ease-in-out ${randomDelay}s`
      };
    }
    
    return (
      <div 
        key={i}
        className="absolute rounded-full"
        style={{
          left: `${randomX}%`,
          top: `${randomY}%`,
          width: `${randomSize}px`,
          height: `${randomSize}px`,
          opacity: randomOpacity,
          zIndex: particleType === 'star' ? 2 : 1,
          ...particleStyle
        }}
      />
    );
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="relative min-h-screen overflow-hidden bg-black">
          {/* Simplified Neural Network Background */}
          <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -10 }}>
            <EnigmaNetworkViz 
              className="w-full h-full" 
              nodeCount={35} 
              edgeCount={45}
              animationSpeed={0.2}
            />
          </div>
          
          {/* Deep space vignette effect */}
          <div className="fixed inset-0 pointer-events-none" 
            style={{
              boxShadow: "inset 0 0 250px 100px rgba(0, 0, 0, 0.7), inset 0 0 150px 50px rgba(0, 0, 0, 0.5)",
              zIndex: -5
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
