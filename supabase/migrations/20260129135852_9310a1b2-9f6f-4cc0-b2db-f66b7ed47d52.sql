-- Create app_role enum for IWIS roles
CREATE TYPE public.app_role AS ENUM ('ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST', 'PATIENT');

-- Create user_roles table (following security best practices - roles separate from profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create branches table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create patients table (links to user account)
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create doctors table
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    provides_therapy BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create therapists table
CREATE TABLE public.therapists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;

-- Create journeys table
CREATE TABLE public.journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('OP', 'Wellness')),
    total_sittings INT NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'ON_TRACK' CHECK (status IN ('ON_TRACK', 'AT_RISK', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;

-- Create sittings table
CREATE TABLE public.sittings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE NOT NULL,
    number INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    date TIMESTAMP WITH TIME ZONE,
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (journey_id, number)
);

ALTER TABLE public.sittings ENABLE ROW LEVEL SECURITY;

-- Create medication_logs table
CREATE TABLE public.medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    taken BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (journey_id, date)
);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Create alerts table
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 1,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create nudge_logs table
CREATE TABLE public.nudge_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nudge_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journeys_updated_at
    BEFORE UPDATE ON public.journeys
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- user_roles: Only admins can manage, users can read their own
CREATE POLICY "Users can view their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

-- profiles: Users can read/update their own, admins can read all
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- branches: Admins can manage, all authenticated can read
CREATE POLICY "Authenticated users can view branches"
    ON public.branches FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage branches"
    ON public.branches FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

-- patients: Own data + doctors/admins can view
CREATE POLICY "Patients can view own data"
    ON public.patients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patients"
    ON public.patients FOR SELECT
    USING (public.has_role(auth.uid(), 'DOCTOR') OR public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

CREATE POLICY "Admins can manage patients"
    ON public.patients FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

-- doctors: Own data + admins can view all
CREATE POLICY "Doctors can view own data"
    ON public.doctors FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all doctors"
    ON public.doctors FOR SELECT
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

CREATE POLICY "Admins can manage doctors"
    ON public.doctors FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

-- therapists: Own data + doctors/admins can view
CREATE POLICY "Therapists can view own data"
    ON public.therapists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view therapists"
    ON public.therapists FOR SELECT
    USING (public.has_role(auth.uid(), 'DOCTOR') OR public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

CREATE POLICY "Therapists can update own stats"
    ON public.therapists FOR UPDATE
    USING (auth.uid() = user_id);

-- journeys: Patients see own, doctors/therapists see assigned, admins see all
CREATE POLICY "Patients can view own journeys"
    ON public.journeys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.patients p
            WHERE p.id = journeys.patient_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can view their patients journeys"
    ON public.journeys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = journeys.doctor_id AND d.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'ADMIN_DOCTOR')
    );

CREATE POLICY "Therapists can view assigned journeys"
    ON public.journeys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sittings s
            JOIN public.therapists t ON t.id = s.therapist_id
            WHERE s.journey_id = journeys.id AND t.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'THERAPIST')
    );

CREATE POLICY "Admins can manage journeys"
    ON public.journeys FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

-- sittings: Related users can view, therapists can update their assigned
CREATE POLICY "Users can view related sittings"
    ON public.sittings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.journeys j
            JOIN public.patients p ON p.id = j.patient_id
            WHERE j.id = sittings.journey_id AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.therapists t
            WHERE t.id = sittings.therapist_id AND t.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'DOCTOR')
        OR public.has_role(auth.uid(), 'ADMIN_DOCTOR')
        OR public.has_role(auth.uid(), 'THERAPIST')
    );

CREATE POLICY "Therapists can update assigned sittings"
    ON public.sittings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.therapists t
            WHERE t.id = sittings.therapist_id AND t.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'THERAPIST')
    );

CREATE POLICY "Admins can manage sittings"
    ON public.sittings FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

-- medication_logs: Patients can manage own, doctors can view
CREATE POLICY "Patients can manage own medication logs"
    ON public.medication_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.journeys j
            JOIN public.patients p ON p.id = j.patient_id
            WHERE j.id = medication_logs.journey_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can view medication logs"
    ON public.medication_logs FOR SELECT
    USING (
        public.has_role(auth.uid(), 'DOCTOR')
        OR public.has_role(auth.uid(), 'ADMIN_DOCTOR')
    );

-- alerts: Admins can manage, doctors can view
CREATE POLICY "Admins can manage alerts"
    ON public.alerts FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));

CREATE POLICY "Doctors can view alerts"
    ON public.alerts FOR SELECT
    USING (public.has_role(auth.uid(), 'DOCTOR'));

-- nudge_logs: Patients can view own, admins can manage
CREATE POLICY "Patients can view own nudges"
    ON public.nudge_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.patients p
            WHERE p.id = nudge_logs.patient_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage nudges"
    ON public.nudge_logs FOR ALL
    USING (public.has_role(auth.uid(), 'ADMIN_DOCTOR'));