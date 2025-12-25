import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Stethoscope } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  is_available: boolean;
  next_available: string;
}

interface BookAppointmentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

export function BookAppointmentDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  trigger,
}: BookAppointmentDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;
  const { user } = useAuth();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchDoctors();
      fetchPatientId();
    }
  }, [open, user]);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_available", true)
      .order("name");

    if (data) {
      setDoctors(data);
    }
  };

  const fetchPatientId = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setPatientId(data.id);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select a doctor, date, and time",
        variant: "destructive",
      });
      return;
    }

    if (!patientId) {
      toast({
        title: "Patient Registration Required",
        description: "Please register as a patient first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("appointments").insert({
      patient_id: patientId,
      doctor_id: selectedDoctor,
      scheduled_date: selectedDate,
      scheduled_time: selectedTime,
      symptoms: symptoms.trim() || null,
      notes: notes.trim() || null,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been scheduled successfully.",
      });

      // Send confirmation notification
      try {
        await supabase.functions.invoke("send-appointment-notification", {
          body: {
            patientId,
            doctorId: selectedDoctor,
            date: selectedDate,
            time: selectedTime,
            type: "confirmation",
          },
        });
      } catch (e) {
        console.log("Notification service not available");
      }

      // Reset form
      setSelectedDoctor("");
      setSelectedDate("");
      setSelectedTime("");
      setSymptoms("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    }

    setLoading(false);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  const defaultTrigger = (
    <Button variant="hero" className="gap-2">
      <Calendar className="w-4 h-4" />
      Book Appointment
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {(trigger !== undefined ? trigger : defaultTrigger) && (
        <div onClick={() => onOpenChange(true)} className="cursor-pointer">
          {trigger !== undefined ? trigger : defaultTrigger}
        </div>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            Schedule an appointment with one of our available doctors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Select Doctor
            </Label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex flex-col">
                      <span>{doctor.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {doctor.specialty}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select Date
            </Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Select Time
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Symptoms */}
          <div className="space-y-2">
            <Label>Symptoms (Optional)</Label>
            <Textarea
              placeholder="Describe your symptoms..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Input
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={loading}>
            {loading ? "Booking..." : "Book Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
