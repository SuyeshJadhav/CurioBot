import "dotenv/config";
import supabase from "../src/lib/supabase";

async function main() {
  const { data, error } = await supabase.from("article_reads").select("*").limit(1);
  if (error) {
    console.error("article_reads table error:", error.message);
  } else {
    console.log("Success! article_reads table exists. Row count sample:", data);
  }
}

main();
