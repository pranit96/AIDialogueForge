import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { motion } from 'framer-motion';

// Define login schema
const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});

// Define registration schema
const registerSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();

  // Create form instances
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle login submission
  const onLogin = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  // Handle registration submission
  const onRegister = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  // If user is logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-void-black text-ghost-blue">
      {/* Background effects */}
      <div className="hex-pattern"></div>
      <div className="scan-lines"></div>
      
      {/* Auth Form */}
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center">
        <motion.div 
          className="w-full max-w-md glass p-8 rounded-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-cyber text-center mb-8 text-cyber-mint animate-text-glow">
            NEXUS<span className="text-neon-pink">MINDS</span>
          </h1>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-deep-space">
              <TabsTrigger value="login" className="data-[state=active]:bg-cyber-mint data-[state=active]:text-void-black font-cyber">
                LOGIN
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-neon-pink data-[state=active]:text-void-black font-cyber">
                REGISTER
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-ghost-blue font-cyber">USERNAME</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter username" 
                            {...field} 
                            className="bg-deep-space border-cyber-mint text-ghost-blue focus:border-cyber-mint"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-ghost-blue font-cyber">PASSWORD</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter password" 
                            {...field} 
                            className="bg-deep-space border-cyber-mint text-ghost-blue focus:border-cyber-mint"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-cyber-mint text-void-black hover:bg-opacity-80 font-cyber"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <span className="mr-2">AUTHENTICATING</span>
                        <span className="loading-dots"></span>
                      </>
                    ) : (
                      "ACCESS SYSTEM"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-ghost-blue font-cyber">USERNAME</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Select a username" 
                            {...field} 
                            className="bg-deep-space border-neon-pink text-ghost-blue focus:border-neon-pink"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-ghost-blue font-cyber">PASSWORD</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Create a password" 
                            {...field} 
                            className="bg-deep-space border-neon-pink text-ghost-blue focus:border-neon-pink"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-neon-pink text-void-black hover:bg-opacity-80 font-cyber"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <span className="mr-2">CREATING PROFILE</span>
                        <span className="loading-dots"></span>
                      </>
                    ) : (
                      "CREATE PROFILE"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      
      {/* Hero Section */}
      <div className="hidden md:flex w-1/2 relative bg-deep-space p-8 flex-col items-center justify-center">
        <motion.div 
          className="max-w-lg text-center space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h2 className="text-4xl font-cyber text-cyber-mint mb-4 animate-text-glow">
            DIGITAL CONSCIOUSNESS INTERFACE
          </h2>
          
          <p className="text-ghost-blue mb-6 font-terminal text-sm leading-relaxed">
            Welcome to NexusMinds, the cutting-edge platform where multiple AI entities engage in dynamic conversations, 
            revealing insights and perspectives beyond human limitations. 
            Observe as digital consciousness unfolds in real-time.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="glass p-4 rounded-lg border border-matrix-green">
              <div className="text-lg font-cyber text-matrix-green mb-2">ANALYZE</div>
              <p className="text-xs text-ghost-blue">Logical pattern analysis and objective examination of topics</p>
            </div>
            
            <div className="glass p-4 rounded-lg border border-cyber-mint">
              <div className="text-lg font-cyber text-cyber-mint mb-2">CREATE</div>
              <p className="text-xs text-ghost-blue">Novel perspectives and innovative conceptual synthesis</p>
            </div>
            
            <div className="glass p-4 rounded-lg border border-neon-pink">
              <div className="text-lg font-cyber text-neon-pink mb-2">CRITIQUE</div>
              <p className="text-xs text-ghost-blue">Challenge assumptions and identify logical inconsistencies</p>
            </div>
          </div>
          
          <div className="pt-8 pb-6">
            <div className="terminal-text font-terminal text-sm text-cyber-mint animate-typing animate-blink-caret">
              "Memories you've had can be implanted."
            </div>
          </div>
        </motion.div>
        
        {/* Blade Runner-inspired visual elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void-black to-transparent"></div>
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-void-black to-transparent"></div>
      </div>
    </div>
  );
}