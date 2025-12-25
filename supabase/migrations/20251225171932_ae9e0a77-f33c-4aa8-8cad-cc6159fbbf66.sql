-- Create medical_records table for storing patient documents
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  record_type TEXT NOT NULL DEFAULT 'lab_report',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  record_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Patients can view their own records
CREATE POLICY "Patients can view own medical records"
ON public.medical_records
FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')
);

-- Patients can upload their own records
CREATE POLICY "Patients can upload own medical records"
ON public.medical_records
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Patients can delete their own records
CREATE POLICY "Patients can delete own medical records"
ON public.medical_records
FOR DELETE
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for medical records
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-records', 'medical-records', false);

-- Storage policies for medical records bucket
CREATE POLICY "Patients can upload own medical records"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'medical-records' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patients can view own medical records"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'medical-records' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Patients can delete own medical records"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'medical-records' AND
  auth.uid()::text = (storage.foldername(name))[1]
);