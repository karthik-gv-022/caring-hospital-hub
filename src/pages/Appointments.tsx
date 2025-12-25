import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Plus, Clock, User, Stethoscope, MoreVertical, CheckCircle, XCircle } from "lucide-react";

const appointments = [
  { id: 1, patient: "John Smith", doctor: "Dr. Sarah Chen", department: "Cardiology", date: "Dec 25, 2025", time: "10:30 AM", status: "Confirmed" },
  { id: 2, patient: "Emma Wilson", doctor: "Dr. Michael Park", department: "Neurology", date: "Dec 25, 2025", time: "11:00 AM", status: "Confirmed" },
  { id: 3, patient: "James Brown", doctor: "Dr. Sarah Chen", department: "Cardiology", date: "Dec 25, 2025", time: "11:30 AM", status: "Pending" },
  { id: 4, patient: "Olivia Davis", doctor: "Dr. Lisa Wang", department: "Pediatrics", date: "Dec 25, 2025", time: "2:00 PM", status: "Confirmed" },
  { id: 5, patient: "William Johnson", doctor: "Dr. David Kim", department: "Orthopedics", date: "Dec 25, 2025", time: "3:00 PM", status: "Cancelled" },
  { id: 6, patient: "Sophia Martinez", doctor: "Dr. Jennifer Lee", department: "Dermatology", date: "Dec 26, 2025", time: "9:00 AM", status: "Confirmed" },
  { id: 7, patient: "Benjamin Lee", doctor: "Dr. Robert Taylor", department: "Internal Medicine", date: "Dec 26, 2025", time: "10:00 AM", status: "Pending" },
  { id: 8, patient: "Mia Anderson", doctor: "Dr. Amanda White", department: "Ophthalmology", date: "Dec 26, 2025", time: "11:00 AM", status: "Confirmed" },
];

const statusStyles: Record<string, string> = {
  "Confirmed": "bg-success/10 text-success border-success/20",
  "Pending": "bg-warning/10 text-warning border-warning/20",
  "Cancelled": "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcons: Record<string, React.ReactNode> = {
  "Confirmed": <CheckCircle className="w-3.5 h-3.5" />,
  "Pending": <Clock className="w-3.5 h-3.5" />,
  "Cancelled": <XCircle className="w-3.5 h-3.5" />,
};

const Appointments = () => {
  const confirmedCount = appointments.filter(a => a.status === "Confirmed").length;
  const pendingCount = appointments.filter(a => a.status === "Pending").length;

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
                  {confirmedCount} confirmed, {pendingCount} pending today
                </p>
              </div>
            </div>
            
            <Button variant="hero" className="gap-2">
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
                  <p className="text-2xl font-bold">{appointments.filter(a => a.date === "Dec 25, 2025").length}</p>
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
              <Input placeholder="Search by patient or doctor name..." className="pl-9" />
            </div>
          </Card>

          {/* Appointments List */}
          <Card className="overflow-hidden bg-gradient-card border-border/50">
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
                  {appointments.map((apt, index) => (
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
                          <span className="font-medium">{apt.patient}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-muted-foreground" />
                          <span>{apt.doctor}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{apt.department}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{apt.date}</span>
                          <span className="text-muted-foreground">at</span>
                          <span className="font-medium">{apt.time}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={`gap-1 ${statusStyles[apt.status]}`}>
                          {statusIcons[apt.status]}
                          {apt.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Appointments;
