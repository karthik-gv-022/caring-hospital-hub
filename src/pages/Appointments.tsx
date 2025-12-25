import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import {
  Calendar,
  Search,
  Plus,
  Clock,
  User,
  Stethoscope,
  MoreVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  symptoms: string | null;
  notes: string | null;
  patients: {
    first_name: string;
    last_name: string;
  } | null;
  doctors: {
    name: string;
    specialty: string;
  } | null;
}

const statusStyles: Record<string, string> = {
  confirmed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-muted text-muted-foreground border-muted",
};

const statusIcons: Record<string, React.ReactNode> = {
  confirmed: <CheckCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
};

const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patients (first_name, last_name),
        doctors (name, specialty)
      `)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) {
      console.error("Error fetching appointments:", error);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
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
      fetchAppointments();
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const searchLower = searchQuery.toLowerCase();
    const patientName = `${apt.patients?.first_name || ""} ${apt.patients?.last_name || ""}`.toLowerCase();
    const doctorName = apt.doctors?.name?.toLowerCase() || "";
    return patientName.includes(searchLower) || doctorName.includes(searchLower);
  });

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCount = appointments.filter((a) => a.scheduled_date === todayStr).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Appointments</h1>
                <p className="text-muted-foreground">
                  {confirmedCount} confirmed, {pendingCount} pending
                </p>
              </div>
            </div>

            <Button
              variant="hero"
              className="gap-2"
              onClick={() => setIsBookingOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Total</p>
                  <p className="text-2xl font-bold">{todayCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-accent">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold text-success">{confirmedCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="p-4 mb-6 bg-gradient-card border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient or doctor name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          {/* Appointments List */}
          <Card className="overflow-hidden bg-gradient-card border-border/50">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Appointments</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "No appointments match your search"
                    : "No appointments scheduled yet"}
                </p>
                <Button variant="hero" onClick={() => setIsBookingOpen(true)}>
                  Book an Appointment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-sm">Patient</th>
                      <th className="text-left p-4 font-semibold text-sm">Doctor</th>
                      <th className="text-left p-4 font-semibold text-sm">Department</th>
                      <th className="text-left p-4 font-semibold text-sm">Date & Time</th>
                      <th className="text-left p-4 font-semibold text-sm">Status</th>
                      <th className="text-right p-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((apt, index) => (
                      <tr
                        key={apt.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors animate-slide-up"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                              <User className="w-4 h-4 text-accent-foreground" />
                            </div>
                            <span className="font-medium">
                              {apt.patients?.first_name} {apt.patients?.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-muted-foreground" />
                            <span>{apt.doctors?.name || "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {apt.doctors?.specialty || "-"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{formatDate(apt.scheduled_date)}</span>
                            <span className="text-muted-foreground">at</span>
                            <span className="font-medium">{apt.scheduled_time}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={`gap-1 ${statusStyles[apt.status] || ""}`}
                          >
                            {statusIcons[apt.status]}
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {apt.status === "pending" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatus(apt.id, "confirmed")}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Confirm
                                </DropdownMenuItem>
                              )}
                              {apt.status !== "completed" && apt.status !== "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatus(apt.id, "completed")}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              {apt.status !== "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatus(apt.id, "cancelled")}
                                  className="text-destructive"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <BookAppointmentDialog
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        onSuccess={fetchAppointments}
      />
    </div>
  );
};

export default Appointments;
