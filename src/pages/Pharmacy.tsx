import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Pill, 
  Search, 
  ShoppingCart, 
  FileText, 
  Package, 
  Truck,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  CreditCard,
  AlertCircle,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrescriptionList } from "@/components/pharmacy/PrescriptionList";
import { OrderTracking } from "@/components/pharmacy/OrderTracking";
import { CheckoutDialog } from "@/components/pharmacy/CheckoutDialog";

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  category: string;
  description: string | null;
  price: number;
  requires_prescription: boolean;
  stock_quantity: number;
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  is_valid: boolean;
  valid_until: string;
  created_at: string;
  doctor: { name: string; specialty: string } | null;
  prescription_items: {
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions: string | null;
    medicine_id: string | null;
  }[];
}

export default function Pharmacy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Fetch patient info
  const { data: patient } = useQuery({
    queryKey: ["patient", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch medicines
  const { data: medicines = [], isLoading: loadingMedicines } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Medicine[];
    },
  });

  // Fetch prescriptions for current patient
  const { data: prescriptions = [], isLoading: loadingPrescriptions } = useQuery({
    queryKey: ["prescriptions", patient?.id],
    queryFn: async () => {
      if (!patient) return [];
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          doctor:doctors(name, specialty),
          prescription_items(*)
        `)
        .eq("patient_id", patient.id)
        .eq("is_valid", true)
        .gte("valid_until", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prescription[];
    },
    enabled: !!patient,
  });

  // Get unique categories
  const categories = ["all", ...new Set(medicines.map(m => m.category))];

  // Filter medicines
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || medicine.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart functions
  const addToCart = (medicine: Medicine, quantity: number = 1) => {
    if (medicine.requires_prescription && !selectedPrescription) {
      toast({
        title: "Prescription Required",
        description: "Please select a valid prescription to order this medicine.",
        variant: "destructive",
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.medicine.id === medicine.id);
      if (existing) {
        return prev.map(item =>
          item.medicine.id === medicine.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { medicine, quantity }];
    });

    toast({
      title: "Added to Cart",
      description: `${medicine.name} added to your cart.`,
    });
  };

  const updateCartQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(medicineId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.medicine.id === medicineId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => prev.filter(item => item.medicine.id !== medicineId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.medicine.price * item.quantity, 0);
  const hasRxItems = cart.some(item => item.medicine.requires_prescription);

  // Add prescription items to cart
  const addPrescriptionToCart = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    
    prescription.prescription_items.forEach(item => {
      const medicine = medicines.find(m => m.id === item.medicine_id);
      if (medicine) {
        setCart(prev => {
          const existing = prev.find(c => c.medicine.id === medicine.id);
          if (!existing) {
            return [...prev, { medicine, quantity: item.quantity }];
          }
          return prev;
        });
      }
    });

    toast({
      title: "Prescription Added",
      description: "Medicines from prescription added to cart.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Pill className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pharmacy</h1>
            <p className="text-muted-foreground">Order medicines with delivery</p>
          </div>
        </div>

        <Tabs defaultValue="medicines" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="medicines" className="gap-2">
              <Pill className="w-4 h-4" />
              Medicines
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2">
              <FileText className="w-4 h-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Medicines Tab */}
          <TabsContent value="medicines" className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search medicines..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="w-full sm:w-auto">
                    <div className="flex gap-2 pb-2">
                      {categories.map(cat => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat)}
                          className="capitalize whitespace-nowrap"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Selected Prescription Banner */}
                {selectedPrescription && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Prescription Selected</p>
                          <p className="text-sm text-muted-foreground">
                            By Dr. {selectedPrescription.doctor?.name} • Valid until {new Date(selectedPrescription.valid_until).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPrescription(null)}>
                        Clear
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Medicines Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingMedicines ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-6 bg-muted rounded mb-2" />
                          <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                          <div className="h-8 bg-muted rounded" />
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredMedicines.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No medicines found</p>
                    </div>
                  ) : (
                    filteredMedicines.map(medicine => (
                      <Card key={medicine.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">{medicine.name}</CardTitle>
                              {medicine.generic_name && (
                                <CardDescription className="text-xs">
                                  {medicine.generic_name}
                                </CardDescription>
                              )}
                            </div>
                            {medicine.requires_prescription && (
                              <Badge variant="secondary" className="text-xs">
                                Rx
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            {medicine.manufacturer} • {medicine.category}
                          </p>
                          {medicine.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {medicine.description}
                            </p>
                          )}
                        </CardContent>
                        <CardFooter className="flex items-center justify-between pt-2">
                          <span className="font-semibold text-primary">
                            ₹{medicine.price.toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => addToCart(medicine)}
                            disabled={medicine.stock_quantity === 0}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Cart Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Cart ({cart.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Your cart is empty</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-4">
                          {cart.map(item => (
                            <div key={item.medicine.id} className="flex gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.medicine.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  ₹{item.medicine.price.toFixed(2)} each
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateCartQuantity(item.medicine.id, item.quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateCartQuantity(item.medicine.id, item.quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeFromCart(item.medicine.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                  {cart.length > 0 && (
                    <>
                      <Separator />
                      <CardFooter className="flex-col gap-4 pt-4">
                        {hasRxItems && !selectedPrescription && (
                          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg w-full">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-xs text-destructive">
                              Please select a prescription for prescription-only medicines
                            </p>
                          </div>
                        )}
                        <div className="flex justify-between w-full">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">₹{cartTotal.toFixed(2)}</span>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => setIsCheckoutOpen(true)}
                          disabled={!patient || (hasRxItems && !selectedPrescription)}
                        >
                          Checkout
                        </Button>
                        {!patient && (
                          <p className="text-xs text-center text-muted-foreground">
                            Please register as a patient to place orders
                          </p>
                        )}
                      </CardFooter>
                    </>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions">
            <PrescriptionList
              prescriptions={prescriptions}
              loading={loadingPrescriptions}
              onAddToCart={addPrescriptionToCart}
            />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrderTracking patientId={patient?.id} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        cart={cart}
        patient={patient}
        prescriptionId={selectedPrescription?.id}
        onSuccess={() => {
          setCart([]);
          setSelectedPrescription(null);
        }}
      />
    </div>
  );
}
