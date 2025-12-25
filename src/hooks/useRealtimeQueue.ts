import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QueueToken {
  id: string;
  token_number: string;
  patient_id: string | null;
  doctor_id: string | null;
  department: string;
  status: string;
  estimated_wait_minutes: number;
  position: number | null;
  created_at: string;
  patients?: { first_name: string; last_name: string } | null;
  doctors?: { name: string; specialty: string } | null;
}

export function useRealtimeQueue() {
  const [queue, setQueue] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial queue
    const fetchQueue = async () => {
      const { data, error } = await supabase
        .from("queue_tokens")
        .select(`
          *,
          patients(first_name, last_name),
          doctors(name, specialty)
        `)
        .neq("status", "completed")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching queue:", error);
      } else {
        setQueue(data || []);
      }
      setLoading(false);
    };

    fetchQueue();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_tokens",
        },
        async (payload) => {
          console.log("Queue update received:", payload);
          
          // Refetch the entire queue to ensure consistency
          const { data } = await supabase
            .from("queue_tokens")
            .select(`
              *,
              patients(first_name, last_name),
              doctors(name, specialty)
            `)
            .neq("status", "completed")
            .order("position", { ascending: true })
            .order("created_at", { ascending: true });

          if (data) {
            setQueue(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { queue, loading };
}
