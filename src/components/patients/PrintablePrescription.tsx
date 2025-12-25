import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, Pill, Calendar, User, Stethoscope } from "lucide-react";
import { format } from "date-fns";

interface PrescriptionItem {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  created_at: string | null;
  valid_until: string | null;
  is_valid: boolean | null;
  items: PrescriptionItem[];
  doctor?: {
    name: string;
    specialty: string;
  } | null;
  patient?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PrintablePrescriptionProps {
  prescription: Prescription;
  trigger?: React.ReactNode;
}

export function PrintablePrescription({ prescription, trigger }: PrintablePrescriptionProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription - ${prescription.id.slice(0, 8)}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #0ea5e9;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .hospital-name {
              font-size: 28px;
              font-weight: bold;
              color: #0ea5e9;
              margin-bottom: 5px;
            }
            .hospital-subtitle {
              font-size: 12px;
              color: #666;
            }
            .rx-symbol {
              font-size: 48px;
              font-weight: bold;
              color: #0ea5e9;
              margin: 20px 0;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .info-group {
              flex: 1;
            }
            .info-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 14px;
              font-weight: 600;
            }
            .diagnosis-section {
              margin-bottom: 25px;
              padding: 15px;
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 0 8px 8px 0;
            }
            .diagnosis-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #92400e;
              margin-bottom: 5px;
            }
            .diagnosis-text {
              font-size: 16px;
              font-weight: 600;
              color: #78350f;
            }
            .medications-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #0ea5e9;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .medication-item {
              padding: 15px;
              margin-bottom: 12px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .medication-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }
            .medication-name {
              font-size: 16px;
              font-weight: bold;
              color: #1e293b;
            }
            .medication-qty {
              background: #0ea5e9;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
            }
            .medication-details {
              display: flex;
              gap: 20px;
              margin-bottom: 8px;
            }
            .medication-detail {
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 13px;
              color: #475569;
            }
            .detail-label {
              font-weight: 600;
            }
            .medication-instructions {
              font-size: 12px;
              color: #64748b;
              font-style: italic;
              padding-top: 8px;
              border-top: 1px dashed #e2e8f0;
            }
            .notes-section {
              margin-top: 25px;
              padding: 15px;
              background: #f1f5f9;
              border-radius: 8px;
            }
            .notes-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 8px;
            }
            .notes-text {
              font-size: 14px;
              color: #334155;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
            }
            .validity {
              font-size: 12px;
              color: #64748b;
            }
            .signature-area {
              text-align: right;
            }
            .signature-line {
              width: 200px;
              border-bottom: 1px solid #1a1a1a;
              margin-bottom: 5px;
              margin-left: auto;
            }
            .signature-text {
              font-size: 11px;
              color: #666;
            }
            .watermark {
              position: fixed;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 10px;
              color: #94a3b8;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    handlePrint();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Prescription Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Save as PDF
          </Button>
        </div>

        <div className="border rounded-lg p-6 bg-white" ref={printRef}>
          {/* Header */}
          <div className="text-center border-b-2 border-primary pb-5 mb-6">
            <h1 className="text-2xl font-bold text-primary">MediAI Hospital</h1>
            <p className="text-xs text-muted-foreground">Digital Healthcare System</p>
            <div className="text-5xl font-bold text-primary mt-4">℞</div>
          </div>

          {/* Patient & Doctor Info */}
          <div className="flex justify-between mb-5 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Patient</p>
              <p className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                {prescription.patient 
                  ? `${prescription.patient.first_name} ${prescription.patient.last_name}`
                  : "Patient"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Prescribing Doctor</p>
              <p className="font-semibold flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                {prescription.doctor?.name || "Doctor"}
              </p>
              <p className="text-sm text-muted-foreground">{prescription.doctor?.specialty}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Date</p>
              <p className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {prescription.created_at 
                  ? format(new Date(prescription.created_at), "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div className="mb-6 p-4 bg-warning/10 border-l-4 border-warning rounded-r-lg">
              <p className="text-xs uppercase text-warning-foreground mb-1">Diagnosis</p>
              <p className="font-semibold text-lg">{prescription.diagnosis}</p>
            </div>
          )}

          {/* Medications */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-primary border-b pb-2 mb-4">
              Prescribed Medications
            </h3>
            <div className="space-y-3">
              {prescription.items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">
                      {index + 1}. {item.medicine_name}
                    </span>
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs">
                      Qty: {item.quantity}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                    <span><strong>Dosage:</strong> {item.dosage}</span>
                    <span><strong>Frequency:</strong> {item.frequency}</span>
                    <span><strong>Duration:</strong> {item.duration}</span>
                  </div>
                  {item.instructions && (
                    <p className="text-sm text-muted-foreground italic border-t border-dashed pt-2 mt-2">
                      <strong>Instructions:</strong> {item.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {prescription.notes && (
            <div className="p-4 bg-muted/50 rounded-lg mb-6">
              <p className="text-xs uppercase text-muted-foreground mb-2">Additional Notes</p>
              <p className="text-sm">{prescription.notes}</p>
            </div>
          )}

          {/* Footer */}
          <Separator className="my-6" />
          <div className="flex justify-between items-end">
            <div className="text-xs text-muted-foreground">
              <p>Prescription ID: {prescription.id.slice(0, 8).toUpperCase()}</p>
              {prescription.valid_until && (
                <p>Valid Until: {format(new Date(prescription.valid_until), "MMM d, yyyy")}</p>
              )}
            </div>
            <div className="text-right">
              <div className="w-48 border-b border-foreground mb-1 h-8" />
              <p className="text-xs text-muted-foreground">Doctor's Signature</p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            This is a digitally generated prescription from MediAI Hospital System
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
