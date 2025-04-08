import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AgentPersonality } from '@/types';
import { Loader2, Save, XCircle, PlusCircle } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Available voice types
const VOICE_TYPES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'creative', label: 'Creative' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'cheerful', label: 'Cheerful' },
  { value: 'serious', label: 'Serious' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'mysterious', label: 'Mysterious' },
];

// Available response styles
const RESPONSE_STYLES = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'brief', label: 'Brief' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'poetic', label: 'Poetic' },
  { value: 'technical', label: 'Technical' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'questioning', label: 'Questioning' },
];

// Default models as fallback when API fails to fetch latest models
const DEFAULT_MODELS = [
  { value: 'llama3-70b-8192', label: 'Llama 3 70B' },
  { value: 'llama3-8b-8192', label: 'Llama 3 8B' },
  { value: 'gemma-7b-it', label: 'Gemma 7B' },
];

// Color presets
const COLOR_PRESETS = [
  '#64FFDA', // Cyber mint
  '#FF417D', // Neon pink
  '#41FF83', // Matrix green
  '#8892B0', // Ghost blue
  '#FFD700', // Golden
  '#FF7F50', // Coral
  '#9370DB', // Medium purple
  '#00CED1', // Dark turquoise
];

// Personality traits
const PERSONALITY_TRAITS = [
  'Logical', 'Creative', 'Analytical', 'Emotional', 
  'Authoritative', 'Empathetic', 'Technical', 'Philosophical',
  'Humorous', 'Serious', 'Optimistic', 'Cautious',
  'Straightforward', 'Nuanced', 'Visionary', 'Detail-oriented'
];

// Knowledge domains
const KNOWLEDGE_DOMAINS = [
  'Technology', 'Arts', 'Science', 'Philosophy', 
  'Mathematics', 'History', 'Literature', 'Business',
  'Psychology', 'Economics', 'Medicine', 'Law',
  'Engineering', 'Politics', 'Education', 'Entertainment'
];

// Define the form schema
const formSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(30, { message: 'Name must be less than 30 characters' }),
  description: z.string()
    .min(5, { message: 'Description must be at least 5 characters' })
    .max(100, { message: 'Description must be less than 100 characters' }),
  model: z.string(),
  systemPrompt: z.string()
    .min(10, { message: 'System prompt must be at least 10 characters' }),
  color: z.string(),
  active: z.boolean().default(true),
  avatar: z.string().optional(),
  voiceType: z.string().default('neutral'),
  personalityTraits: z.array(z.string()).optional(),
  knowledgeDomains: z.array(z.string()).optional(),
  responseStyle: z.string().default('balanced'),
  temperature: z.string().default('0.7'),
  isPublic: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface AgentCustomizationFormProps {
  existingAgent?: AgentPersonality;
  onCancel: () => void;
}

