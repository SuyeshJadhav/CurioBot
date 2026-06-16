import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  
  const tables = ["users", "articles", "interests", "seen_topics", "library_collections", "library_articles", "saved_sketches", "daily_wonders", "wonder_pool", "user_settings", "article_reads"];
  
  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
        
      if (error) {
        console.error(`❌ Table "${table}": Error checking - ${error.message} (code: ${error.code})`);
      } else {
        console.log(`✅ Table "${table}" exists. Row count: ${count}`);
      }
    } catch (err: any) {
      console.error(`❌ Table "${table}": Failed to check - ${err.message}`);
    }
  }
}

checkDatabase().catch(console.error);
