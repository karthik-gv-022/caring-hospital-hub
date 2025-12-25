import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Stethoscope, Clock, ArrowRight } from "lucide-react";

interface Recommendation {
  doctor: string;
  specialty: string;
  matchScore: number;
  reason: string;
  waitTime: string;
}

export function AIRecommendation() {
  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const handleAnalyze = () => {
    if (!symptoms.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setRecommendations([
        {
          doctor: "Dr. Sarah Chen",
          specialty: "Cardiology",
          matchScore: 95,
          reason: "Specialist in symptoms related to chest discomfort and heart conditions",
          waitTime: "~15 min",
        },
        {
          doctor: "Dr. Michael Park",
          specialty: "Internal Medicine",
          matchScore: 82,
          reason: "General practitioner with expertise in diagnostic evaluations",
          waitTime: "~25 min",
        },
        {
          doctor: "Dr. Lisa Wang",
          specialty: "Pulmonology",
          matchScore: 78,
          reason: "Specialist in respiratory conditions if breathing-related",
          waitTime: "~30 min",
        },
      ]);
      setIsAnalyzing(false);
    }, 2000);
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
          placeholder="Describe your symptoms... (e.g., chest pain, shortness of breath, fatigue)"
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
              Analyzing Symptoms...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Get AI Recommendations
            </>
          )}
        </Button>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Recommended Doctors</h4>
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
                    <span className="font-medium">{rec.doctor}</span>
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
