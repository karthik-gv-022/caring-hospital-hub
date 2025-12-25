import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatbot, ChatMessage } from "@/hooks/useChatbot";
import { useVoiceInput, SUPPORTED_LANGUAGES, LanguageCode } from "@/hooks/useVoiceInput";
import { useAuth } from "@/hooks/useAuth";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Trash2,
  Stethoscope,
  Calendar,
  HelpCircle,
  Clock,
  Mic,
  MicOff,
  Plus,
  History,
  ChevronLeft,
  Languages
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatbotWidgetProps {
  patientId?: string;
}

const suggestedQuestions = [
  { icon: Stethoscope, text: "I have a headache and fever", label: "Check symptoms" },
  { icon: Calendar, text: "I want to book an appointment with a cardiologist", label: "Book appointment" },
  { icon: HelpCircle, text: "What should I bring to my appointment?", label: "Appointment tips" },
  { icon: Clock, text: "What's my current queue position?", label: "Queue status" },
];

export function ChatbotWidget({ patientId }: ChatbotWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState<LanguageCode>("en-IN");
  
  const { 
    messages, 
    conversations,
    currentConversationId,
    isLoading, 
    isLoadingHistory,
    sendMessage, 
    startNewConversation,
    loadConversation,
    deleteConversation 
  } = useChatbot(patientId);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    isListening, 
    isSupported: voiceSupported, 
    interimTranscript,
    currentLanguage,
    toggleListening,
    changeLanguage 
  } = useVoiceInput({
    language: voiceLanguage,
    onResult: (transcript) => {
      setInput((prev) => prev + transcript + " ");
    },
    onError: (error) => {
      console.error("Voice error:", error);
    },
  });

  // Sync language changes
  useEffect(() => {
    changeLanguage(voiceLanguage);
  }, [voiceLanguage, changeLanguage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && !showHistory) {
      inputRef.current.focus();
    }
  }, [isOpen, showHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === "user";
    
    return (
      <div
        key={message.id || index}
        className={cn(
          "flex gap-3 mb-4",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isUser ? "bg-primary" : "bg-accent"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4 text-primary-foreground" />
          ) : (
            <Bot className="w-4 h-4 text-accent-foreground" />
          )}
        </div>
        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowHistory(false)}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold">Chat History</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No previous conversations
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors",
                  currentConversationId === conv.id && "border-primary bg-primary/5"
                )}
                onClick={() => {
                  loadConversation(conv.id);
                  setShowHistory(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 transition-all duration-300",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
        variant="hero"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300 origin-bottom-right",
          isOpen
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        <Card className="w-[380px] h-[600px] flex flex-col shadow-2xl border-primary/20">
          {/* Header */}
          <CardHeader className="flex-shrink-0 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">MediAI Assistant</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Symptoms • Booking • Q&A
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {user && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startNewConversation}
                      className="h-8 w-8"
                      title="New conversation"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowHistory(!showHistory)}
                      className="h-8 w-8"
                      title="Chat history"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="flex-1 overflow-hidden p-0">
            {showHistory ? (
              renderHistoryView()
            ) : isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <ScrollArea className="h-full p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Bot className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1">Hello! I'm MediAI</h3>
                      <p className="text-sm text-muted-foreground">
                        I can check symptoms, book appointments, and answer health questions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Try asking
                      </p>
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestedQuestion(q.text)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors text-left"
                        >
                          <q.icon className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map(renderMessage)}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex gap-3 mb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                          <Bot className="w-4 h-4 text-accent-foreground" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </ScrollArea>
            )}
          </CardContent>

          {/* Input */}
          {!showHistory && (
            <div className="flex-shrink-0 p-4 border-t">
              {/* Language selector */}
              {voiceSupported && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">Voice Language:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-2 text-xs">
                        <Languages className="w-3 h-3" />
                        {SUPPORTED_LANGUAGES.find(l => l.code === voiceLanguage)?.label || "Select"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => setVoiceLanguage(lang.code)}
                          className={cn(
                            "gap-2",
                            voiceLanguage === lang.code && "bg-accent"
                          )}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={isListening ? input + interimTranscript : input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? `Listening in ${SUPPORTED_LANGUAGES.find(l => l.code === voiceLanguage)?.label}...` : "Type or speak..."}
                    disabled={isLoading}
                    className={cn("pr-10", isListening && "border-primary")}
                  />
                  {voiceSupported && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7",
                        isListening && "text-primary animate-pulse"
                      )}
                      onClick={toggleListening}
                      title={isListening ? "Stop listening" : `Speak in ${SUPPORTED_LANGUAGES.find(l => l.code === voiceLanguage)?.label}`}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  variant="hero"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {user 
                  ? "Conversations are saved automatically" 
                  : "Sign in to save chat history"}
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
