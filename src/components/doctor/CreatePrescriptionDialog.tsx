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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Pill, 
  Plus, 
  Trash2, 
  Search,
  FileText,
  Loader2,
  User,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  category: string;
  requires_prescription: boolean;
}

interface PrescriptionItem {
  medicine_id: string | null;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  symptoms: string | null;
  patients?: Patient;
}

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  appointment?: Appointment | null;
  patientId?: string;
}

const frequencyOptions = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "Before meals",
  "After meals",
  "At bedtime",
  "As needed",
];

const durationOptions = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "30 days",
  "60 days",
  "90 days",
  "Ongoing",
];

export function CreatePrescriptionDialog({
  open,
  onOpenChange,
  doctorId,
  appointment,
  patientId,
}: CreatePrescriptionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");

  // Fetch medicines
  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("id, name, generic_name, category, requires_prescription")
        .order("name");
      if (error) throw error;
      return data as Medicine[];
    },
  });

  // Fetch patients (if no appointment provided)
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .order("first_name");
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !appointment,
  });

  // Filter medicines by search
  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add medicine to prescription
  const addMedicine = (medicine: Medicine) => {
    if (items.some((item) => item.medicine_id === medicine.id)) {
      toast({
        title: "Already Added",
        description: "This medicine is already in the prescription",
        variant: "destructive",
      });
      return;
    }

    setItems([
      ...items,
      {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        dosage: "",
        frequency: "Twice daily",
        duration: "7 days",
        quantity: 1,
        instructions: "",
      },
    ]);
    setSearchQuery("");
  };

  // Add custom medicine
  const addCustomMedicine = () => {
    if (!searchQuery.trim()) return;
    
    setItems([
      ...items,
      {
        medicine_id: null,
        medicine_name: searchQuery.trim(),
        dosage: "",
        frequency: "Twice daily",
        duration: "7 days",
        quantity: 1,
        instructions: "",
      },
    ]);
    setSearchQuery("");
  };

  // Update item
  const updateItem = (index: number, field: keyof PrescriptionItem, value: string | number) => {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Create prescription mutation
  const createPrescriptionMutation = useMutation({
    mutationFn: async () => {
      const patientIdToUse = appointment?.patients?.id || selectedPatientId;
      
      if (!patientIdToUse) {
        throw new Error("Please select a patient");
      }

      if (items.length === 0) {
        throw new Error("Please add at least one medicine");
      }

      // Validate all items have dosage
      const invalidItems = items.filter((item) => !item.dosage.trim());
      if (invalidItems.length > 0) {
        throw new Error("Please enter dosage for all medicines");
      }

      // Create prescription
      const { data: prescription, error: prescriptionError } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: patientIdToUse,
          doctor_id: doctorId,
          appointment_id: appointment?.id || null,
          diagnosis: diagnosis.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Create prescription items
      const prescriptionItems = items.map((item) => ({
        prescription_id: prescription.id,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions.trim() || null,
      }));

      const { error: itemsError } = await supabase
        .from("prescription_items")
        .insert(prescriptionItems);

      if (itemsError) throw itemsError;

      return prescription;
    },
    onSuccess: () => {
      toast({
        title: "Prescription Created",
        description: "The prescription has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create prescription",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setDiagnosis("");
    setNotes("");
    setItems([]);
    setSearchQuery("");
    setSelectedPatientId("");
  };

  const effectivePatient = appointment?.patients || patients.find((p) => p.id === selectedPatientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Prescription
          </DialogTitle>
          <DialogDescription>
            Prescribe medicines for your patient
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Patient Selection */}
            {appointment ? (
              <div className="p-4 rounded-lg bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {appointment.patients?.first_name} {appointment.patients?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Appointment: {appointment.scheduled_date} at {appointment.scheduled_time}
                    </p>
                  </div>
                </div>
                {appointment.symptoms && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis"
              />
            </div>

            {/* Medicine Search */}
            <div className="space-y-2">
              <Label>Add Medicines</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicines..."
                  className="pl-10"
                />
              </div>
              
              {searchQuery && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {filteredMedicines.length > 0 ? (
                    filteredMedicines.slice(0, 10).map((medicine) => (
                      <button
                        key={medicine.id}
                        onClick={() => addMedicine(medicine)}
                        className="w-full text-left p-2 hover:bg-accent/50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm">{medicine.name}</p>
                          {medicine.generic_name && (
                            <p className="text-xs text-muted-foreground">{medicine.generic_name}</p>
                          )}
                        </div>
                        {medicine.requires_prescription && (
                          <Badge variant="secondary" className="text-xs">Rx</Badge>
                        )}
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={addCustomMedicine}
                      className="w-full text-left p-2 hover:bg-accent/50"
                    >
                      <p className="text-sm">
                        <Plus className="w-3 h-3 inline mr-1" />
                        Add "{searchQuery}" as custom medicine
                      </p>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Prescription Items */}
            {items.length > 0 && (
              <div className="space-y-4">
                <Label>Prescribed Medicines ({items.length})</Label>
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-primary" />
                        <span className="font-medium">{item.medicine_name}</span>
                        {!item.medicine_id && (
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Dosage *</Label>
                        <Input
                          value={item.dosage}
                          onChange={(e) => updateItem(index, "dosage", e.target.value)}
                          placeholder="e.g., 500mg"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Frequency</Label>
                        <Select
                          value={item.frequency}
                          onValueChange={(value) => updateItem(index, "frequency", value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map((freq) => (
                              <SelectItem key={freq} value={freq}>
                                {freq}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Select
                          value={item.duration}
                          onValueChange={(value) => updateItem(index, "duration", value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {durationOptions.map((dur) => (
                              <SelectItem key={dur} value={dur}>
                                {dur}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Instructions</Label>
                      <Input
                        value={item.instructions}
                        onChange={(e) => updateItem(index, "instructions", e.target.value)}
                        placeholder="e.g., Take with food, Avoid alcohol"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional instructions or notes..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createPrescriptionMutation.mutate()}
            disabled={createPrescriptionMutation.isPending || items.length === 0}
          >
            {createPrescriptionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Create Prescription
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
