-- Seed data for the database

-- Insert dashboard metrics
INSERT INTO dashboard_metrics (metric_name, metric_value, metric_type, category) VALUES
('Total Sessions', 1250, 'count', 'sessions'),
('Active Sessions', 823, 'count', 'sessions'),
('Session Growth Rate', 15.3, 'percentage', 'sessions'),
('Monthly Revenue', 45678.90, 'currency', 'revenue'),
('Revenue Growth', 8.5, 'percentage', 'revenue'),
('API Response Time', 145, 'time', 'performance'),
('Cache Hit Rate', 87.5, 'percentage', 'performance'),
('Database Load', 34.2, 'percentage', 'system'),
('CPU Usage', 23.8, 'percentage', 'system'),
('Memory Usage', 56.3, 'percentage', 'system'),
('Total Requests', 125430, 'count', 'performance'),
('Error Rate', 0.23, 'percentage', 'performance'),
('Success Rate', 99.77, 'percentage', 'performance'),
('Average Session Time', 342, 'time', 'sessions'),
('Conversion Rate', 4.2, 'percentage', 'revenue');

-- Insert sample health checks
INSERT INTO health_checks (service_name, status, response_time) VALUES
('api', 'healthy', 45),
('database', 'healthy', 12),
('workers-ai', 'healthy', 234),
('ai-gateway', 'healthy', 89),
('cdn', 'healthy', 23);

-- Insert sample session-owned notifications
INSERT INTO notifications (session_key, type, title, message, is_read) VALUES
('demo-session', 'info', 'Welcome!', 'Welcome to the platform. Your API-key-authenticated session is ready.', false),
('demo-session', 'success', 'System Update', 'The system has been successfully updated to version 2.0.', false),
('demo-session', 'warning', 'High Traffic', 'Your API is experiencing higher than normal traffic.', true);

-- Insert sample threads
INSERT INTO threads (session_key, title) VALUES
('demo-session', 'Getting Started with AI'),
('demo-session', 'Project Planning Discussion');

-- Insert sample messages
INSERT INTO messages (thread_id, role, content) VALUES
(1, 'user', 'Hello! Can you help me understand how to use the AI features?'),
(1, 'assistant', 'Of course! I''d be happy to help you get started with our AI features. We have several capabilities including chat, speech-to-text, and text-to-speech. What would you like to explore first?'),
(1, 'user', 'I''m interested in the speech-to-text feature.'),
(2, 'user', 'I need to plan a new project. Can you help me outline the key steps?'),
(2, 'assistant', 'Absolutely! Let''s break down your project planning into key phases: 1) Define objectives, 2) Identify stakeholders, 3) Set timeline, 4) Allocate resources, 5) Risk assessment. Which phase would you like to focus on first?');

-- Insert sample documents
INSERT INTO documents (session_key, title, content) VALUES
('demo-session', 'Project Overview', '[{"type":"paragraph","children":[{"text":"This is a sample project overview document."}]}]'),
('demo-session', 'Meeting Notes', '[{"type":"paragraph","children":[{"text":"Meeting notes from today..."}]}]');
