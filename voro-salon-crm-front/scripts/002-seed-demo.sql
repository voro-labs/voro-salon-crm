-- 002-seed-demo.sql
-- Seed a demo tenant with admin user and sample data

-- Demo tenant
INSERT INTO tenants (id, slug, name, primary_color, secondary_color, contact_phone, contact_email, theme_mode)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'demo',
  'Studio Beleza',
  '#0f172a',
  '#6366f1',
  '(11) 99999-0000',
  'contato@studiobeleza.com',
  'light'
) ON CONFLICT (slug) DO NOTHING;

-- Admin user: admin@demo.com / 123456
-- bcryptjs hash of '123456' with 10 rounds
INSERT INTO users (id, tenant_id, name, email, password_hash, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Administrador',
  'admin@demo.com',
  '$2a$10$rQEY7oPvMzDi0g8gKJiOaeKbm3RiP8CilWgJQFHYnMiPkNNOJkdGu',
  'admin'
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Sample clients
INSERT INTO clients (id, tenant_id, name, phone, notes) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Maria Silva', '(11) 98765-4321', 'Cliente VIP, prefere produtos orgânicos'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ana Santos', '(11) 91234-5678', 'Alergia a amônia'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Julia Oliveira', '(11) 93456-7890', ''),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Carla Ferreira', '(11) 94567-8901', 'Agenda somente aos sábados'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Beatriz Costa', '(11) 95678-9012', '')
ON CONFLICT DO NOTHING;

-- Sample services (spread across 6 months for chart data)
INSERT INTO services (tenant_id, client_id, service_date, description, amount, notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 months', 'Corte e escova', 120.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 months', 'Coloração', 250.00, 'Tom loiro mel'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '4 months', 'Hidratação profunda', 90.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 months', 'Manicure e pedicure', 80.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 months', 'Progressiva', 350.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 months', 'Corte e escova', 120.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', NOW() - INTERVAL '2 months', 'Corte feminino', 85.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 months', 'Coloração e escova', 280.00, 'Raiz retoque'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 month', 'Manicure', 45.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 month', 'Escova modelada', 70.00, ''),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days', 'Corte e hidratação', 150.00, 'Tratamento capilar completo'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', NOW() - INTERVAL '1 day', 'Coloração completa', 300.00, 'Primeira vez com mechas'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', NOW(), 'Corte e escova', 120.00, '')
ON CONFLICT DO NOTHING;
