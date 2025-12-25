-- Create pharmacies table
CREATE TABLE public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 4.5,
  delivery_fee NUMERIC(10,2) DEFAULT 50.00,
  estimated_delivery_minutes INTEGER DEFAULT 45,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  manufacturer TEXT,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  requires_prescription BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 100,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prescriptions table (doctor writes for patient)
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  diagnosis TEXT,
  notes TEXT,
  is_valid BOOLEAN DEFAULT true,
  valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prescription items (medicines in prescription)
CREATE TABLE public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pharmacy orders table
CREATE TABLE public.pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_address TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) DEFAULT 50.00,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cod',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order items
CREATE TABLE public.pharmacy_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;

-- Pharmacies policies (public read)
CREATE POLICY "Anyone can view active pharmacies" ON public.pharmacies
  FOR SELECT USING (is_active = true);

-- Medicines policies (public read)
CREATE POLICY "Anyone can view medicines" ON public.medicines
  FOR SELECT USING (true);

-- Prescriptions policies
CREATE POLICY "Patients can view own prescriptions" ON public.prescriptions
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'doctor')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can update prescriptions" ON public.prescriptions
  FOR UPDATE USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

-- Prescription items policies
CREATE POLICY "Users can view prescription items" ON public.prescription_items
  FOR SELECT USING (
    prescription_id IN (
      SELECT id FROM prescriptions WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
    OR has_role(auth.uid(), 'doctor')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can manage prescription items" ON public.prescription_items
  FOR ALL USING (
    has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')
  );

-- Pharmacy orders policies
CREATE POLICY "Patients can view own orders" ON public.pharmacy_orders
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patients can create orders" ON public.pharmacy_orders
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients can update own orders" ON public.pharmacy_orders
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

-- Order items policies
CREATE POLICY "Users can view own order items" ON public.pharmacy_order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM pharmacy_orders WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create order items" ON public.pharmacy_order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM pharmacy_orders WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- Create trigger for order updated_at
CREATE TRIGGER update_pharmacy_orders_updated_at
  BEFORE UPDATE ON public.pharmacy_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_orders;

-- Insert sample pharmacies
INSERT INTO public.pharmacies (name, address, phone, delivery_fee, estimated_delivery_minutes) VALUES
  ('MediCare Pharmacy', '123 Health Street, Medical Complex', '+91 98765 43210', 40.00, 30),
  ('Apollo Pharmacy', '456 Wellness Road, City Center', '+91 98765 43211', 50.00, 45),
  ('LifeLine Drugstore', '789 Care Avenue, Hospital Road', '+91 98765 43212', 35.00, 35);

-- Insert sample medicines
INSERT INTO public.medicines (name, generic_name, manufacturer, category, price, requires_prescription, description) VALUES
  ('Paracetamol 500mg', 'Acetaminophen', 'Sun Pharma', 'Pain Relief', 25.00, false, 'For fever and mild pain relief'),
  ('Amoxicillin 500mg', 'Amoxicillin', 'Cipla', 'Antibiotics', 120.00, true, 'Antibiotic for bacterial infections'),
  ('Omeprazole 20mg', 'Omeprazole', 'Dr Reddys', 'Gastric', 85.00, true, 'For acid reflux and ulcers'),
  ('Metformin 500mg', 'Metformin HCL', 'USV', 'Diabetes', 45.00, true, 'For type 2 diabetes management'),
  ('Cetirizine 10mg', 'Cetirizine', 'Mankind', 'Allergy', 35.00, false, 'Antihistamine for allergies'),
  ('Azithromycin 500mg', 'Azithromycin', 'Zydus', 'Antibiotics', 150.00, true, 'Antibiotic for respiratory infections'),
  ('Pantoprazole 40mg', 'Pantoprazole', 'Alkem', 'Gastric', 95.00, true, 'For gastric acid reduction'),
  ('Vitamin D3 60K', 'Cholecalciferol', 'Cadila', 'Vitamins', 120.00, false, 'Weekly vitamin D supplement'),
  ('Ibuprofen 400mg', 'Ibuprofen', 'Abbott', 'Pain Relief', 30.00, false, 'Anti-inflammatory pain relief'),
  ('Atorvastatin 10mg', 'Atorvastatin', 'Ranbaxy', 'Cardiac', 75.00, true, 'For cholesterol management');