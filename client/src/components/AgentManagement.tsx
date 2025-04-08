import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AgentPersonality } from '@/types';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Power, 
  PowerOff,
  AlertCircle,
  Cpu 
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentCustomizationForm from './AgentCustomizationForm';

export default function AgentManagement() {
  const { toast } = useToast();
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentPersonality | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'custom'>('all');
  
  // Fetch all agent personalities
  const { data: agents = [], isLoading } = useQuery<AgentPersonality[]>({
    queryKey: ['/api/agent-personalities'],
  });
  
  // Mutation to toggle agent active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/agent-personalities/${id}`, { active });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-personalities'] });
      toast({
        title: 'Agent Updated',
        description: `Agent status has been ${selectedAgent?.active ? 'deactivated' : 'activated'}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update agent: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation to delete an agent
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/agent-personalities/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-personalities'] });
      toast({
        title: 'Agent Deleted',
        description: `${selectedAgent?.name} has been permanently deleted`,
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete agent: ${error.message}`,
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
    },
  });
  
  // Handle opening the customization dialog for creating a new agent
  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setIsCustomizationOpen(true);
  };
  
  // Handle opening the customization dialog for editing an existing agent
  const handleEditAgent = (agent: AgentPersonality) => {
    setSelectedAgent(agent);
    setIsCustomizationOpen(true);
  };
  
  // Handle opening the delete confirmation dialog
  const handleDeletePrompt = (agent: AgentPersonality) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle toggling an agent's active status
  const handleToggleActive = (agent: AgentPersonality) => {
    setSelectedAgent(agent);
    toggleActiveMutation.mutate({ id: agent.id, active: !agent.active });
  };
  
  // Filter agents based on active tab
  const filteredAgents = agents.filter(agent => {
    if (activeTab === 'all') return true;
    if (activeTab === 'system') return !agent.userId;
    if (activeTab === 'custom') return !!agent.userId;
    return true;
  });
  
  // Format agent model name for display
  const formatModelName = (modelId: string) => {
    switch (modelId) {
      case 'mixtral-8x7b-32768':
        return 'Mixtral 8x7B';
      case 'llama3-70b-8192':
        return 'Llama 3 70B';
      case 'llama3-8b-8192':
        return 'Llama 3 8B';
      case 'gemma-7b-it':
        return 'Gemma 7B';
      default:
        return modelId;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cyber tracking-wide text-cyber-mint glitch-text">
            <Cpu className="inline-block mr-2 h-5 w-5" /> AGENT MANAGEMENT
          </h2>
          <p className="text-ghost-blue mt-1">
            Create and customize AI personalities for your neural conversations
          </p>
        </div>
        
        <Button 
          onClick={handleCreateAgent}
          className="bg-cyber-mint text-deep-space hover:bg-cyber-mint/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'all' | 'system' | 'custom')}
      >
        <TabsList className="glass border-cyber-mint">
          <TabsTrigger value="all">All Agents</TabsTrigger>
          <TabsTrigger value="system">System Agents</TabsTrigger>
          <TabsTrigger value="custom">Custom Agents</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          <Card className="glass border-deep-space">
            <CardContent className="p-0">
              <Table>
                <TableCaption>Manage AI agent personalities for conversations</TableCaption>
                <TableHeader className="bg-deep-space bg-opacity-70">
                  <TableRow>
                    <TableHead className="font-cyber text-cyber-mint w-[80px]">Status</TableHead>
                    <TableHead className="font-cyber text-cyber-mint">Name</TableHead>
                    <TableHead className="font-cyber text-cyber-mint">Description</TableHead>
                    <TableHead className="font-cyber text-cyber-mint">Model</TableHead>
                    <TableHead className="font-cyber text-cyber-mint">Traits</TableHead>
                    <TableHead className="font-cyber text-cyber-mint w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-ghost-blue">
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyber-mint"></div>
                            <span className="ml-3">Loading agents...</span>
                          </div>
                        ) : (
                          <div>
                            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-ghost-blue opacity-60" />
                            <p>No agents found in this category</p>
                            <Button 
                              onClick={handleCreateAgent}
                              variant="link" 
                              className="text-cyber-mint mt-2"
                            >
                              Create your first agent
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAgents.map((agent) => (
                      <TableRow key={agent.id} className="hover:bg-deep-space/40">
                        <TableCell>
                          <div 
                            className={`h-3 w-3 rounded-full ${agent.active ? 'bg-matrix-green' : 'bg-ghost-blue'}`}
                            style={{ boxShadow: agent.active ? '0 0 10px #41FF83' : 'none' }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: agent.color }}
                            />
                            <span className={agent.userId ? '' : 'font-cyber'}>
                              {agent.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {agent.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatModelName(agent.model)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {agent.personalityTraits?.slice(0, 3).map((trait, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {trait}
                              </Badge>
                            ))}
                            {agent.personalityTraits && agent.personalityTraits.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{agent.personalityTraits.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="glass border-cyber-mint">
                              <DropdownMenuItem 
                                className="text-cyber-mint cursor-pointer"
                                onClick={() => handleEditAgent(agent)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className={agent.active ? "text-ghost-blue cursor-pointer" : "text-matrix-green cursor-pointer"}
                                onClick={() => handleToggleActive(agent)}
                              >
                                {agent.active ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-500 cursor-pointer"
                                onClick={() => handleDeletePrompt(agent)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Agent Customization Dialog */}
      <Dialog open={isCustomizationOpen} onOpenChange={setIsCustomizationOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none">
          <AgentCustomizationForm 
            existingAgent={selectedAgent || undefined} 
            onCancel={() => setIsCustomizationOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass border-neon-pink">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neon-pink">Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedAgent?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ghost-blue text-ghost-blue">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => selectedAgent && deleteAgentMutation.mutate(selectedAgent.id)}
            >
              {deleteAgentMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}