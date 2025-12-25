import { Navbar } from "@/components/layout/Navbar";
import { DoctorCard } from "@/components/dashboard/DoctorCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Search, Filter, Plus } from "lucide-react";

const allDoctors = [
  { name: "Dr. Sarah Chen", specialty: "Cardiology", rating: 4.9, availableSlots: 5, nextAvailable: "10:30 AM", isAvailable: true },
  { name: "Dr. Michael Park", specialty: "Neurology", rating: 4.8, availableSlots: 3, nextAvailable: "11:00 AM", isAvailable: true },
  { name: "Dr. Lisa Wang", specialty: "Pediatrics", rating: 4.9, availableSlots: 7, nextAvailable: "10:15 AM", isAvailable: true },
  { name: "Dr. David Kim", specialty: "Orthopedics", rating: 4.7, availableSlots: 2, nextAvailable: "2:00 PM", isAvailable: false },
  { name: "Dr. Jennifer Lee", specialty: "Dermatology", rating: 4.8, availableSlots: 4, nextAvailable: "11:30 AM", isAvailable: true },
  { name: "Dr. Robert Taylor", specialty: "Internal Medicine", rating: 4.6, availableSlots: 6, nextAvailable: "10:00 AM", isAvailable: true },
  { name: "Dr. Amanda White", specialty: "Ophthalmology", rating: 4.9, availableSlots: 3, nextAvailable: "1:00 PM", isAvailable: true },
  { name: "Dr. Thomas Brown", specialty: "General Surgery", rating: 4.7, availableSlots: 1, nextAvailable: "3:30 PM", isAvailable: false },
];

const specialties = [
  "All Specialties",
  "Cardiology",
  "Neurology",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Internal Medicine",
  "Ophthalmology",
  "General Surgery",
];

const Doctors = () => {
  const availableCount = allDoctors.filter(d => d.isAvailable).length;

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
                <h1 className="text-3xl font-bold">Doctors</h1>
                <p className="text-muted-foreground">
                  {availableCount} of {allDoctors.length} doctors available
                </p>
              </div>
            </div>
            
            <Button variant="hero" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Doctor
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6 bg-gradient-card border-border/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search doctors by name..." className="pl-9" />
              </div>
              <Select defaultValue="All Specialties">
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Doctor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allDoctors.map((doctor, index) => (
              <DoctorCard
                key={doctor.name}
                {...doctor}
                delay={index * 50}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Doctors;
