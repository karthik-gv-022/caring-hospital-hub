import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { DoctorCard } from "@/components/dashboard/DoctorCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Search, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  available_slots: number;
  next_available: string;
  is_available: boolean;
}

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
  "Pulmonology",
  "Gastroenterology",
];

const Doctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  const [selectedAvailability, setSelectedAvailability] = useState("all");

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

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = doctor.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === "All Specialties" ||
      doctor.specialty === selectedSpecialty;
    const matchesAvailability =
      selectedAvailability === "all" ||
      (selectedAvailability === "available" && doctor.is_available) ||
      (selectedAvailability === "busy" && !doctor.is_available);

    return matchesSearch && matchesSpecialty && matchesAvailability;
  });

  const availableCount = doctors.filter((d) => d.is_available).length;

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
                  {availableCount} of {doctors.length} doctors available
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
                <Input
                  placeholder="Search doctors by name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={selectedSpecialty}
                onValueChange={setSelectedSpecialty}
              >
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
              <Select
                value={selectedAvailability}
                onValueChange={setSelectedAvailability}
              >
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No doctors found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDoctors.map((doctor, index) => (
                <DoctorCard key={doctor.id} doctor={doctor} delay={index * 50} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Doctors;
