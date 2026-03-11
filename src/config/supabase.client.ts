import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Ensure environment variables are loaded if this is imported directly
// Checks for local .env in the same directory (useful for dev)
// Ensure environment variables are loaded from project root
dotenv.config({ path: path.join(process.cwd(), ".env") });


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Service Role Key must be provided in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
