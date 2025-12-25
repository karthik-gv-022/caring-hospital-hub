import { Navbar } from "@/components/layout/Navbar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QueueDisplay } from "@/components/dashboard/QueueDisplay";
import { DoctorCard } from "@/components/dashboard/DoctorCard";
import { AIRecommendation } from "@/components/dashboard/AIRecommendation";
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  Clock,
  Activity,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  { title: "Total Patients Today", value: "247", change: "+12% from yesterday", changeType: "positive" as const, icon: Users },
  { title: "Active Doctors", value: "18", change: "3 on break", changeType: "neutral" as const, icon: Stethoscope },
  { title: "Appointments", value: "156", change: "+8% from last week", changeType: "positive" as const, icon: Calendar },
  { title: "Avg. Wait Time", value: "24 min", change: "-5 min from yesterday", changeType: "positive" as const, icon: Clock },
];

const doctors = [
  { name: "Dr. Sarah Chen", specialty: "Cardiology", rating: 4.9, availableSlots: 5, nextAvailable: "10:30 AM", isAvailable: true },
  { name: "Dr. Michael Park", specialty: "Neurology", rating: 4.8, availableSlots: 3, nextAvailable: "11:00 AM", isAvailable: true },
  { name: "Dr. Lisa Wang", specialty: "Pediatrics", rating: 4.9, availableSlots: 7, nextAvailable: "10:15 AM", isAvailable: true },
  { name: "Dr. David Kim", specialty: "Orthopedics", rating: 4.7, availableSlots: 2, nextAvailable: "2:00 PM", isAvailable: false },
];

const Index = () => {
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
                <span className="text-sm font-medium text-primary">AI-Powered Healthcare</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                Smart Hospital{" "}
                <span className="text-gradient">Management</span>{" "}
                System
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                Streamline patient registration, optimize doctor allocation with AI, 
                and reduce wait times with intelligent queue management.
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
            {stats.map((stat, index) => (
              <StatsCard
                key={stat.title}
                {...stat}
                delay={index * 100}
              />
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
              <p className="text-muted-foreground">Book appointments with top specialists</p>
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
              <DoctorCard
                key={doctor.name}
                {...doctor}
                delay={index * 100}
              />
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
    </div>
  );
};

export default Index;
