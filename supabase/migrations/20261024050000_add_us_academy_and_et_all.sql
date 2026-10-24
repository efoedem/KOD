-- Add the newly requested schools to the catalogue.
INSERT INTO public.schools (name)
VALUES
  ('US ACADEMY'),
  ('ET ALL')
ON CONFLICT (name) DO NOTHING;
