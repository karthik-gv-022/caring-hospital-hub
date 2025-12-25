import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Hash } from "lucide-react";

interface QueueItem {
  id: string;
  tokenNumber: string;
  patientName: string;
  doctor: string;
  department: string;
  estimatedWait: string;
  status: "waiting" | "in-progress" | "next";
}

const mockQueue: QueueItem[] = [
  { id: "1", tokenNumber: "A001", patientName: "John Smith", doctor: "Dr. Sarah Chen", department: "Cardiology", estimatedWait: "5 min", status: "in-progress" },
  { id: "2", tokenNumber: "A002", patientName: "Emma Wilson", doctor: "Dr. Michael Park", department: "Neurology", estimatedWait: "15 min", status: "next" },
  { id: "3", tokenNumber: "A003", patientName: "James Brown", doctor: "Dr. Sarah Chen", department: "Cardiology", estimatedWait: "25 min", status: "waiting" },
  { id: "4", tokenNumber: "A004", patientName: "Olivia Davis", doctor: "Dr. Lisa Wang", department: "Pediatrics", estimatedWait: "30 min", status: "waiting" },
  { id: "5", tokenNumber: "A005", patientName: "William Johnson", doctor: "Dr. David Kim", department: "Orthopedics", estimatedWait: "40 min", status: "waiting" },
];

const statusStyles = {
  "waiting": "bg-muted text-muted-foreground",
  "next": "bg-warning/10 text-warning border-warning/20",
  "in-progress": "bg-success/10 text-success border-success/20",
};

const statusLabels = {
  "waiting": "Waiting",
  "next": "Next",
  "in-progress": "In Progress",
};

export function QueueDisplay() {
  return (
    <Card className="p-6 bg-gradient-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Live Queue</h3>
        <Badge variant="secondary" className="gap-1">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </Badge>
      </div>
      
      <div className="space-y-3">
        {mockQueue.map((item, index) => (
          <div 
            key={item.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all duration-200 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent font-bold text-accent-foreground">
              {item.tokenNumber}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium truncate">{item.patientName}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {item.doctor} • {item.department}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {item.estimatedWait}
                </div>
              </div>
              <Badge variant="outline" className={statusStyles[item.status]}>
                {statusLabels[item.status]}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
