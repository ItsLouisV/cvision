import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table('interview_sessions').select('id').limit(1).execute()
    if res.data:
        session_id = res.data[0]['id']
        print(f"Testing update on session {session_id}")
        
        # Test 1: string
        try:
            supabase.table('interview_sessions').update({
                "overall_feedback": "{\"test\": 1}"
            }).eq('id', session_id).execute()
            print("String update SUCCESS")
        except Exception as e:
            print(f"String update FAILED: {e}")

        # Test 2: dict
        try:
            supabase.table('interview_sessions').update({
                "overall_feedback": {"test": 2}
            }).eq('id', session_id).execute()
            print("Dict update SUCCESS")
        except Exception as e:
            print(f"Dict update FAILED: {e}")
            
except Exception as e:
    print(f"Test script failed: {e}")
