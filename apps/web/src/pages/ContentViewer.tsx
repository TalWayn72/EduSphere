import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatMessage } from '@/components/ChatMessage';
import type { Message } from '@/types/chat';
import { BookOpen, MessageSquare, Network, FileText, Send } from 'lucide-react';
import { mockGraphData } from '@/lib/mock-graph-data';

// Mock content data
const MOCK_CONTENT = {
  'content-1': {
    id: 'content-1',
    title: 'Introduction to Free Will in Jewish Philosophy',
    courseId: 'course-1',
    courseName: 'Introduction to Talmud Study',
    description: 'Explore the complex relationship between free will and divine providence',
    text: `# Free Will and Divine Providence

The concept of free will (בחירה חופשית) is central to Jewish philosophy. Rambam (Maimonides) addresses this fundamental question in his Guide for the Perplexed.

## Key Questions

1. How can humans have free will if God knows the future?
2. What is the relationship between free will and divine providence?
3. How does free will relate to moral responsibility?

## Rambam's Approach

Rambam reconciles free will with divine knowledge through a sophisticated philosophical framework that draws from both Torah and Aristotelian philosophy. He argues that:

- Human beings possess genuine freedom of choice
- Divine knowledge operates on a different plane than human causality
- Free will is essential for the concept of commandments and moral responsibility

## Related Concepts

This discussion connects to broader themes in Jewish thought including determinism, ethics, prophecy, and the nature of divine providence.`,
  },
  'content-2': {
    id: 'content-2',
    title: 'Ethics and Metaphysics in the Guide',
    courseId: 'course-1',
    courseName: 'Introduction to Talmud Study',
    description: 'Understanding the prerequisite relationship between ethics and metaphysics',
    text: `# Ethics and Metaphysics

Rambam's ethical system is deeply rooted in metaphysical understanding. This lesson explores why metaphysical knowledge is a prerequisite for proper ethical conduct.`,
  },
  'content-3': {
    id: 'content-3',
    title: 'Advanced Chavruta Dialogue Techniques',
    courseId: 'course-2',
    courseName: 'Advanced Chavruta Techniques',
    description: 'Master the art of dialectical reasoning in Talmudic study',
    text: `# Chavruta Learning Method

Chavruta (חַבְרוּתָא) is the traditional method of Talmudic study in pairs, involving intense dialogue and debate.`,
  },
};

export function ContentViewer() {
  const { contentId = 'content-1' } = useParams<{ contentId: string }>();
  const content = MOCK_CONTENT[contentId as keyof typeof MOCK_CONTENT] || MOCK_CONTENT['content-1'];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: `Hello! I'm your AI learning assistant. I can help you understand "${content.title}". Feel free to ask questions about free will, divine providence, or any related concepts.`,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Mock AI response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `That's a great question about "${inputValue}". Let me help you explore this concept in the context of Jewish philosophy. According to Rambam's framework, this relates to the balance between rational inquiry and traditional teachings.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
    }, 1000);

    setInputValue('');
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{content.courseName}</p>
                  <CardTitle className="text-2xl mb-2">{content.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{content.description}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="annotations">Annotations</TabsTrigger>
                  <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {content.text.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) {
                        return <h1 key={idx} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
                      } else if (line.startsWith('## ')) {
                        return <h2 key={idx} className="text-xl font-semibold mt-5 mb-3">{line.slice(3)}</h2>;
                      } else if (line.startsWith('- ')) {
                        return <li key={idx} className="ml-6 mb-2">{line.slice(2)}</li>;
                      } else if (line.trim()) {
                        return <p key={idx} className="mb-4 leading-relaxed">{line}</p>;
                      }
                      return null;
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="annotations" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <p className="text-sm">Your personal annotations will appear here</p>
                    </div>
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Add Annotation
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="graph" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                      <Network className="h-4 w-4" />
                      <p className="text-sm">Related concepts from the knowledge graph</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {mockGraphData.nodes.slice(0, 6).map((node) => (
                        <Card key={node.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                node.type === 'CONCEPT' ? 'bg-blue-500' :
                                node.type === 'PERSON' ? 'bg-green-500' :
                                node.type === 'SOURCE' ? 'bg-purple-500' :
                                'bg-orange-500'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">{node.label}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {node.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Learning Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="flex-1 overflow-y-auto px-4 space-y-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question..."
                    className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
