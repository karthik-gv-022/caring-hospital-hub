import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  ChevronDown, 
  ChevronUp, 
  Pill, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Timer,
  ClipboardList,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { PrintablePrescription } from "./PrintablePrescription";

interface PrescriptionItem {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  created_at: string | null;
  valid_until: string | null;
  is_valid: boolean | null;
  items: PrescriptionItem[];
}

interface AppointmentWithDetails {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  symptoms: string | null;
  notes: string | null;
  created_at: string | null;
  doctor: {
    name: string;
    specialty: string;
  } | null;
  prescriptions: Prescription[];
}

interface AppointmentHistoryProps {
  patientId: string;
}

export function AppointmentHistory({ patientId }: AppointmentHistoryProps) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointmentHistory = async () => {
      setLoading(true);

      // Fetch appointments with doctor info
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          doctor:doctors(name, specialty)
        `)
        .eq("patient_id", patientId)
        .order("scheduled_date", { ascending: false });

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        setLoading(false);
        return;
      }

      // For each appointment, fetch related prescriptions
      const appointmentsWithPrescriptions = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          const { data: prescriptionsData } = await supabase
            .from("prescriptions")
            .select(`
              id,
              diagnosis,
              notes,
              created_at,
              valid_until,
              is_valid
            `)
            .eq("appointment_id", appointment.id);

          // For each prescription, fetch items
          const prescriptionsWithItems = await Promise.all(
            (prescriptionsData || []).map(async (prescription) => {
              const { data: itemsData } = await supabase
                .from("prescription_items")
                .select("*")
                .eq("prescription_id", prescription.id);

              return {
                ...prescription,
                items: (itemsData || []) as PrescriptionItem[]
              };
            })
          );

          return {
            ...appointment,
            prescriptions: prescriptionsWithItems
          } as AppointmentWithDetails;
        })
      );

      setAppointments(appointmentsWithPrescriptions);
      setLoading(false);
    };

    if (patientId) {
      fetchAppointmentHistory();
    }
  }, [patientId]);

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2; className?: string }> = {
      scheduled: { variant: "default", icon: Calendar },
      confirmed: { variant: "secondary", icon: CheckCircle2 },
      completed: { variant: "outline", icon: CheckCircle2, className: "border-success text-success" },
      cancelled: { variant: "destructive", icon: AlertCircle },
      pending: { variant: "default", icon: Timer },
    };

    const style = statusStyles[status] || { variant: "outline" as const, icon: AlertCircle };
    const Icon = style.icon;

    return (
      <Badge variant={style.variant} className={`gap-1 ${style.className || ""}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const completedAppointments = appointments.filter(a => a.status === "completed");
  const upcomingAppointments = appointments.filter(a => a.status !== "completed" && a.status !== "cancelled");
  const cancelledAppointments = appointments.filter(a => a.status === "cancelled");

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderAppointmentCard = (appointment: AppointmentWithDetails) => {
    const isExpanded = expandedAppointment === appointment.id;
    const hasPrescriptions = appointment.prescriptions.length > 0;

    return (
      <Card 
        key={appointment.id} 
        className={`transition-all duration-300 ${
          appointment.status === "completed" ? "border-l-4 border-l-success" : ""
        } ${isExpanded ? "ring-2 ring-primary/20" : "hover:border-primary/50"}`}
      >
        <Collapsible open={isExpanded} onOpenChange={() => setExpandedAppointment(isExpanded ? null : appointment.id)}>
          <CollapsibleTrigger asChild>
            <CardContent className="pt-6 cursor-pointer">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{appointment.doctor?.name || "Doctor"}</h3>
                      {getStatusBadge(appointment.status || "pending")}
                    </div>
                    <p className="text-sm text-muted-foreground">{appointment.doctor?.specialty}</p>
                    {appointment.symptoms && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Chief complaint:</span> {appointment.symptoms}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{format(new Date(appointment.scheduled_date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {appointment.scheduled_time}
                    </div>
                    {hasPrescriptions && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Pill className="w-3 h-3" />
                        {appointment.prescriptions.length} prescription(s)
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <Separator />
            <CardContent className="pt-6 space-y-6">
              {/* Visit Notes */}
              {appointment.notes && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    Visit Notes
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Prescriptions */}
              {appointment.prescriptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ClipboardList className="w-4 h-4" />
                    Prescriptions
                  </div>
                  
                  {appointment.prescriptions.map((prescription) => (
                    <Card key={prescription.id} className="bg-muted/30 border-dashed">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {prescription.diagnosis || "Prescription"}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <PrintablePrescription 
                              prescription={{
                                ...prescription,
                                doctor: appointment.doctor,
                              }}
                              trigger={
                                <Button variant="outline" size="sm" className="gap-1 h-7">
                                  <Printer className="w-3 h-3" />
                                  Print
                                </Button>
                              }
                            />
                            <Badge variant={prescription.is_valid ? "secondary" : "outline"}>
                              {prescription.is_valid ? "Active" : "Expired"}
                            </Badge>
                          </div>
                        </div>
                        {prescription.valid_until && (
                          <CardDescription>
                            Valid until: {format(new Date(prescription.valid_until), "MMM d, yyyy")}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {prescription.notes && (
                          <p className="text-sm text-muted-foreground italic">{prescription.notes}</p>
                        )}
                        
                        {prescription.items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Medications</p>
                            <div className="grid gap-2">
                              {prescription.items.map((item) => (
                                <div 
                                  key={item.id} 
                                  className="flex items-start gap-3 p-3 bg-background rounded-lg border"
                                >
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <Pill className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium">{item.medicine_name}</p>
                                      <Badge variant="outline" className="text-xs">
                                        Qty: {item.quantity}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <span className="bg-muted px-2 py-0.5 rounded">{item.dosage}</span>
                                      <span className="bg-muted px-2 py-0.5 rounded">{item.frequency}</span>
                                      <span className="bg-muted px-2 py-0.5 rounded">{item.duration}</span>
                                    </div>
                                    {item.instructions && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        <span className="font-medium">Instructions:</span> {item.instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No prescriptions for this visit
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No appointment history</p>
          <p className="text-muted-foreground">Your past visits will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Completed Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Pill className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {appointments.reduce((acc, a) => acc + a.prescriptions.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Prescriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming Appointments
          </h3>
          {upcomingAppointments.map(renderAppointmentCard)}
        </div>
      )}

      {/* Completed Appointments */}
      {completedAppointments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Past Visits
          </h3>
          {completedAppointments.map(renderAppointmentCard)}
        </div>
      )}

      {/* Cancelled Appointments */}
      {cancelledAppointments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            Cancelled
          </h3>
          {cancelledAppointments.map(renderAppointmentCard)}
        </div>
      )}
    </div>
  );
}
