import os
from supabase import create_client

SUPABASE_URL = "https://gueklxeyjaplddmuqnnr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1ZWtseGV5amFwbGRkbXVxbm5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE5ODI1MCwiZXhwIjoyMDgxNzc0MjUwfQ.dImD9jBjJ_AbV5zWYAFx7lMtARslN79YPIERxcFWVWo"

client = create_client(SUPABASE_URL, SUPABASE_KEY)
res = client.table("job_posts").select("*").limit(1).execute()
if res.data:
    row = res.data[0]
    for k, v in row.items():
        print(f"{k}: {type(v).__name__}")
