import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Wifi, WifiOff } from "lucide-react";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";
import { Skeleton } from "@/components/ui/skeleton";

const statusStyles: Record<string, string> = {
  waiting: "bg-muted text-muted-foreground",
  next: "bg-warning/10 text-warning border-warning/20",
  "in-progress": "bg-success/10 text-success border-success/20",
};

const statusLabels: Record<string, string> = {
  waiting: "Waiting",
  next: "Next",
  "in-progress": "In Progress",
};

export function QueueDisplay() {
  const { queue, loading } = useRealtimeQueue();

  return (
    <Card className="p-6 bg-gradient-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Live Queue</h3>
        <Badge variant="secondary" className="gap-1">
          {loading ? (
            <WifiOff className="w-3 h-3" />
          ) : (
            <Wifi className="w-3 h-3 text-success" />
          )}
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </Badge>
      </div>

      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50"
            >
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))
        ) : queue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No patients in queue</p>
            <p className="text-sm mt-1">Register a patient to get started</p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent font-bold text-accent-foreground">
                {item.token_number}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium truncate">
                    {item.patients
                      ? `${item.patients.first_name} ${item.patients.last_name}`
                      : "Unknown Patient"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {item.doctors?.name || "Unassigned"} • {item.department}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    ~{item.estimated_wait_minutes} min
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={statusStyles[item.status] || statusStyles.waiting}
                >
                  {statusLabels[item.status] || item.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
