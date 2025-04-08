import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Conversation, Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Lightbulb, Loader2 } from 'lucide-react';

interface ConversationInsightsProps {
  conversation: Conversation | null;
  messages: Message[];
}

export default function ConversationInsights({ conversation, messages }: ConversationInsightsProps) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  
  // Generate insights using the API
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!conversation) throw new Error("No active conversation");
      const response = await apiRequest('POST', `/api/conversations/${conversation.id}/insights`, {});
      return response.json();
    },
    onSuccess: (data: { insights: string[] }) => {
      setInsights(data.insights);
      setShowInsights(true);
      toast({
        title: 'Insights Generated',
        description: 'AI-powered analysis complete',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to generate insights: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle downloading chat history as JSON
  const handleDownloadJSON = () => {
    if (!conversation || messages.length === 0) {
      toast({
        title: 'No Data',
        description: 'There is no conversation to download',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      conversation,
      messages,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural-nexus-conversation-${conversation.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download Complete',
      description: 'Conversation data downloaded as JSON',
    });
  };

  // Handle downloading chat history as text
  const handleDownloadText = () => {
    if (!conversation || messages.length === 0) {
      toast({
        title: 'No Data',
        description: 'There is no conversation to download',
        variant: 'destructive',
      });
      return;
    }
    
    let text = `NEURAL NEXUS - CONVERSATION TRANSCRIPT\n`;
    text += `Topic: ${conversation.topic}\n`;
    text += `Started: ${new Date(conversation.startedAt).toLocaleString()}\n`;
    text += `Ended: ${conversation.endedAt ? new Date(conversation.endedAt).toLocaleString() : 'Ongoing'}\n\n`;
    
    messages.forEach((message) => {
      text += `[${message.agentName || 'Unknown Agent'}] ${new Date(message.timestamp).toLocaleTimeString()}\n`;
      text += `${message.content}\n\n`;
    });
    
    if (insights.length > 0) {
      text += `\nINSIGHTS:\n`;
      insights.forEach((insight, i) => {
        text += `${i+1}. ${insight}\n`;
      });
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural-nexus-conversation-${conversation.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download Complete',
      description: 'Conversation transcript downloaded as text',
    });
  };

  // Only render if we have a conversation with messages
  if (!conversation || messages.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          className="bg-deep-space border-cyber-mint text-cyber-mint hover:bg-deep-space/80"
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending || messages.length === 0 || !conversation?.endedAt}
        >
          {generateInsightsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Lightbulb className="mr-2 h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          className="bg-deep-space border-matrix-green text-matrix-green hover:bg-deep-space/80"
          onClick={handleDownloadJSON}
          disabled={messages.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
        
        <Button
          variant="outline"
          className="bg-deep-space border-ghost-blue text-ghost-blue hover:bg-deep-space/80"
          onClick={handleDownloadText}
          disabled={messages.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Text
        </Button>
      </div>
      
      {showInsights && insights.length > 0 && (
        <Card className="glass border-cyber-mint animate-border-flow mb-6">
          <CardHeader>
            <CardTitle className="text-cyber-mint flex items-center">
              <Lightbulb className="mr-2 h-5 w-5" />
              Neural Analysis
            </CardTitle>
            <CardDescription>AI-generated insights from the conversation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="text-ghost-blue">
                  <span className="text-cyber-mint mr-2">[{index + 1}]</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}