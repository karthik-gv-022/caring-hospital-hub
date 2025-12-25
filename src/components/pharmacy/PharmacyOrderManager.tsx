import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus } from "@/lib/orderNotifications";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin,
  ChefHat,
  XCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  status: string;
  delivery_address: string;
  delivery_phone: string;
  total: number;
  created_at: string;
  patient: { first_name: string; last_name: string; email: string | null } | null;
  pharmacy_order_items: { medicine_name: string; quantity: number }[];
}

const statusOptions = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { value: "preparing", label: "Preparing", icon: ChefHat },
  { value: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { value: "delivered", label: "Delivered", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

export function PharmacyOrderManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Fetch all orders (admin view)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["all-pharmacy-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_orders")
        .select(`
          id,
          order_number,
          status,
          delivery_address,
          delivery_phone,
          total,
          created_at,
          patient:patients(first_name, last_name, email),
          pharmacy_order_items(medicine_name, quantity)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      setUpdatingOrderId(orderId);
      return updateOrderStatus(orderId, newStatus);
    },
    onSuccess: (_, { newStatus }) => {
      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}. Notification sent to patient.`,
      });
      queryClient.invalidateQueries({ queryKey: ["all-pharmacy-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingOrderId(null);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Active Orders ({activeOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active orders</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.patient?.first_name} {order.patient?.last_name}
                        </p>
                        {order.patient?.email && (
                          <p className="text-xs text-muted-foreground">{order.patient.email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">₹{order.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {order.delivery_address}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {order.pharmacy_order_items.map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {item.medicine_name} × {item.quantity}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Status:</span>
                      <Select
                        value={order.status}
                        onValueChange={(value) => 
                          updateStatusMutation.mutate({ orderId: order.id, newStatus: value })
                        }
                        disabled={updatingOrderId === order.id}
                      >
                        <SelectTrigger className="w-48">
                          {updatingOrderId === order.id ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Updating...
                            </div>
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => {
                            const Icon = status.icon;
                            return (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {status.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {completedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Completed Orders ({completedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {completedOrders.slice(0, 10).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.patient?.first_name} {order.patient?.last_name}
                      </p>
                    </div>
                    <Badge variant={order.status === "delivered" ? "default" : "destructive"}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
