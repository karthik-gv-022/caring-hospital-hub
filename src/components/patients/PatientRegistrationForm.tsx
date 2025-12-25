import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { UserPlus, CheckCircle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export function PatientRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContact: "",
    symptoms: "",
    doctorId: "",
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase
        .from("doctors")
        .select("id, name, specialty")
        .eq("is_available", true);
      setDoctors(data || []);
    };
    fetchDoctors();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register as a patient.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create patient record
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          user_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email || user.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          address: formData.address || null,
          emergency_contact: formData.emergencyContact || null,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // Get next token number
      const { count } = await supabase
        .from("queue_tokens")
        .select("*", { count: "exact", head: true });

      const tokenNumber = `A${String((count || 0) + 1).padStart(3, "0")}`;

      // Get doctor info for department
      const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);

      // Create queue token
      const { error: tokenError } = await supabase.from("queue_tokens").insert({
        token_number: tokenNumber,
        patient_id: patient.id,
        doctor_id: formData.doctorId || null,
        department: selectedDoctor?.specialty || "General",
        status: "waiting",
        estimated_wait_minutes: 30,
        position: (count || 0) + 1,
      });

      if (tokenError) throw tokenError;

      toast({
        title: "Registration Successful!",
        description: `Token ${tokenNumber} has been assigned. Estimated wait time: 30 minutes.`,
      });

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        emergencyContact: "",
        symptoms: "",
        doctorId: "",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Card className="p-6 bg-gradient-card border-border/50">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LogIn className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
          <p className="text-muted-foreground mb-4">
            Please sign in to register as a patient
          </p>
          <Button variant="hero" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-primary">
          <UserPlus className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">Patient Registration</h3>
          <p className="text-sm text-muted-foreground">
            Register and get a queue token
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => handleChange("gender", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="doctorId">Preferred Doctor</Label>
          <Select
            value={formData.doctorId}
            onValueChange={(value) => handleChange("doctorId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a doctor (optional)" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="symptoms">Symptoms / Reason for Visit</Label>
          <Textarea
            id="symptoms"
            placeholder="Describe your symptoms or reason for visiting..."
            value={formData.symptoms}
            onChange={(e) => handleChange("symptoms", e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Register & Get Token
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
