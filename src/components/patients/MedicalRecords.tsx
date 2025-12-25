import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Calendar,
  FileImage,
  File,
  Loader2,
  Plus,
  FolderOpen,
  FlaskConical,
  Scan,
  Heart,
  Brain
} from "lucide-react";
import { format } from "date-fns";

interface MedicalRecord {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  record_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  record_date: string | null;
}

interface MedicalRecordsProps {
  patientId: string;
}

const recordTypes = [
  { value: "lab_report", label: "Lab Report", icon: FlaskConical },
  { value: "scan", label: "Scan/X-Ray", icon: Scan },
  { value: "prescription", label: "Prescription", icon: FileText },
  { value: "ecg", label: "ECG/Heart", icon: Heart },
  { value: "mri", label: "MRI/CT Scan", icon: Brain },
  { value: "other", label: "Other", icon: File },
];

export function MedicalRecords({ patientId }: MedicalRecordsProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newRecord, setNewRecord] = useState({
    title: "",
    description: "",
    record_type: "lab_report",
    record_date: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching records:", error);
      toast.error("Failed to load medical records");
    } else {
      setRecords(data as MedicalRecord[]);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setNewRecord(prev => ({ ...prev, file, title: prev.title || file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleUpload = async () => {
    if (!newRecord.file || !user) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);

    try {
      const fileExt = newRecord.file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("medical-records")
        .upload(filePath, newRecord.file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from("medical-records")
        .createSignedUrl(filePath, 31536000); // 1 year expiry

      if (!urlData?.signedUrl) throw new Error("Failed to get file URL");

      // Create record in database
      const { error: insertError } = await supabase
        .from("medical_records")
        .insert({
          patient_id: patientId,
          title: newRecord.title,
          description: newRecord.description || null,
          record_type: newRecord.record_type,
          file_url: filePath,
          file_name: newRecord.file.name,
          file_size: newRecord.file.size,
          record_date: newRecord.record_date || null,
        });

      if (insertError) throw insertError;

      toast.success("Medical record uploaded successfully");
      setDialogOpen(false);
      setNewRecord({
        title: "",
        description: "",
        record_type: "lab_report",
        record_date: "",
        file: null,
      });
      fetchRecords();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload record");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (record: MedicalRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-records")
        .createSignedUrl(record.file_url, 3600);

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (record: MedicalRecord) => {
    try {
      // Delete from storage
      await supabase.storage
        .from("medical-records")
        .remove([record.file_url]);

      // Delete from database
      const { error } = await supabase
        .from("medical_records")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      toast.success("Record deleted successfully");
      fetchRecords();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete record");
    }
  };

  const getRecordTypeInfo = (type: string) => {
    return recordTypes.find(t => t.value === type) || recordTypes[recordTypes.length - 1];
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return FileImage;
    }
    return FileText;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Medical Records</h3>
          <p className="text-sm text-muted-foreground">
            Store and manage your lab reports, scans, and other medical documents
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Upload Record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Medical Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* File Upload Area */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                />
                {newRecord.file ? (
                  <div className="space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-primary" />
                    <p className="font-medium">{newRecord.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(newRecord.file.size)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Images, or Documents (max 10MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Blood Test Results"
                  value={newRecord.title}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Record Type</Label>
                <Select
                  value={newRecord.record_type}
                  onValueChange={(value) => setNewRecord(prev => ({ ...prev, record_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recordTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Record Date (Optional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={newRecord.record_date}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, record_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any relevant notes..."
                  value={newRecord.description}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !newRecord.file}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Records List */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No medical records yet</p>
            <p className="text-muted-foreground mb-4">
              Upload your lab reports, scans, and other medical documents
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Upload Your First Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => {
            const typeInfo = getRecordTypeInfo(record.record_type);
            const FileIcon = getFileIcon(record.file_name);

            return (
              <Card key={record.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                      <typeInfo.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold truncate">{record.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {typeInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileIcon className="w-3 h-3" />
                              {formatFileSize(record.file_size)}
                            </span>
                          </div>
                          {record.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {record.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownload(record)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{record.title}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(record)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {record.record_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Record: {format(new Date(record.record_date), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          Uploaded: {format(new Date(record.uploaded_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
