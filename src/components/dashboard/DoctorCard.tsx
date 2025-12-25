import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Clock, Calendar } from "lucide-react";

interface DoctorCardProps {
  name: string;
  specialty: string;
  rating: number;
  availableSlots: number;
  nextAvailable: string;
  isAvailable: boolean;
  delay?: number;
}

export function DoctorCard({
  name,
  specialty,
  rating,
  availableSlots,
  nextAvailable,
  isAvailable,
  delay = 0,
}: DoctorCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Card 
      className="p-5 bg-gradient-card border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-4">
        <Avatar className="w-14 h-14 border-2 border-primary/20">
          <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold truncate">{name}</h4>
            <Badge 
              variant="outline" 
              className={isAvailable 
                ? "bg-success/10 text-success border-success/20" 
                : "bg-muted text-muted-foreground"
              }
            >
              {isAvailable ? "Available" : "Busy"}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">{specialty}</p>
          
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-sm font-medium">{rating}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{availableSlots} slots</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{nextAvailable}</span>
            </div>
          </div>
        </div>
      </div>
      
      <Button variant="outline" className="w-full mt-4">
        Book Appointment
      </Button>
    </Card>
  );
}
