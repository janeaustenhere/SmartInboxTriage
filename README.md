# Smart Inbox Triage

**Smart Inbox Triage** is an operations intelligence dashboard built for Logistics Operations Managers (like Riya) to process 80+ unstructured morning WhatsApp & email messages in one shot. It classifies urgency, highlights why issues matter, provides practical recommended actions, and prepares editable draft replies with one-click copying.

---

## 🚀 Key Features

- **High-Recall Urgent Risk Prioritisation**:
  - `Critical`: Safety incident, vehicle breakdown, stranded shipment, major customer escalation.
  - `High`: Delivery delay, vendor blocker, urgent customer complaint.
  - `Medium`: Non-critical follow-up required today.
  - `Needs Review`: Incomplete or ambiguous message requiring human confirmation.
  - `Low`: Delivery confirmation, routine status update, acknowledgement.
- **Top Metrics Overview**: Instant counters for **Action Now** (Critical + High), **Review Today** (Medium + Needs Review), and **Can Wait** (Low).
- **Human-in-the-Loop Safeguards**: Recommended next steps and editable draft replies with one-click copy to clipboard.
- **Durable Persistence**: Saves triage runs and individual messages into **Supabase** (`triage_runs` and `triaged_messages` tables), with graceful local memory fallback.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend / AI**: Node.js Express, Google Gemini 3.7 Flash (`@google/genai`)
- **Database**: Supabase PostgreSQL (`@supabase/supabase-js`)
- **Bundler & Tooling**: Vite, esbuild, tsx

---

## 📋 Required Environment Variables

Create a `.env` file in the project root:

```env
# Gemini API Key (Server-side AI analysis)
GEMINI_API_KEY="your_gemini_api_key"

# Supabase Persistence (Optional for local testing, required for permanent DB persistence)
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🗄️ Supabase Setup Instructions

1. Log in to [Supabase](https://supabase.com) and create a new project.
2. In the Supabase dashboard, navigate to the **SQL Editor**.
3. Paste and run the following migration script:

```sql
-- 1. Create triage_runs table
CREATE TABLE IF NOT EXISTS public.triage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create triaged_messages table
CREATE TABLE IF NOT EXISTS public.triaged_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.triage_runs(id) ON DELETE CASCADE,
  original_message TEXT NOT NULL,
  priority TEXT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  draft_reply TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.85,
  missing_information JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Enable Row Level Security (RLS) policies
ALTER TABLE public.triage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triaged_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on triage_runs" 
  ON public.triage_runs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on triage_runs" 
  ON public.triage_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on triaged_messages" 
  ON public.triaged_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on triaged_messages" 
  ON public.triaged_messages FOR INSERT WITH CHECK (true);

-- 4. Create Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_triaged_messages_run_id ON public.triaged_messages(run_id);
```

4. Go to **Project Settings > API** in Supabase and copy:
   - **Project URL** -> `SUPABASE_URL`
   - **anon / public key** (or service_role key) -> `SUPABASE_KEY`

---

## 💻 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 How to Deploy on Vercel

1. Push your code repository to **GitHub**.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set the **Framework Preset** to `Vite`.
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API Key
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_KEY`: Your Supabase API Key
6. Click **Deploy**.

For full-stack deployment with serverless API functions on Vercel:
- Build command: `npm run build`
- Output directory: `dist`

---

## 🛡️ Product Note

*AI suggestions should always be reviewed by an operations team member before action is taken or replies are dispatched.*
