-- Reference data only. Never seed real users, profiles, credentials, or messages.
insert into public.supported_countries (code, name, is_active) values
  ('KE', 'Kenya', true), ('UG', 'Uganda', true), ('TZ', 'Tanzania', true),
  ('RW', 'Rwanda', true), ('GH', 'Ghana', true), ('NG', 'Nigeria', true),
  ('ZA', 'South Africa', true), ('GB', 'United Kingdom', true), ('IT', 'Italy', true),
  ('DE', 'Germany', true), ('FR', 'France', true), ('US', 'United States', true)
on conflict (code) do update set name = excluded.name, is_active = excluded.is_active;
