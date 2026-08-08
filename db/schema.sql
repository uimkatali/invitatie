CREATE TABLE IF NOT EXISTS admin_user (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  recipient_name TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  event_date_iso TEXT NOT NULL,
  website_intro_line TEXT NOT NULL,
  website_tap_prompt TEXT NOT NULL,
  website_reveal_steps JSONB NOT NULL,
  website_countdown_label TEXT NOT NULL,
  website_countdown_complete_label TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_preheader TEXT NOT NULL,
  email_body_paragraphs JSONB NOT NULL,
  email_cta_text TEXT NOT NULL,
  email_cta_url TEXT NOT NULL,
  login_title TEXT NOT NULL,
  login_hint TEXT NOT NULL,
  login_username_label TEXT NOT NULL,
  login_password_label TEXT NOT NULL,
  login_submit_text TEXT NOT NULL,
  login_error_text TEXT NOT NULL,
  login_expected_username TEXT NOT NULL,
  login_expected_password TEXT NOT NULL,
  active_theme_id TEXT NOT NULL DEFAULT 'alien-field',
  theme_color_overrides JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('heroBackground', 'revealBackground', 'gallery')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
