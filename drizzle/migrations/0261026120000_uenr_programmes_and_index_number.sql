-- 1. Ensure UENR exists in schools
INSERT INTO public.schools (name, code)
VALUES ('University of Energy and Natural Resources', 'UENR')
ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code;

-- 2. Ensure departments unique constraint on (school_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_school_id_name_key'
  ) THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_school_id_name_key UNIQUE (school_id, name);
  END IF;
END $$;

-- 3. Insert the 31 academic departments under UENR
INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name
FROM public.schools s
CROSS JOIN (
  VALUES
  ('Department of Mechanical & Manufacturing Engineering'),
  ('Department of Electrical & Computer Engineering'),
  ('Department of Civil & Environmental Engineering'),
  ('Department of Agricultural Engineering'),
  ('Department of Renewable Energy Engineering'),
  ('Department of Petroleum and Natural Gas Engineering'),
  ('Department of Forest Science'),
  ('Department of Fisheries and Aquatic Sciences'),
  ('Department of Environmental Management'),
  ('Department of Ecotourism, Recreation & Hospitality'),
  ('Department of Fire, Safety & Disaster Management'),
  ('Department of Chemical Sciences'),
  ('Department of Computer Science & Informatics'),
  ('Department of Mathematics & Statistics'),
  ('Department of Nursing'),
  ('Department of Biological Sciences'),
  ('Department of Medical Laboratory & Health Sciences'),
  ('Department of Information Technology'),
  ('Department of Agribusiness & Consumer Studies'),
  ('Department of Horticulture & Crop Production'),
  ('Department of Animal Production & Health'),
  ('Department of Agricultural & Resource Economics'),
  ('Department of Food Science & Technology'),
  ('Department of Geological Science'),
  ('Department of Geospatial Sciences'),
  ('Department of Climate Science'),
  ('Department of Geography & Sustainability Science'),
  ('Department of Entrepreneurship and Business Sciences'),
  ('Department of Economics'),
  ('Department of Land Management'),
  ('Department of Sustainable Mineral Resource Development')
) AS d(name)
WHERE s.code = 'UENR'
ON CONFLICT (school_id, name) DO NOTHING;

-- 4. Create programmes table
CREATE TABLE IF NOT EXISTS public.programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'programmes_dept_name_unique'
  ) THEN
    ALTER TABLE public.programmes ADD CONSTRAINT programmes_dept_name_unique UNIQUE (department_id, name);
  END IF;
END $$;

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programmes' AND policyname = 'programmes public read') THEN
    CREATE POLICY "programmes public read" ON public.programmes FOR SELECT USING (true);
  END IF;
END $$;

GRANT SELECT ON public.programmes TO anon, authenticated;
GRANT ALL ON public.programmes TO service_role;

