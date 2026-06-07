import "dotenv/config";
import supabase from "../src/lib/supabase";

async function main() {
  const { data, error } = await supabase.from("articles").select("*").limit(1);
  if (error) {
    console.error("articles table error:", error.message);
  } else {
    console.log("Articles columns:", data && data.length > 0 ? Object.keys(data[0]) : "No rows found in articles table");
  }

  // Also check if wonder_pool table exists
  const { data: wpData, error: wpError } = await supabase.from("wonder_pool").select("*").limit(1);
  if (wpError) {
    console.log("wonder_pool table does not exist or error:", wpError.message);
  } else {
    console.log("wonder_pool table exists! Columns:", wpData && wpData.length > 0 ? Object.keys(wpData[0]) : "No rows found in wonder_pool table");
  }
}

main();
