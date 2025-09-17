'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Wand2, Bot, User, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAiSettings, Pill, StoredAiSettings, decryptApiKey } from '@/lib/ai-settings-store';
import { generateDatapoints } from '@/lib/aiApiClient';
import { useToast } from '@/hooks/use-toast';

interface AskAiPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: string;
}

export const AskAiPopup: React.FC<AskAiPopupProps> = ({ isOpen, onClose }) => {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Omit<StoredAiSettings, 'encryptedApiKey'>>({ useRainbowBorder: true, pills: [] });
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const loadSettings = async () => {
                const storedSettings = await getAiSettings();
                if (storedSettings) {
                    setSettings({
                        useRainbowBorder: storedSettings.useRainbowBorder,
                        pills: storedSettings.pills,
                    });
                }
            };
            loadSettings();

            // Set initial greeting message
            setMessages([
                {
                    id: 'greeting-1',
                    sender: 'bot',
                    text: `Hello! I am your Intelligent Energy Assistant. How can I help you today?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }
            ]);
        }
    }, [isOpen]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handlePillClick = (prompt: string) => {
        setInput(prompt);
    };

    const handleSend = () => {
        if (input.trim()) {
            const newUserMessage: Message = {
                id: `user-${Date.now()}`,
                sender: 'user',
                text: input,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, newUserMessage]);
            setInput('');
            // Here you would typically send the message to a backend and get a response
            // For now, we'll just add a dummy response.
            setTimeout(() => {
                 const botResponse: Message = {
                    id: `bot-${Date.now()}`,
                    sender: 'bot',
                    text: `I have received your message: "${input}". My capabilities are currently focused on datapoint generation. Please use the "Send Datapoints" button for that purpose.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => [...prev, botResponse]);
            }, 1000);
        }
    };

    const handleSendDataPoints = async () => {
        const storedSettings = await getAiSettings();
        if (!storedSettings?.encryptedApiKey) {
            toast({
                title: "API Key Not Found",
                description: "Please configure your Gemini API key in the admin settings.",
                variant: 'destructive',
            });
            return;
        }

        try {
            const decryptedKey = await decryptApiKey(storedSettings.encryptedApiKey);
            toast({
                title: "Initiating Datapoint Generation",
                description: "This may take a few moments...",
            });

            const result = await generateDatapoints(decryptedKey, 'discovered_datapoints.json');

            if (result.success) {
                toast({
                    title: "Processing Started",
                    description: `Task ID: ${result.taskId}. You can monitor the progress in the system logs.`,
                });
            } else {
                toast({
                    title: "Error",
                    description: result.message || "An unknown error occurred.",
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: "Decryption Failed",
                description: "Could not decrypt the API key. Please save it again.",
                variant: 'destructive',
            });
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const rainbowBorderClass = "p-1 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient-xy";

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cn(
                        "fixed bottom-5 right-5 w-[440px] h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border",
                        settings.useRainbowBorder ? rainbowBorderClass : "p-0 border-transparent"
                    )}
                >
                    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-xl">
                        {/* Header */}
                        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Wand2 className="h-6 w-6 text-purple-500" />
                                <h2 className="text-lg font-semibold">Intelligent Energy Assistant</h2>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </header>

                        {/* Message History */}
                        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                                        {msg.sender === 'bot' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><Bot className="h-5 w-5 text-slate-500" /></div>}
                                        <div className={cn(
                                            "max-w-xs rounded-lg px-3 py-2 text-sm",
                                            msg.sender === 'user'
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                                        )}>
                                            <p>{msg.text}</p>
                                            <p className="text-xs text-right mt-1 opacity-60">{msg.timestamp}</p>
                                        </div>
                                        {msg.sender === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center"><User className="h-5 w-5 text-slate-600 dark:text-slate-300" /></div>}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* Quick Pills & Input */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                                {settings.pills.map(pill => (
                                    <Button key={pill.id} variant="outline" size="sm" className="text-xs flex-shrink-0" onClick={() => handlePillClick(pill.prompt)}>
                                        {pill.prompt}
                                    </Button>
                                ))}
                            </div>
                            <div className="relative">
                                 <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your message or select a pill..."
                                    className="pr-20"
                                    rows={2}
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                    <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
                                        <Send className="h-4 w-4" />
                                        <span className="sr-only">Send</span>
                                    </Button>
                                     <Button size="sm" variant="secondary" onClick={handleSendDataPoints}>
                                        Send Datapoints
                                    </Button>
                                </div>
                            </div>
                             <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <CornerDownLeft className="h-3 w-3" />
                                <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
