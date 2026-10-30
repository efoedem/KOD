-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- SCHOOLS
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools public read" ON public.schools FOR SELECT USING (true);
CREATE POLICY "schools admin write" ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENTS
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
GRANT SELECT ON public.departments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments public read" ON public.departments FOR SELECT USING (true);
CREATE POLICY "departments admin write" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BOOKS
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level text NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  isbn text,
  course_code text,
  edition text,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cover_url text,
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books public read" ON public.books FOR SELECT USING (true);
CREATE POLICY "books admin write" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX books_dept_level_idx ON public.books (department_id, level);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  phone text NOT NULL UNIQUE,
  full_name text,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_ref text NOT NULL UNIQUE,
  buyer_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  school_name text,
  department_name text,
  level text,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  payment_status text NOT NULL DEFAULT 'UNPAID',
  payment_method text,
  paid_at timestamptz,
  notified_email boolean NOT NULL DEFAULT false,
  notified_sms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read own" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders insert own" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders update own" ON public.orders FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  title text NOT NULL,
  author text,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items read own" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "order items insert own" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- SEED DATA
INSERT INTO public.schools (name, code) VALUES
  ('University of Ghana', 'UG'),
  ('Kwame Nkrumah University of Science and Technology', 'KNUST'),
  ('University of Cape Coast', 'UCC'),
  ('University of Education, Winneba', 'UEW'),
  ('Ghana Communication Technology University', 'GCTU');

INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s
CROSS JOIN (VALUES
  ('Computer Science'),
  ('Business Administration'),
  ('Nursing'),
  ('Economics'),
  ('Mechanical Engineering'),
  ('Law')
) AS d(name);

INSERT INTO public.books (department_id, level, title, author, isbn, course_code, edition, description, price, stock)
SELECT d.id, b.level, b.title, b.author, b.isbn, b.course_code, b.edition, b.description, b.price, 25
FROM public.departments d
JOIN public.schools s ON s.id = d.school_id
JOIN (VALUES
  ('Computer Science','100','Introduction to Programming with Python','A. Mensah','9780000000101','CSC101','3rd','Core first-year programming text covering syntax, control flow and functions.',85.00),
  ('Computer Science','100','Discrete Mathematics for Computing','K. Owusu','9780000000102','MAT103','2nd','Logic, sets, relations and graph theory for computing students.',95.00),
  ('Computer Science','200','Data Structures and Algorithms','R. Boateng','9780000000201','CSC205','4th','Lists, trees, hashing and algorithm analysis with worked examples.',120.00),
  ('Computer Science','200','Database Systems Fundamentals','E. Asare','9780000000202','CSC210','2nd','Relational modelling, SQL and normalisation.',110.00),
  ('Computer Science','300','Operating Systems Concepts','J. Nkrumah','9780000000301','CSC305','5th','Processes, memory, file systems and concurrency.',140.00),
  ('Computer Science','300','Computer Networks','S. Addo','9780000000302','CSC310','3rd','Layered networking, TCP/IP and network security basics.',135.00),
  ('Computer Science','400','Software Engineering Practice','M. Tetteh','9780000000401','CSC405','2nd','Requirements, design patterns, testing and project management.',150.00),
  ('Business Administration','100','Principles of Management','G. Ampofo','9780000001101','BUS101','4th','Planning, organising, leading and controlling in organisations.',90.00),
  ('Business Administration','200','Financial Accounting','L. Darko','9780000001201','ACC201','3rd','Double entry, ledgers and final accounts.',115.00),
  ('Business Administration','300','Marketing Management','P. Sarpong','9780000001301','MKT301','2nd','Segmentation, positioning and the marketing mix.',125.00),
  ('Business Administration','400','Strategic Management','C. Yeboah','9780000001401','BUS401','3rd','Competitive strategy and corporate planning.',145.00),
  ('Nursing','100','Fundamentals of Nursing Practice','A. Amankwaa','9780000002101','NUR101','6th','Foundational nursing skills and patient care.',105.00),
  ('Nursing','200','Human Anatomy and Physiology','F. Kusi','9780000002201','NUR205','5th','Body systems for nursing students.',160.00),
  ('Nursing','300','Medical Surgical Nursing','D. Appiah','9780000002301','NUR305','4th','Care of adult patients with medical and surgical conditions.',175.00),
  ('Nursing','400','Community Health Nursing','B. Osei','9780000002401','NUR401','3rd','Public health nursing in Ghanaian communities.',140.00),
  ('Economics','100','Principles of Economics','N. Agyeman','9780000003101','ECO101','7th','Micro and macro foundations.',100.00),
  ('Economics','200','Intermediate Microeconomics','H. Kwarteng','9780000003201','ECO205','4th','Consumer and producer theory with applications.',130.00),
  ('Economics','300','Econometrics','T. Ofori','9780000003301','ECO305','3rd','Regression analysis for economic data.',150.00),
  ('Economics','400','Development Economics','V. Anane','9780000003401','ECO401','2nd','Growth, poverty and policy in developing economies.',145.00),
  ('Mechanical Engineering','100','Engineering Mechanics: Statics','Y. Danquah','9780000004101','MEC101','5th','Forces, equilibrium and structures.',135.00),
  ('Mechanical Engineering','200','Thermodynamics','I. Bonsu','9780000004201','MEC205','4th','Energy, entropy and cycles.',155.00),
  ('Mechanical Engineering','300','Fluid Mechanics','O. Frimpong','9780000004301','MEC305','3rd','Fluid statics, flow and turbomachinery.',165.00),
  ('Mechanical Engineering','400','Machine Design','W. Antwi','9780000004401','MEC401','2nd','Design of shafts, gears and bearings.',180.00),
  ('Law','100','Introduction to Ghanaian Law','Q. Ansah','9780000005101','LAW101','3rd','Sources of law and the Ghanaian legal system.',120.00),
  ('Law','200','Law of Contract','Z. Adjei','9780000005201','LAW205','4th','Formation, terms, breach and remedies.',150.00),
  ('Law','300','Criminal Law','U. Baidoo','9780000005301','LAW305','3rd','Offences, defences and criminal responsibility.',155.00),
  ('Law','400','Company Law','X. Nyarko','9780000005401','LAW401','2nd','Incorporation, directors duties and insolvency.',170.00)
) AS b(dept, level, title, author, isbn, course_code, edition, description, price)
ON b.dept = d.name
WHERE s.code = 'UG';

INSERT INTO public.books (department_id, level, title, author, isbn, course_code, edition, description, price, stock)
SELECT d.id, src.level, src.title, src.author, NULL, src.course_code, src.edition, src.description, src.price, 25
FROM public.books src
JOIN public.departments sd ON sd.id = src.department_id
JOIN public.schools ss ON ss.id = sd.school_id AND ss.code = 'UG'
JOIN public.departments d ON d.name = sd.name
JOIN public.schools s ON s.id = d.school_id AND s.code <> 'UG';