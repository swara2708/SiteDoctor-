-- Migration Patch: Add Email Notifications Preferences Column
-- Run this query in your Supabase SQL Editor:

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
