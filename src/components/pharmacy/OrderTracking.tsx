import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  Phone,
  ChefHat,
  XCircle,
  Receipt,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  delivery_address: string;
  delivery_phone: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  pharmacy: { name: string; phone: string | null } | null;
  pharmacy_order_items: OrderItem[];
}

interface OrderTrackingProps {
  patientId?: string;
}

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { icon: Clock, label: "Order Placed", color: "text-yellow-500" },
  confirmed: { icon: CheckCircle2, label: "Confirmed", color: "text-blue-500" },
  preparing: { icon: ChefHat, label: "Preparing", color: "text-orange-500" },
  out_for_delivery: { icon: Truck, label: "Out for Delivery", color: "text-primary" },
  delivered: { icon: CheckCircle2, label: "Delivered", color: "text-green-500" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-destructive" },
};

const statusSteps = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

export function OrderTracking({ patientId }: OrderTrackingProps) {
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["pharmacy-orders", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("pharmacy_orders")
        .select(`
          *,
          pharmacy:pharmacies(name, phone),
          pharmacy_order_items(*)
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!patientId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel("pharmacy-orders-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pharmacy_orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pharmacy-orders", patientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-2/3 mb-4" />
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!patientId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sign in Required</h3>
          <p className="text-muted-foreground">
            Please sign in and register as a patient to view your orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
          <p className="text-muted-foreground">
            Your medicine orders will appear here once you place them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const config = statusConfig[order.status] || statusConfig.pending;
        const StatusIcon = config.icon;
        const currentStepIndex = statusSteps.indexOf(order.status);
        const isCancelled = order.status === "cancelled";

        return (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Order #{order.order_number}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleDateString()} at{" "}
                    {new Date(order.created_at).toLocaleTimeString()}
                  </CardDescription>
                </div>
                <Badge
                  variant={isCancelled ? "destructive" : "secondary"}
                  className={cn("gap-1", !isCancelled && config.color)}
                >
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Progress Steps */}
              {!isCancelled && (
                <div className="relative">
                  <div className="flex justify-between">
                    {statusSteps.map((step, index) => {
                      const stepConfig = statusConfig[step];
                      const StepIcon = stepConfig.icon;
                      const isCompleted = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;

                      return (
                        <div
                          key={step}
                          className="flex flex-col items-center relative z-10"
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                              isCompleted
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                              isCurrent && "ring-2 ring-primary ring-offset-2"
                            )}
                          >
                            <StepIcon className="w-4 h-4" />
                          </div>
                          <span
                            className={cn(
                              "text-xs mt-2 text-center hidden sm:block",
                              isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {stepConfig.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Progress Line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-0">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Estimated Delivery */}
              {order.estimated_delivery && order.status !== "delivered" && !isCancelled && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50">
                  <Truck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Estimated Delivery</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.estimated_delivery).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Delivered At */}
              {order.delivered_at && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Delivered</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.delivered_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Order Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Delivery Address</p>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{order.delivery_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="w-4 h-4" />
                    <span>{order.delivery_phone}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Pharmacy</p>
                  <p className="text-sm text-muted-foreground">
                    {order.pharmacy?.name || "Unknown Pharmacy"}
                  </p>
                  {order.pharmacy?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Phone className="w-4 h-4" />
                      <span>{order.pharmacy.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <p className="text-sm font-medium mb-2">Items</p>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2">
                    {order.pharmacy_order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {item.medicine_name} × {item.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          ₹{item.total_price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Order Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>₹{order.delivery_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">₹{order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant="outline" className="text-xs">
                    {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
