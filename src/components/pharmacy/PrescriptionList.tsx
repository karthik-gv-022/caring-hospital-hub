import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, User, Clock, ShoppingCart, Pill, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrescriptionItem {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  medicine_id: string | null;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  is_valid: boolean;
  valid_until: string;
  created_at: string;
  doctor: { name: string; specialty: string } | null;
  prescription_items: PrescriptionItem[];
}

interface PrescriptionListProps {
  prescriptions: Prescription[];
  loading: boolean;
  onAddToCart: (prescription: Prescription) => void;
}

export function PrescriptionList({ prescriptions, loading, onAddToCart }: PrescriptionListProps) {
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-2/3 mb-4" />
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Prescriptions</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your doctor will issue prescriptions after your consultation. 
            Book an appointment to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {prescriptions.map((prescription) => {
        const validUntil = new Date(prescription.valid_until);
        const daysLeft = Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = daysLeft <= 7;

        return (
          <Card key={prescription.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {prescription.diagnosis || "Medical Prescription"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Dr. {prescription.doctor?.name || "Unknown"}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={isExpiringSoon ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {daysLeft} days left
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(prescription.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Valid until {validUntil.toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Prescribed Medicines:</p>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2">
                    {prescription.prescription_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <Pill className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.medicine_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.dosage} • {item.frequency} • {item.duration}
                          </p>
                          {item.instructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.instructions}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          Qty: {item.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {prescription.notes && (
                <div className="p-3 rounded-lg bg-accent/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Notes:</span> {prescription.notes}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => onAddToCart(prescription)}
                className="w-full gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add All to Cart
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
