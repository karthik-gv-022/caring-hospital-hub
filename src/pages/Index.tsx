import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QueueDisplay } from "@/components/dashboard/QueueDisplay";
import { DoctorCard } from "@/components/dashboard/DoctorCard";
import { AIRecommendation } from "@/components/dashboard/AIRecommendation";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import {
  Users,
  Stethoscope,
  Calendar,
  Clock,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  available_slots: number;
  next_available: string;
  is_available: boolean;
}

const Index = () => {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | undefined>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeDoctors: 0,
    appointments: 0,
    avgWaitTime: 0,
  });

  useEffect(() => {
    const fetchPatientId = async () => {
      if (!user) {
        setPatientId(undefined);
        return;
      }
      const { data } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPatientId(data.id);
      }
    };
    fetchPatientId();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch doctors
      const { data: doctorsData } = await supabase
        .from("doctors")
        .select("*")
        .order("rating", { ascending: false })
        .limit(4);

      if (doctorsData) {
        setDoctors(doctorsData);
      }

      // Fetch stats
      const { count: patientsCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      const { count: doctorsCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("is_available", true);

      const { count: appointmentsCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });

      const { data: queueData } = await supabase
        .from("queue_tokens")
        .select("estimated_wait_minutes")
        .neq("status", "completed");

      const avgWait =
        queueData && queueData.length > 0
          ? Math.round(
              queueData.reduce((acc, t) => acc + t.estimated_wait_minutes, 0) /
                queueData.length
            )
          : 24;

      setStats({
        totalPatients: patientsCount || 0,
        activeDoctors: doctorsCount || 0,
        appointments: appointmentsCount || 0,
        avgWaitTime: avgWait,
      });
    };

    fetchData();
  }, []);

  const statsData = [
    {
      title: "Total Patients Today",
      value: stats.totalPatients.toString(),
      change: "Registered patients",
      changeType: "neutral" as const,
      icon: Users,
    },
    {
      title: "Active Doctors",
      value: stats.activeDoctors.toString(),
      change: "Currently available",
      changeType: "positive" as const,
      icon: Stethoscope,
    },
    {
      title: "Appointments",
      value: stats.appointments.toString(),
      change: "Total scheduled",
      changeType: "neutral" as const,
      icon: Calendar,
    },
    {
      title: "Avg. Wait Time",
      value: `${stats.avgWaitTime} min`,
      change: "Current estimate",
      changeType: "neutral" as const,
      icon: Clock,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-5" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-pulse-slow" />

          <div className="container mx-auto px-4 py-12 relative">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">
                  AI-Powered Healthcare
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                Smart Hospital{" "}
                <span className="text-gradient">Management</span> System
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                Streamline patient registration, optimize doctor allocation with
                AI, and reduce wait times with intelligent queue management.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/patients">
                  <Button variant="hero" size="xl" className="gap-2">
                    Register Patient
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/doctors">
                  <Button variant="outline" size="xl">
                    View Doctors
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.map((stat, index) => (
              <StatsCard key={stat.title} {...stat} delay={index * 100} />
            ))}
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Queue Display */}
            <div className="lg:col-span-2">
              <QueueDisplay />
            </div>

            {/* AI Recommendation */}
            <div>
              <AIRecommendation />
            </div>
          </div>
        </section>

        {/* Available Doctors */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Available Doctors</h2>
              <p className="text-muted-foreground">
                Book appointments with top specialists
              </p>
            </div>
            <Link to="/doctors">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.map((doctor, index) => (
              <DoctorCard key={doctor.id} doctor={doctor} delay={index * 100} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-semibold">MediAI Hospital System</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 MediAI. Powered by AI for better healthcare.
            </p>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <ChatbotWidget patientId={patientId} />
    </div>
  );
};

export default Index;
