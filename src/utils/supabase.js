
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = async (supabaseaccessToken) => {
const supabase = createClient(supabaseUrl, supabaseKey,{
    global: {  
        headers: { 
            Authorization: `Bearer ${supabaseaccessToken}`,
        }, 
    },
});
 return supabase;
}
export default SupabaseClient; 