-- 5. Add index_number and programme_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS index_number text,
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_index_number_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_index_number_key UNIQUE (index_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_index_number ON public.profiles(index_number);
CREATE INDEX IF NOT EXISTS idx_programmes_department_id ON public.programmes(department_id);

-- 6. Seed the 47 BSc programmes mapped to each department
INSERT INTO public.programmes (department_id, name)
SELECT d.id, p.programme_name
FROM public.schools s
JOIN public.departments d ON d.school_id = s.id
JOIN (
  VALUES
  ('Department of Mechanical & Manufacturing Engineering', 'BSc. Mechanical Engineering'),
  ('Department of Electrical & Computer Engineering', 'BSc. Electrical and Electronic Engineering'),
  ('Department of Electrical & Computer Engineering', 'BSc. Computer Engineering'),
  ('Department of Civil & Environmental Engineering', 'BSc. Civil Engineering'),
  ('Department of Civil & Environmental Engineering', 'BSc. Environmental Engineering'),
  ('Department of Agricultural Engineering', 'BSc. Agricultural Engineering'),
  ('Department of Renewable Energy Engineering', 'BSc. Renewable Energy Engineering'),
  ('Department of Petroleum and Natural Gas Engineering', 'BSc. Petroleum Engineering'),
  ('Department of Forest Science', 'BSc. Natural Resources Management (Social Forestry Option)'),
  ('Department of Forest Science', 'BSc. Natural Resources Management (Forest Resources Management Option)'),
  ('Department of Fisheries and Aquatic Sciences', 'BSc. Natural Resources Management (Fisheries & Aquaculture Option)'),
  ('Department of Fisheries and Aquatic Sciences', 'BSc. Aquaculture & Aquatic Resources Management'),
  ('Department of Environmental Management', 'BSc. Natural Resources Management (Land Reclamation & Restoration Option)'),
  ('Department of Ecotourism, Recreation & Hospitality', 'BSc. Natural Resources Management (Ecotourism Option)'),
  ('Department of Ecotourism, Recreation & Hospitality', 'BSc. Hospitality Management'),
  ('Department of Fire, Safety & Disaster Management', 'BSc. Fire, Safety & Disaster Management'),
  ('Department of Chemical Sciences', 'BSc. Chemistry'),
  ('Department of Chemical Sciences', 'BSc. Biochemistry'),
  ('Department of Computer Science & Informatics', 'BSc. Computer Science'),
  ('Department of Mathematics & Statistics', 'BSc. Mathematics'),
  ('Department of Mathematics & Statistics', 'BSc. Statistics'),
  ('Department of Mathematics & Statistics', 'BSc. Actuarial Science'),
  ('Department of Nursing', 'BSc. Nursing'),
  ('Department of Biological Sciences', 'BSc. Biological Science'),
  ('Department of Medical Laboratory & Health Sciences', 'BSc. Medical Laboratory Science'),
  ('Department of Information Technology', 'BSc. Information Technology'),
  ('Department of Agribusiness & Consumer Studies', 'BSc. Agribusiness'),
  ('Department of Horticulture & Crop Production', 'BSc. Agriculture (Crop Production, Horticulture, Soil Science, Post-Harvest Technology options)'),
  ('Department of Animal Production & Health', 'BSc. Agriculture (Animal Production & Health Option)'),
  ('Department of Agricultural & Resource Economics', 'BSc. Agriculture (Extension Option)'),
  ('Department of Agricultural & Resource Economics', 'BSc. Agricultural & Resource Economics'),
  ('Department of Food Science & Technology', 'BSc. Food Technology'),
  ('Department of Geological Science', 'BSc. Geo-Environmental Science'),
  ('Department of Geospatial Sciences', 'BSc. Geo-Information Science'),
  ('Department of Geospatial Sciences', 'BSc. Geomatics'),
  ('Department of Climate Science', 'BSc. Applied Meteorology & Climate Science'),
  ('Department of Climate Science', 'BSc. Climate Change & Sustainability'),
  ('Department of Geography & Sustainability Science', 'BSc. Planning & Sustainability'),
  ('Department of Geography & Sustainability Science', 'BSc. Geography & Environmental Studies'),
  ('Department of Entrepreneurship and Business Sciences', 'BSc. Resource Enterprise and Entrepreneurship'),
  ('Department of Entrepreneurship and Business Sciences', 'BSc. Accounting'),
  ('Department of Entrepreneurship and Business Sciences', 'BSc. Economics'),
  ('Department of Economics', 'BSc. Economics (Departmental)'),
  ('Department of Land Management', 'BSc. Sustainable Land Management'),
  ('Department of Sustainable Mineral Resource Development', 'BSc. Sustainable Mining'),
  ('Department of Sustainable Mineral Resource Development', 'BSc. Development Minerals Mining'),
  ('Department of Sustainable Mineral Resource Development', 'BSc. Urban Mining')
) AS p(department_name, programme_name) ON p.department_name = d.name
WHERE s.code = 'UENR'
ON CONFLICT (department_id, name) DO NOTHING;
