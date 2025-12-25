import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Calendar,
  ArrowRight,
  Play,
  SkipForward,
  FileText,
  Pill,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { CreatePrescriptionDialog } from "@/components/doctor/CreatePrescriptionDialog";

interface QueueToken {
  id: string;
  token_number: string;
  department: string;
  status: string;
  position: number;
  estimated_wait_minutes: number;
  created_at: string;
  patient_id: string;
  patients?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  symptoms: string | null;
  notes: string | null;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  is_available: boolean;
}

const DoctorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentToken, setCurrentToken] = useState<QueueToken | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (user) {
      fetchDoctorData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("doctor-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        () => {
          fetchQueueTokens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchDoctorData = async () => {
    // First check if user is a doctor
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (doctorData) {
      setDoctorProfile(doctorData);
      await fetchQueueTokens(doctorData.id);
      await fetchAppointments(doctorData.id);
    }
    setLoading(false);
  };

  const fetchQueueTokens = async (doctorId?: string) => {
    const id = doctorId || doctorProfile?.id;
    if (!id) return;

    const { data } = await supabase
      .from("queue_tokens")
      .select(`
        *,
        patients (first_name, last_name, phone)
      `)
      .eq("doctor_id", id)
      .in("status", ["waiting", "in_progress"])
      .order("position", { ascending: true });

    if (data) {
      setQueueTokens(data);
      const inProgress = data.find((t) => t.status === "in_progress");
      setCurrentToken(inProgress || null);
    }
  };

  const fetchAppointments = async (doctorId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("appointments")
      .select(`
        *,
        patients (id, first_name, last_name, phone)
      `)
      .eq("doctor_id", doctorId)
      .eq("scheduled_date", today)
      .order("scheduled_time", { ascending: true });

    if (data) {
      setAppointments(data);
    }
  };

  const callNextPatient = async () => {
    const nextToken = queueTokens.find((t) => t.status === "waiting");
    if (!nextToken) {
      toast({
        title: "No patients waiting",
        description: "The queue is empty",
      });
      return;
    }

    // If there's a current patient, mark them as completed
    if (currentToken) {
      await supabase
        .from("queue_tokens")
        .update({ status: "completed" })
        .eq("id", currentToken.id);
    }

    // Call the next patient
    const { error } = await supabase
      .from("queue_tokens")
      .update({ status: "in_progress" })
      .eq("id", nextToken.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to call next patient",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Patient Called",
        description: `Token ${nextToken.token_number} - ${nextToken.patients?.first_name} ${nextToken.patients?.last_name}`,
      });
      
      // Trigger notification
      await sendNotification(nextToken);
      fetchQueueTokens();
    }
  };

  const sendNotification = async (token: QueueToken) => {
    try {
      await supabase.functions.invoke("send-queue-notification", {
        body: {
          tokenId: token.id,
          patientName: `${token.patients?.first_name} ${token.patients?.last_name}`,
          tokenNumber: token.token_number,
          type: "called",
        },
      });
    } catch (error) {
      console.log("Notification service not available");
    }
  };

  const skipPatient = async (tokenId: string) => {
    const { error } = await supabase
      .from("queue_tokens")
      .update({ status: "skipped" })
      .eq("id", tokenId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to skip patient",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Patient Skipped",
        description: "Patient has been moved to skipped status",
      });
      fetchQueueTokens();
    }
  };

  const completeCurrentPatient = async () => {
    if (!currentToken) return;

    const { error } = await supabase
      .from("queue_tokens")
      .update({ status: "completed" })
      .eq("id", currentToken.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to complete consultation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Consultation Complete",
        description: "Patient marked as completed",
      });
      setCurrentToken(null);
      fetchQueueTokens();
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Updated",
        description: `Appointment ${status}`,
      });
      if (doctorProfile) {
        fetchAppointments(doctorProfile.id);
      }
    }
  };

  const toggleAvailability = async () => {
    if (!doctorProfile) return;

    const { error } = await supabase
      .from("doctors")
      .update({ is_available: !doctorProfile.is_available })
      .eq("id", doctorProfile.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    } else {
      setDoctorProfile({
        ...doctorProfile,
        is_available: !doctorProfile.is_available,
      });
      toast({
        title: doctorProfile.is_available ? "Unavailable" : "Available",
        description: `You are now ${
          doctorProfile.is_available ? "offline" : "online"
        }`,
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!doctorProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-12">
          <div className="container mx-auto px-4 py-8">
            <Card className="p-12 text-center">
              <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Doctor Access Only</h2>
              <p className="text-muted-foreground">
                This dashboard is only accessible to registered doctors.
              </p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const waitingCount = queueTokens.filter((t) => t.status === "waiting").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
                <p className="text-muted-foreground">
                  {doctorProfile.name} - {doctorProfile.specialty}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={doctorProfile.is_available ? "default" : "secondary"}
                className="text-sm px-3 py-1"
              >
                {doctorProfile.is_available ? "Online" : "Offline"}
              </Badge>
              <Button
                variant={doctorProfile.is_available ? "outline" : "hero"}
                onClick={toggleAvailability}
              >
                {doctorProfile.is_available ? "Go Offline" : "Go Online"}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                  <p className="text-2xl font-bold">{waitingCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-warning/10">
                  <Users className="w-5 h-5 text-warning" />
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Today's Appointments
                  </p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-info/10">
                  <Calendar className="w-5 h-5 text-info" />
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                  <p className="text-2xl font-bold">
                    {waitingCount > 0
                      ? `${Math.round(waitingCount * 15)} min`
                      : "0 min"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-accent">
                  <Clock className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Patient */}
            <Card className="p-6 bg-gradient-card border-border/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Current Patient
              </h2>

              {currentToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default" className="text-lg px-4 py-1">
                        {currentToken.token_number}
                      </Badge>
                      <Badge variant="outline" className="bg-success/10 text-success">
                        In Progress
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold">
                      {currentToken.patients?.first_name}{" "}
                      {currentToken.patients?.last_name}
                    </h3>
                    {currentToken.patients?.phone && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {currentToken.patients.phone}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="hero"
                    className="w-full gap-2"
                    onClick={completeCurrentPatient}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Consultation
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No patient currently being served
                  </p>
                  <Button
                    variant="hero"
                    className="gap-2"
                    onClick={callNextPatient}
                    disabled={waitingCount === 0}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Call Next Patient
                  </Button>
                </div>
              )}
            </Card>

            {/* Queue */}
            <Card className="p-6 bg-gradient-card border-border/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Patient Queue ({waitingCount})
              </h2>

              {waitingCount === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-muted-foreground">No patients waiting</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {queueTokens
                    .filter((t) => t.status === "waiting")
                    .map((token, index) => (
                      <div
                        key={token.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{token.token_number}</Badge>
                          <div>
                            <p className="font-medium">
                              {token.patients?.first_name}{" "}
                              {token.patients?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Est. wait: {(index + 1) * 15} min
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => skipPatient(token.id)}
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>

          {/* Today's Appointments */}
          <Card className="p-6 mt-6 bg-gradient-card border-border/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today's Appointments
            </h2>

            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No appointments scheduled for today
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Time</th>
                      <th className="text-left p-3 font-semibold">Patient</th>
                      <th className="text-left p-3 font-semibold">Symptoms</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-right p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-border/50">
                        <td className="p-3 font-medium">{apt.scheduled_time}</td>
                        <td className="p-3">
                          {apt.patients?.first_name} {apt.patients?.last_name}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {apt.symptoms || "-"}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              apt.status === "confirmed"
                                ? "default"
                                : apt.status === "completed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {apt.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {apt.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateAppointmentStatus(apt.id, "confirmed")
                                  }
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    updateAppointmentStatus(apt.id, "cancelled")
                                  }
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {apt.status === "confirmed" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointment(apt);
                                    setPrescriptionOpen(true);
                                  }}
                                  title="Write Prescription"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="hero"
                                  size="sm"
                                  onClick={() =>
                                    updateAppointmentStatus(apt.id, "completed")
                                  }
                                >
                                  Complete
                                </Button>
                              </>
                            )}
                            {apt.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(apt);
                                  setPrescriptionOpen(true);
                                }}
                                title="Write Prescription"
                              >
                                <Pill className="w-4 h-4 mr-1" />
                                Prescribe
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Prescription Dialog */}
      {doctorProfile && (
        <CreatePrescriptionDialog
          open={prescriptionOpen}
          onOpenChange={setPrescriptionOpen}
          doctorId={doctorProfile.id}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
