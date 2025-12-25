import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Clock, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  available_slots: number;
  next_available: string;
  is_available: boolean;
}

interface DoctorCardProps {
  doctor: Doctor;
  delay?: number;
}

export function DoctorCard({ doctor, delay = 0 }: DoctorCardProps) {
  const initials = doctor.name
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
            <h4 className="font-semibold truncate">{doctor.name}</h4>
            <Badge
              variant="outline"
              className={
                doctor.is_available
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground"
              }
            >
              {doctor.is_available ? "Available" : "Busy"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-sm font-medium">{doctor.rating}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{doctor.available_slots} slots</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{doctor.next_available}</span>
            </div>
          </div>
        </div>
      </div>

      <BookAppointmentDialog 
        preselectedDoctorId={doctor.id}
        trigger={
          <Button
            variant="outline"
            className="w-full mt-4"
            disabled={!doctor.is_available}
          >
            Book Appointment
          </Button>
        }
      />
    </Card>
  );
}

export function DoctorsList() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("rating", { ascending: false });

      if (error) {
        console.error("Error fetching doctors:", error);
      } else {
        setDoctors(data || []);
      }
      setLoading(false);
    };

    fetchDoctors();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {doctors.slice(0, 4).map((doctor, index) => (
        <DoctorCard key={doctor.id} doctor={doctor} delay={index * 100} />
      ))}
    </div>
  );
}
