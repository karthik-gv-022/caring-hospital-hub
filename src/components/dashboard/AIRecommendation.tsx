import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Stethoscope, Clock, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Recommendation {
  doctorName: string;
  specialty: string;
  matchScore: number;
  reason: string;
  waitTime: string;
}

export function AIRecommendation() {
  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setRecommendations([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-symptoms', {
        body: { symptoms: symptoms.trim() }
      });

      if (fnError) {
        console.error("Function error:", fnError);
        throw new Error(fnError.message || "Failed to analyze symptoms");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        toast({
          title: "Analysis Complete",
          description: `Found ${data.recommendations.length} recommended specialists for your symptoms.`,
        });
      }
    } catch (err) {
      console.error("Error analyzing symptoms:", err);
      const message = err instanceof Error ? err.message : "Failed to analyze symptoms. Please try again.";
      setError(message);
      toast({
        title: "Analysis Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border/50 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-primary">
          <Brain className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">AI Doctor Recommendation</h3>
          <p className="text-sm text-muted-foreground">
            Describe your symptoms for smart doctor matching
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Textarea
          placeholder="Describe your symptoms... (e.g., chest pain, shortness of breath, fatigue, headache, skin rash)"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          className="min-h-[100px] resize-none bg-background/50 border-border/50 focus:border-primary/50"
        />
        
        <Button 
          variant="hero" 
          className="w-full gap-2"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !symptoms.trim()}
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Get AI Recommendations
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">AI-Recommended Doctors</h4>
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    <span className="font-medium">{rec.doctorName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {rec.specialty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-success/10 text-success border-0">
                      {rec.matchScore}% Match
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {rec.waitTime}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0">
                  Select <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
