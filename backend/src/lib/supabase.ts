import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config()

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error("Missing Supabase URL or Key");
}

const client = createClient(supabaseUrl, supabaseKey);

export default client;