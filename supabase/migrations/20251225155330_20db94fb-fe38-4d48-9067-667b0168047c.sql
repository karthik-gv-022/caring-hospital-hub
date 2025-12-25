-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'patient');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'patient',
  UNIQUE (user_id, role)
);

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 4.5,
  available_slots INTEGER DEFAULT 5,
  next_available TEXT DEFAULT '10:00 AM',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  symptoms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create queue_tokens table for real-time queue
CREATE TABLE public.queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'next', 'in-progress', 'completed')),
  estimated_wait_minutes INTEGER DEFAULT 30,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Doctors policies (public read, admin write)
CREATE POLICY "Anyone can view doctors" ON public.doctors
  FOR SELECT USING (true);

CREATE POLICY "Doctors can update own record" ON public.doctors
  FOR UPDATE USING (auth.uid() = user_id);

-- Patients policies
CREATE POLICY "Patients can view own record" ON public.patients
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create patient record" ON public.patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can update own record" ON public.patients
  FOR UPDATE USING (auth.uid() = user_id);

-- Appointments policies
CREATE POLICY "Users can view own appointments" ON public.appointments
  FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update own appointments" ON public.appointments
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Queue tokens policies (public read for display, authenticated write)
CREATE POLICY "Anyone can view queue" ON public.queue_tokens
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tokens" ON public.queue_tokens
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update queue" ON public.queue_tokens
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin')
  );

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_queue_tokens_updated_at
  BEFORE UPDATE ON public.queue_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for queue_tokens
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tokens;

-- Insert sample doctors
INSERT INTO public.doctors (name, specialty, rating, available_slots, next_available, is_available) VALUES
  ('Dr. Sarah Chen', 'Cardiology', 4.9, 5, '10:30 AM', true),
  ('Dr. Michael Park', 'Neurology', 4.8, 3, '11:00 AM', true),
  ('Dr. Lisa Wang', 'Pediatrics', 4.9, 7, '10:15 AM', true),
  ('Dr. David Kim', 'Orthopedics', 4.7, 2, '2:00 PM', false),
  ('Dr. Jennifer Lee', 'Dermatology', 4.8, 4, '11:30 AM', true),
  ('Dr. Robert Taylor', 'Internal Medicine', 4.6, 6, '10:00 AM', true),
  ('Dr. Amanda White', 'Ophthalmology', 4.9, 3, '1:00 PM', true),
  ('Dr. Thomas Brown', 'General Surgery', 4.7, 1, '3:30 PM', false),
  ('Dr. Emily Martinez', 'Pulmonology', 4.8, 4, '12:00 PM', true),
  ('Dr. James Wilson', 'Gastroenterology', 4.7, 5, '9:30 AM', true);