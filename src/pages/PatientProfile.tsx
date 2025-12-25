import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, Stethoscope, Activity, AlertCircle, CheckCircle2, Timer, History } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import { AppointmentHistory } from "@/components/patients/AppointmentHistory";

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  symptoms: string | null;
  notes: string | null;
  doctor: {
    name: string;
    specialty: string;
  } | null;
}

interface QueueToken {
  id: string;
  token_number: string;
  department: string;
  position: number | null;
  status: string | null;
  estimated_wait_minutes: number | null;
  created_at: string | null;
  doctor: {
    name: string;
  } | null;
}

interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
}

const PatientProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user) return;

      setLoading(true);

      // Fetch patient profile
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (patientData) {
        setPatient(patientData);

        // Fetch appointments
        const { data: appointmentsData } = await supabase
          .from("appointments")
          .select(`
            *,
            doctor:doctors(name, specialty)
          `)
          .eq("patient_id", patientData.id)
          .order("scheduled_date", { ascending: false });

        if (appointmentsData) {
          setAppointments(appointmentsData as unknown as Appointment[]);
        }

        // Fetch queue tokens
        const { data: queueData } = await supabase
          .from("queue_tokens")
          .select(`
            *,
            doctor:doctors(name)
          `)
          .eq("patient_id", patientData.id)
          .order("created_at", { ascending: false });

        if (queueData) {
          setQueueTokens(queueData as unknown as QueueToken[]);
        }
      }

      setLoading(false);
    };

    fetchPatientData();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
      scheduled: { variant: "default", icon: Calendar },
      confirmed: { variant: "secondary", icon: CheckCircle2 },
      completed: { variant: "outline", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: AlertCircle },
      waiting: { variant: "default", icon: Timer },
      "in-progress": { variant: "secondary", icon: Activity },
    };

    const style = statusStyles[status] || { variant: "outline" as const, icon: AlertCircle };
    const Icon = style.icon;

    return (
      <Badge variant={style.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
              <CardTitle>No Patient Profile Found</CardTitle>
              <CardDescription>
                Please register as a patient first to view your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/patients")}>
                Register as Patient
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const activeQueueTokens = queueTokens.filter(t => t.status === "waiting" || t.status === "in-progress");
  const upcomingAppointments = appointments.filter(a => a.status === "scheduled" || a.status === "confirmed");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
                <p className="text-muted-foreground">{patient.email}</p>
              </div>
            </div>
            <BookAppointmentDialog />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeQueueTokens.length}</p>
                  <p className="text-sm text-muted-foreground">Active in Queue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <Calendar className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{appointments.filter(a => a.status === "completed").length}</p>
                  <p className="text-sm text-muted-foreground">Completed Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Appointments and Queue */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Visit History
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="w-4 h-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Timer className="w-4 h-4" />
              Queue Status
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <AppointmentHistory patientId={patient.id} />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No appointments yet</p>
                  <BookAppointmentDialog />
                </CardContent>
              </Card>
            ) : (
              appointments.map((appointment) => (
                <Card key={appointment.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Stethoscope className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{appointment.doctor?.name || "Doctor"}</h3>
                          <p className="text-sm text-muted-foreground">{appointment.doctor?.specialty}</p>
                          {appointment.symptoms && (
                            <p className="text-sm mt-1">Symptoms: {appointment.symptoms}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end gap-2">
                        {getStatusBadge(appointment.status || "scheduled")}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(appointment.scheduled_date), "MMM d, yyyy")}
                          <Clock className="w-4 h-4 ml-2" />
                          {appointment.scheduled_time}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            {queueTokens.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Timer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No queue history</p>
                </CardContent>
              </Card>
            ) : (
              queueTokens.map((token) => (
                <Card key={token.id} className={`hover:border-primary/50 transition-colors ${token.status === "waiting" || token.status === "in-progress" ? "border-primary" : ""}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <span className="text-lg font-bold text-primary">{token.token_number}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{token.department}</h3>
                          <p className="text-sm text-muted-foreground">
                            {token.doctor?.name || "Waiting for assignment"}
                          </p>
                          {token.position && (
                            <p className="text-sm">Position: #{token.position}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end gap-2">
                        {getStatusBadge(token.status || "waiting")}
                        {token.estimated_wait_minutes && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            ~{token.estimated_wait_minutes} min wait
                          </div>
                        )}
                        {token.created_at && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(token.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your registered patient information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Full Name</label>
                    <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="font-medium">{patient.email || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <p className="font-medium">{patient.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Date of Birth</label>
                    <p className="font-medium">
                      {patient.date_of_birth 
                        ? format(new Date(patient.date_of_birth), "MMMM d, yyyy") 
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Gender</label>
                    <p className="font-medium">{patient.gender || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Address</label>
                    <p className="font-medium">{patient.address || "Not provided"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientProfile;
