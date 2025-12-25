import { Navbar } from "@/components/layout/Navbar";
import { PatientRegistrationForm } from "@/components/patients/PatientRegistrationForm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, Eye, Edit, MoreHorizontal } from "lucide-react";

const recentPatients = [
  { id: "P001", name: "John Smith", age: 45, department: "Cardiology", token: "A001", status: "In Progress" },
  { id: "P002", name: "Emma Wilson", age: 32, department: "Neurology", token: "A002", status: "Waiting" },
  { id: "P003", name: "James Brown", age: 28, department: "Cardiology", token: "A003", status: "Waiting" },
  { id: "P004", name: "Olivia Davis", age: 8, department: "Pediatrics", token: "A004", status: "Waiting" },
  { id: "P005", name: "William Johnson", age: 55, department: "Orthopedics", token: "A005", status: "Waiting" },
];

const statusStyles: Record<string, string> = {
  "In Progress": "bg-success/10 text-success border-success/20",
  "Waiting": "bg-warning/10 text-warning border-warning/20",
  "Completed": "bg-muted text-muted-foreground",
};

const Patients = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Patient Management</h1>
              <p className="text-muted-foreground">Register and manage patient records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Registration Form */}
            <PatientRegistrationForm />

            {/* Recent Patients */}
            <Card className="p-6 bg-gradient-card border-border/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Today's Patients</h3>
                <Badge variant="secondary">{recentPatients.length} patients</Badge>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." className="pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {recentPatients.map((patient, index) => (
                  <div 
                    key={patient.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all duration-200 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent font-semibold text-sm text-accent-foreground">
                      {patient.token}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{patient.name}</p>
                        <span className="text-sm text-muted-foreground">• {patient.age}y</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {patient.department}
                      </p>
                    </div>

                    <Badge variant="outline" className={statusStyles[patient.status]}>
                      {patient.status}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Patients;
