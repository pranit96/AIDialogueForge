import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { AgentPersonality } from "@/types";
import { Loader2, Plus, Home, PenLine, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentPersonality | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("llama3-70b-8192");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [color, setColor] = useState("#7B2BFE");
  const [archetype, setArchetype] = useState("sage");
  
  // Fetch agents
  const {
    data: agents = [],
    isLoading: isLoadingAgents,
    error: agentsError,
  } = useQuery<AgentPersonality[]>({
    queryKey: ["/api/agent-personalities"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch available models
  const {
    data: models = [],
    isLoading: isLoadingModels,
  } = useQuery<any[]>({
    queryKey: ["/api/groq-models"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Add agent mutation
  const addAgentMutation = useMutation({
    mutationFn: async (newAgent: Partial<AgentPersonality>) => {
      const response = await apiRequest("POST", "/api/agent-personalities", newAgent);
      if (!response.ok) {
        throw new Error("Failed to create agent");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-personalities"] });
      toast({
        title: "Agent Created",
        description: "Neural entity has been successfully integrated.",
      });
      resetForm();
      setAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create neural entity.",
        variant: "destructive",
      });
    },
  });
  
  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AgentPersonality> }) => {
      const response = await apiRequest("PATCH", `/api/agent-personalities/${id}`, updates);
      if (!response.ok) {
        throw new Error("Failed to update agent");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-personalities"] });
      toast({
        title: "Agent Updated",
        description: "Neural entity has been successfully updated.",
      });
      resetForm();
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update neural entity.",
        variant: "destructive",
      });
    },
  });
  
  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/agent-personalities/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-personalities"] });
      toast({
        title: "Agent Deleted",
        description: "Neural entity has been removed from the nexus.",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete neural entity.",
        variant: "destructive",
      });
    },
  });
  
  // Toggle agent activation mutation
  const toggleAgentMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await apiRequest("PATCH", `/api/agent-personalities/${id}`, { active });
      if (!response.ok) {
        throw new Error("Failed to update agent status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-personalities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update neural entity status.",
        variant: "destructive",
      });
    },
  });
  
  // Form handlers
  const resetForm = () => {
    setName("");
    setDescription("");
    setModel("llama3-70b-8192");
    setSystemPrompt("");
    setColor("#7B2BFE");
    setArchetype("sage");
    setCurrentAgent(null);
  };
  
  const handleAddClick = () => {
    resetForm();
    setAddDialogOpen(true);
  };
  
  const handleEditClick = (agent: AgentPersonality) => {
    setCurrentAgent(agent);
    setName(agent.name);
    setDescription(agent.description);
    setModel(agent.model);
    setSystemPrompt(agent.systemPrompt);
    setColor(agent.color);
    setArchetype(agent.archetype);
    setEditDialogOpen(true);
  };
  
  const handleDeleteClick = (agent: AgentPersonality) => {
    setCurrentAgent(agent);
    setDeleteDialogOpen(true);
  };
  
  const handleToggleActive = (agent: AgentPersonality) => {
    toggleAgentMutation.mutate({ id: agent.id, active: !agent.active });
  };
  
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addAgentMutation.mutate({
      name,
      description,
      model,
      systemPrompt,
      color,
      archetype,
      active: true,
    });
  };
  
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAgent) return;
    
    updateAgentMutation.mutate({
      id: currentAgent.id,
      updates: {
        name,
        description,
        model,
        systemPrompt,
        color,
        archetype,
      },
    });
  };
  
  const handleDeleteConfirm = () => {
    if (!currentAgent) return;
    deleteAgentMutation.mutate(currentAgent.id);
  };
  
  // Loading state
  if (isLoadingAgents || isLoadingModels) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-arcane" />
        <p className="mt-4 text-whisper">Loading Neural Configuration...</p>
      </div>
    );
  }
  
  // Error state
  if (agentsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h2 className="heading-2 text-ember mb-4">Neural Configuration Error</h2>
        <p className="body-base text-whisper mb-8">
          Failed to load neural entities. Please try again.
        </p>
        <Button onClick={() => navigate("/query")} className="primary-button">
          Return to Neural Gateway
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-abyss bg-opacity-30">
      {/* Ethereal background effects */}
      <div className="cosmic-fog"></div>
      
      {/* Header with cosmic glow */}
      <header className="w-full py-4 px-6 glass-panel z-10 border-b border-arcane border-opacity-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/knowledge")}
              className="mr-2 text-whisper hover:text-arcane"
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="heading-3 gradient-text-mystic">
              Neural Configuration
            </h1>
          </div>
          
          <Button
            onClick={handleAddClick}
            className="glow-button relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-arcane/20 via-transparent to-arcane/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Plus className="h-4 w-4 mr-2" />
            <span>Create Neural Entity</span>
            <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-whisper/40 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="card-container mb-8 p-6">
            <h2 className="heading-3 gradient-text mb-4">Active Neural Entities</h2>
            <p className="body-base text-whisper opacity-80 mb-6">
              Active entities will participate in the neural dialogue. Toggle to activate or deactivate.
            </p>
            
            <div className="space-y-4">
              {agents.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-whisper opacity-70">No neural entities configured</p>
                  <Button onClick={handleAddClick} className="mt-4 secondary-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Neural Entity
                  </Button>
                </div>
              ) : (
                agents.map((agent) => (
                  <div 
                    key={agent.id}
                    className="glass-panel p-4 rounded-lg flex items-center justify-between"
                    style={{ borderLeft: `4px solid ${agent.color}` }}
                  >
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: agent.color }}
                      >
                        <span className="text-xs font-bold text-white">
                          {agent.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-whisper flex items-center">
                          {agent.name}
                          {agent.active && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-arcane bg-opacity-20 text-arcane">
                              Active
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-whisper opacity-70">
                          {agent.archetype} • {agent.description.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={agent.active}
                        onCheckedChange={() => handleToggleActive(agent)}
                        className="data-[state=checked]:bg-arcane"
                      />
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(agent)}
                      >
                        <PenLine className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(agent)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Agent Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] glass-panel border-arcane">
          <DialogHeader>
            <DialogTitle className="gradient-text">Add Neural Entity</DialogTitle>
            <DialogDescription>
              Create a new AI personality to join the neural dialogue.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Entity Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modern-input"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="archetype">Archetype</Label>
                <Select value={archetype} onValueChange={setArchetype}>
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select an archetype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sage">Sage</SelectItem>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="advocate">Advocate</SelectItem>
                    <SelectItem value="philosopher">Philosopher</SelectItem>
                    <SelectItem value="scientist">Scientist</SelectItem>
                    <SelectItem value="sceptic">Sceptic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="modern-input"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color">Entity Color</Label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-10 h-10 rounded-md border border-whisper border-opacity-20"
                    style={{ background: color }}
                  />
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="modern-input flex-1 h-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="modern-input min-h-[120px]"
                placeholder="Define the entity's personality, knowledge domains, and communication style..."
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="secondary-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="primary-button"
                disabled={addAgentMutation.isPending}
              >
                {addAgentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Entity"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] glass-panel border-arcane">
          <DialogHeader>
            <DialogTitle className="gradient-text">Edit Neural Entity</DialogTitle>
            <DialogDescription>
              Modify this AI personality's configuration.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Entity Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modern-input"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-archetype">Archetype</Label>
                <Select value={archetype} onValueChange={setArchetype}>
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select an archetype" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sage">Sage</SelectItem>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="advocate">Advocate</SelectItem>
                    <SelectItem value="philosopher">Philosopher</SelectItem>
                    <SelectItem value="scientist">Scientist</SelectItem>
                    <SelectItem value="sceptic">Sceptic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="modern-input"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="modern-input">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-color">Entity Color</Label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-10 h-10 rounded-md border border-whisper border-opacity-20"
                    style={{ background: color }}
                  />
                  <Input
                    id="edit-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="modern-input flex-1 h-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-systemPrompt">System Prompt</Label>
              <Textarea
                id="edit-systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="modern-input min-h-[120px]"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="secondary-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="primary-button"
                disabled={updateAgentMutation.isPending}
              >
                {updateAgentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Entity"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] glass-panel border-arcane">
          <DialogHeader>
            <DialogTitle className="text-ember">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this neural entity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="secondary-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="accent-button"
              disabled={deleteAgentMutation.isPending}
            >
              {deleteAgentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Entity"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}