export default function AgentCustomizationForm({ existingAgent, onCancel }: AgentCustomizationFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const isEditing = !!existingAgent;
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
  
  // Fetch available models from Groq API
  const { isLoading: isLoadingModels } = useQuery({
    queryKey: ['/api/groq-models'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/groq-models');
        if (!response.ok) {
          throw new Error('Failed to fetch Groq models');
        }
        const data = await response.json();
        // Format models for display
        const formattedModels = data.map((model: any) => ({
          value: model.id,
          label: model.displayName || model.id
        }));
        setAvailableModels(formattedModels.length ? formattedModels : DEFAULT_MODELS);
        return data;
      } catch (error) {
        console.error('Error fetching Groq models:', error);
        return DEFAULT_MODELS;
      }
    },
    retry: 1
  });
  
  // Setup the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAgent ? {
      ...existingAgent,
      personalityTraits: existingAgent.personalityTraits || [],
      knowledgeDomains: existingAgent.knowledgeDomains || [],
      temperature: existingAgent.temperature || '0.7',
      voiceType: existingAgent.voiceType || 'neutral',
      responseStyle: existingAgent.responseStyle || 'balanced',
      isPublic: existingAgent.isPublic || false,
    } : {
      name: '',
      description: '',
      model: 'llama3-8b-8192', // Default to reliable small model
      systemPrompt: 'You are a helpful AI assistant that responds in a clear, concise manner.',
      color: '#64FFDA',
      active: true,
      voiceType: 'neutral',
      personalityTraits: [],
      knowledgeDomains: [],
      responseStyle: 'balanced',
      temperature: '0.7',
      isPublic: false,
    },
  });
  
  const [tempPersonalityTraits, setTempPersonalityTraits] = useState(form.getValues().personalityTraits || []);
  const [tempKnowledgeDomains, setTempKnowledgeDomains] = useState(form.getValues().knowledgeDomains || []);
  const [newTrait, setNewTrait] = useState('');
  const [newDomain, setNewDomain] = useState('');
  
  // Create/update agent personality mutation
  const agentMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const endpoint = isEditing 
        ? `/api/agent-personalities/${existingAgent.id}` 
        : '/api/agent-personalities';
      const method = isEditing ? 'PATCH' : 'POST';
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-personalities'] });
      toast({
        title: isEditing ? 'Agent Updated' : 'Agent Created',
        description: isEditing 
          ? `${form.getValues().name} has been updated successfully` 
          : `${form.getValues().name} has been created and is ready to join conversations`,
      });
      onCancel(); // Close the form
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} agent: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // Make sure arrays are properly set
    data.personalityTraits = tempPersonalityTraits;
    data.knowledgeDomains = tempKnowledgeDomains;
    
    agentMutation.mutate(data);
  };
  
  // Helper functions for trait and domain management
  const addPersonalityTrait = () => {
    if (newTrait && !tempPersonalityTraits.includes(newTrait)) {
      setTempPersonalityTraits([...tempPersonalityTraits, newTrait]);
      setNewTrait('');
    }
  };
  
  const removePersonalityTrait = (trait: string) => {
    setTempPersonalityTraits(tempPersonalityTraits.filter(t => t !== trait));
  };
  
  const addKnowledgeDomain = () => {
    if (newDomain && !tempKnowledgeDomains.includes(newDomain)) {
      setTempKnowledgeDomains([...tempKnowledgeDomains, newDomain]);
      setNewDomain('');
    }
  };
  
  const removeKnowledgeDomain = (domain: string) => {
    setTempKnowledgeDomains(tempKnowledgeDomains.filter(d => d !== domain));
  };
  
  // Toggle a predefined trait
  const toggleTrait = (trait: string) => {
    if (tempPersonalityTraits.includes(trait)) {
      removePersonalityTrait(trait);
    } else {
      setTempPersonalityTraits([...tempPersonalityTraits, trait]);
    }
  };
  
  // Toggle a predefined domain
  const toggleDomain = (domain: string) => {
    if (tempKnowledgeDomains.includes(domain)) {
      removeKnowledgeDomain(domain);
    } else {
      setTempKnowledgeDomains([...tempKnowledgeDomains, domain]);
    }
  };
  
  return (
    <Card className="w-full max-w-4xl glass border-cyber-mint animate-border-flow">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-cyber text-cyber-mint">
          {isEditing ? 'Edit Agent Personality' : 'Create New Agent Personality'}
        </CardTitle>
        <CardDescription>
          Customize your AI agent's personality, knowledge, and behavior
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="personality">Personality</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyber-mint">Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter agent name" 
                            {...field}
                            className="bg-deep-space border-cyber-mint" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyber-mint">Model</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-deep-space border-cyber-mint">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-deep-space border-cyber-mint">
                            {isLoadingModels ? (
                              <SelectItem value="loading" disabled>
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Loading models...
                                </div>
                              </SelectItem>
                            ) : (
                              availableModels.map((model: {value: string, label: string}) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Model determines capabilities and speed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cyber-mint">Description</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Brief description of the agent's role" 
                          {...field}
                          className="bg-deep-space border-cyber-mint" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cyber-mint">Color</FormLabel>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map(color => (
                            <div 
                              key={color}
                              className={`w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110 ${field.value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-deep-space' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => form.setValue('color', color)}
                            />
                          ))}
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color" 
                              {...field}
                              className="w-12 h-10 p-1 bg-deep-space border-cyber-mint" 
                            />
                            <Input 
                              type="text" 
                              value={field.value}
                              onChange={field.onChange}
                              className="bg-deep-space border-cyber-mint font-mono" 
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          This color will be used in the interface to identify this agent
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Personality Tab */}
              <TabsContent value="personality" className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cyber-mint">System Prompt</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instructions that define the agent's behavior and knowledge" 
                          {...field}
                          rows={5}
                          className="bg-deep-space border-cyber-mint resize-none" 
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed instructions that shape how the agent responds and behaves
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <FormLabel className="text-cyber-mint">Personality Traits</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PERSONALITY_TRAITS.map(trait => (
                      <Badge 
                        key={trait}
                        variant={tempPersonalityTraits.includes(trait) ? "default" : "outline"}
                        className={`cursor-pointer hover:bg-muted ${tempPersonalityTraits.includes(trait) ? 'bg-cyber-mint text-deep-space' : ''}`}
                        onClick={() => toggleTrait(trait)}
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add custom trait" 
                      value={newTrait}
                      onChange={(e) => setNewTrait(e.target.value)}
                      className="bg-deep-space border-cyber-mint" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPersonalityTrait();
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addPersonalityTrait}
                      className="border-cyber-mint text-cyber-mint"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tempPersonalityTraits.filter(trait => !PERSONALITY_TRAITS.includes(trait)).map(trait => (
                      <Badge 
                        key={trait}
                        variant="default"
                        className="bg-deep-space border-neon-pink text-neon-pink"
                      >
                        {trait}
                        <XCircle 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => removePersonalityTrait(trait)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <FormLabel className="text-cyber-mint">Knowledge Domains</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {KNOWLEDGE_DOMAINS.map(domain => (
                      <Badge 
                        key={domain}
                        variant={tempKnowledgeDomains.includes(domain) ? "default" : "outline"}
                        className={`cursor-pointer hover:bg-muted ${tempKnowledgeDomains.includes(domain) ? 'bg-matrix-green text-deep-space' : ''}`}
                        onClick={() => toggleDomain(domain)}
                      >
                        {domain}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add custom domain" 
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="bg-deep-space border-cyber-mint" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKnowledgeDomain();
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addKnowledgeDomain}
                      className="border-cyber-mint text-cyber-mint"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tempKnowledgeDomains.filter(domain => !KNOWLEDGE_DOMAINS.includes(domain)).map(domain => (
                      <Badge 
                        key={domain}
                        variant="default"
                        className="bg-deep-space border-matrix-green text-matrix-green"
                      >
                        {domain}
                        <XCircle 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => removeKnowledgeDomain(domain)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="voiceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyber-mint">Voice Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-deep-space border-cyber-mint">
                              <SelectValue placeholder="Select voice type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-deep-space border-cyber-mint">
                            {VOICE_TYPES.map(voice => (
                              <SelectItem key={voice.value} value={voice.value}>
                                {voice.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Defines the agent's tone and manner of speaking
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="responseStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyber-mint">Response Style</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-deep-space border-cyber-mint">
                              <SelectValue placeholder="Select response style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-deep-space border-cyber-mint">
                            {RESPONSE_STYLES.map(style => (
                              <SelectItem key={style.value} value={style.value}>
                                {style.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How the agent structures and formats its answers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cyber-mint flex justify-between">
                        <span>Temperature</span>
                        <span className="text-ghost-blue">{field.value}</span>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          defaultValue={[parseFloat(field.value)]}
                          onValueChange={(values) => {
                            field.onChange(values[0].toString());
                          }}
                          className="my-4"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower values (0.1-0.4) produce more predictable responses. Higher values (0.6-1.0) produce more creative, varied responses.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-cyber-mint p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-cyber-mint">Share with other users</FormLabel>
                        <FormDescription>
                          Allow other users to utilize this agent in their conversations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="accent-cyber-mint h-5 w-5"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-ghost-blue text-ghost-blue"
        >
          Cancel
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={agentMutation.isPending}
          className="bg-cyber-mint text-deep-space hover:bg-cyber-mint/90"
        >
          {agentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Agent' : 'Create Agent'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}