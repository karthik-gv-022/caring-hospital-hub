import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Phone, 
  CreditCard, 
  Banknote, 
  Truck,
  Store,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Medicine {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  delivery_fee: number;
  estimated_delivery_minutes: number;
  rating: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  patient: Patient | null;
  prescriptionId?: string;
  onSuccess: () => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  patient,
  prescriptionId,
  onSuccess,
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"details" | "pharmacy" | "confirm">("details");
  const [deliveryAddress, setDeliveryAddress] = useState(patient?.address || "");
  const [deliveryPhone, setDeliveryPhone] = useState(patient?.phone || "");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);

  // Fetch pharmacies
  const { data: pharmacies = [] } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Pharmacy[];
    },
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.medicine.price * item.quantity, 0);
  const deliveryFee = selectedPharmacy?.delivery_fee || 50;
  const total = subtotal + deliveryFee;

  // Generate order number
  const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MED${timestamp}${random}`;
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!patient || !selectedPharmacy) throw new Error("Missing required data");

      const orderNumber = generateOrderNumber();
      const estimatedDelivery = new Date();
      estimatedDelivery.setMinutes(
        estimatedDelivery.getMinutes() + selectedPharmacy.estimated_delivery_minutes
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("pharmacy_orders")
        .insert({
          order_number: orderNumber,
          patient_id: patient.id,
          pharmacy_id: selectedPharmacy.id,
          prescription_id: prescriptionId || null,
          delivery_address: deliveryAddress,
          delivery_phone: deliveryPhone,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: paymentMethod,
          notes: notes || null,
          estimated_delivery: estimatedDelivery.toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        medicine_id: item.medicine.id,
        medicine_name: item.medicine.name,
        quantity: item.quantity,
        unit_price: item.medicine.price,
        total_price: item.medicine.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("pharmacy_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: (order) => {
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${order.order_number} has been placed. You can track it in the Orders tab.`,
      });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders"] });
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to Place Order",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStep("details");
    setDeliveryAddress(patient?.address || "");
    setDeliveryPhone(patient?.phone || "");
    setNotes("");
    setPaymentMethod("cod");
    setSelectedPharmacy(null);
  };

  const handleNext = () => {
    if (step === "details") {
      if (!deliveryAddress.trim() || !deliveryPhone.trim()) {
        toast({
          title: "Missing Information",
          description: "Please fill in delivery address and phone number",
          variant: "destructive",
        });
        return;
      }
      setStep("pharmacy");
    } else if (step === "pharmacy") {
      if (!selectedPharmacy) {
        toast({
          title: "Select Pharmacy",
          description: "Please select a pharmacy for your order",
          variant: "destructive",
        });
        return;
      }
      setStep("confirm");
    }
  };

  const handleBack = () => {
    if (step === "pharmacy") setStep("details");
    else if (step === "confirm") setStep("pharmacy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "details" && "Delivery Details"}
            {step === "pharmacy" && "Select Pharmacy"}
            {step === "confirm" && "Confirm Order"}
          </DialogTitle>
          <DialogDescription>
            {step === "details" && "Enter your delivery address and contact information"}
            {step === "pharmacy" && "Choose a pharmacy for your order"}
            {step === "confirm" && "Review your order before placing"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Delivery Details */}
          {step === "details" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your full address"
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions for delivery..."
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/50">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Banknote className="w-4 h-4" />
                      Cash on Delivery
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 opacity-50">
                    <RadioGroupItem value="online" id="online" disabled />
                    <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="w-4 h-4" />
                      Online Payment (Coming Soon)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Select Pharmacy */}
          {step === "pharmacy" && (
            <div className="space-y-3 py-4">
              {pharmacies.map((pharmacy) => (
                <div
                  key={pharmacy.id}
                  onClick={() => setSelectedPharmacy(pharmacy)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-colors",
                    selectedPharmacy?.id === pharmacy.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{pharmacy.name}</p>
                        <p className="text-sm text-muted-foreground">{pharmacy.address}</p>
                      </div>
                    </div>
                    {selectedPharmacy?.id === pharmacy.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      ~{pharmacy.estimated_delivery_minutes} mins
                    </span>
                    <span>₹{pharmacy.delivery_fee} delivery</span>
                    <span>★ {pharmacy.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Confirm Order */}
          {step === "confirm" && (
            <div className="space-y-4 py-4">
              {/* Order Summary */}
              <div className="space-y-2">
                <p className="font-medium">Order Items</p>
                <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                  {cart.map((item) => (
                    <div key={item.medicine.id} className="flex justify-between text-sm">
                      <span>
                        {item.medicine.name} × {item.quantity}
                      </span>
                      <span>₹{(item.medicine.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Delivery Info */}
              <div className="space-y-2">
                <p className="font-medium">Delivery Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{deliveryPhone}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pharmacy Info */}
              <div className="space-y-2">
                <p className="font-medium">Pharmacy</p>
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedPharmacy?.name}</span>
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-3 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  <span className="text-sm font-medium">Cash on Delivery</span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {step !== "details" && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {step !== "confirm" ? (
            <Button onClick={handleNext} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
              className="flex-1"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                `Place Order • ₹${total.toFixed(2)}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
