import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useChatbot, ChatMessage, ChatAction } from "@/hooks/useChatbot";
import { useVoiceInput, SUPPORTED_LANGUAGES, LanguageCode } from "@/hooks/useVoiceInput";
import { useChatbotAccessibility, FontSize } from "@/hooks/useChatbotAccessibility";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Stethoscope,
  Calendar,
  HelpCircle,
  Clock,
  Mic,
  MicOff,
  Languages,
  Image,
  AlertTriangle,
  Phone,
  RefreshCw,
  Settings,
  Type,
  Contrast,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ChatbotWidgetProps {
  patientId?: string;
}

const suggestedQuestions = [
  { icon: Stethoscope, text: "I have a headache and fever", label: "Check symptoms" },
  { icon: Calendar, text: "I want to book an appointment with a cardiologist", label: "Book appointment" },
  { icon: HelpCircle, text: "What should I bring to my appointment?", label: "Appointment tips" },
  { icon: Clock, text: "What's my current queue position?", label: "Queue status" },
];

const EMERGENCY_NUMBER = "108"; // India ambulance number

export function ChatbotWidget({ patientId }: ChatbotWidgetProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState<LanguageCode>("en-IN");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage,
    clearMessages,
    retryMessage
  } = useChatbot(patientId);

  const {
    fontSize,
    contrastMode,
    cycleFontSize,
    toggleContrastMode,
    fontSizeClass,
  } = useChatbotAccessibility();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    isListening, 
    isSupported: voiceSupported, 
    interimTranscript,
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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear messages when chat is closed
  const handleClose = () => {
    setIsOpen(false);
    clearMessages();
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;
    sendMessage(input.trim() || "Please analyze this image", selectedImage || undefined);
    setInput("");
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image size should be less than 10MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleEmergency = () => {
    window.location.href = `tel:${EMERGENCY_NUMBER}`;
  };

  const handleAction = (action: ChatAction) => {
    switch (action.action) {
      case "book_appointment":
        navigate("/appointments");
        handleClose();
        break;
      case "view_queue":
        navigate("/");
        handleClose();
        break;
      case "call_doctor":
        if (action.data?.phone) {
          window.location.href = `tel:${action.data.phone}`;
        }
        break;
      default:
        // Send as a new message
        sendMessage(action.label);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Keyboard navigation support
    if (e.key === "Escape") {
      handleClose();
    }
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
            isUser ? "bg-primary" : "bg-accent",
            contrastMode === "high" && "border-2 border-foreground"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4 text-primary-foreground" />
          ) : (
            <Bot className="w-4 h-4 text-accent-foreground" />
          )}
        </div>
        <div className={cn("max-w-[80%] space-y-2", isUser && "text-right")}>
          {message.imageUrl && (
            <div className={cn(
              "rounded-lg overflow-hidden border",
              contrastMode === "high" ? "border-foreground" : "border-border"
            )}>
              <img 
                src={message.imageUrl} 
                alt="Uploaded medical image" 
                className="max-w-full max-h-32 object-cover"
              />
            </div>
          )}
          <div
            className={cn(
              "rounded-2xl px-4 py-2",
              fontSizeClass,
              isUser
                ? cn(
                    "bg-primary text-primary-foreground rounded-br-sm",
                    message.error && "bg-destructive"
                  )
                : cn(
                    "bg-muted text-foreground rounded-bl-sm",
                    contrastMode === "high" && "bg-foreground/10 border border-foreground"
                  )
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {/* Error retry button */}
          {message.error && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => retryMessage(index)}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          )}
          
          {/* Quick action buttons */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.actions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(action)}
                  className={cn(
                    "text-xs",
                    contrastMode === "high" && "border-2 border-foreground"
                  )}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const fontSizeLabel: Record<FontSize, string> = {
    small: "A",
    medium: "A",
    large: "A",
    xlarge: "A",
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        aria-label="Upload medical image"
      />

      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 transition-all duration-300",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
        variant="hero"
        size="icon"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Emergency Button */}
      <Button
        onClick={handleEmergency}
        className={cn(
          "fixed bottom-6 right-24 w-14 h-14 rounded-full shadow-lg z-50 transition-all duration-300 bg-destructive hover:bg-destructive/90",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
        size="icon"
        aria-label="Emergency call"
        title="Call Emergency (108)"
      >
        <Phone className="w-6 h-6" />
      </Button>

      {/* Chat Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-title"
        onKeyDown={handleKeyDown}
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300 origin-bottom-right",
          isOpen
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        <Card className={cn(
          "w-[380px] h-[600px] flex flex-col shadow-2xl border-primary/20",
          contrastMode === "high" && "border-2 border-foreground bg-background"
        )}>
          {/* Header */}
          <CardHeader className="flex-shrink-0 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center",
                  contrastMode === "high" && "bg-primary"
                )}>
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle id="chatbot-title" className={cn("text-lg", fontSizeClass)}>
                    MediAI Assistant
                  </CardTitle>
                  <p className={cn("text-xs text-muted-foreground", fontSizeClass)}>
                    Symptoms • Booking • Q&A
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Settings dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Accessibility settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Accessibility</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={cycleFontSize} className="gap-2">
                      <Type className="w-4 h-4" />
                      <span>Font Size: {fontSize}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleContrastMode} className="gap-2">
                      <Contrast className="w-4 h-4" />
                      <span>High Contrast: {contrastMode === "high" ? "On" : "Off"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Emergency button in header */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEmergency}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Emergency call"
                  title="Call Emergency (108)"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className={cn(
                      "w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4",
                      contrastMode === "high" && "bg-primary/20 border-2 border-primary"
                    )}>
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className={cn("font-semibold mb-1", fontSizeClass)}>Hello! I'm MediAI</h3>
                    <p className={cn("text-muted-foreground", fontSizeClass)}>
                      I can check symptoms, book appointments, and answer health questions.
                    </p>
                    <p className={cn("text-muted-foreground mt-2", fontSizeClass)}>
                      📷 You can also upload medical images for analysis.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className={cn(
                      "text-muted-foreground font-medium uppercase tracking-wide",
                      fontSizeClass === "text-xs" ? "text-[10px]" : "text-xs"
                    )}>
                      Try asking
                    </p>
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestedQuestion(q.text)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors text-left",
                          contrastMode === "high" && "border-2 border-foreground hover:border-primary"
                        )}
                      >
                        <q.icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className={fontSizeClass}>{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3 mb-4">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center",
                        contrastMode === "high" && "border-2 border-foreground"
                      )}>
                        <Bot className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div className={cn(
                        "bg-muted rounded-2xl rounded-bl-sm px-4 py-2",
                        contrastMode === "high" && "border border-foreground"
                      )}>
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
          </CardContent>

          {/* Image preview */}
          {imagePreview && (
            <div className="px-4 pb-2">
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Selected image preview" 
                  className="h-16 rounded-lg border border-border object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t">
            {/* Language selector */}
            {voiceSupported && (
              <div className="flex items-center justify-between mb-3">
                <span className={cn("text-muted-foreground", fontSizeClass === "text-xs" ? "text-[10px]" : "text-xs")}>
                  Voice Language:
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-7 gap-2", fontSizeClass === "text-xs" ? "text-[10px]" : "text-xs")}>
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
              <div className="flex-1 relative flex gap-2">
                {/* Image upload button */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={cn(
                    "flex-shrink-0",
                    contrastMode === "high" && "border-2 border-foreground"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  aria-label="Upload medical image"
                  title="Upload medical image"
                >
                  <Image className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={isListening ? input + interimTranscript : input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? `Listening in ${SUPPORTED_LANGUAGES.find(l => l.code === voiceLanguage)?.label}...` : "Type or speak..."}
                    disabled={isLoading}
                    className={cn(
                      "pr-10",
                      fontSizeClass,
                      isListening && "border-primary",
                      contrastMode === "high" && "border-2 border-foreground"
                    )}
                    aria-label="Chat message input"
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
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                variant="hero"
                aria-label="Send message"
                className={cn(contrastMode === "high" && "border-2 border-foreground")}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
