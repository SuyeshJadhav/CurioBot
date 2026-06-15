import "dotenv/config";
import supabase from "../src/lib/supabase";

async function main() {
  console.log("🔍 Fetching current users...");
  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("id, email, token_balance");

  if (fetchError) {
    console.error("❌ Failed to fetch users:", fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${users?.length || 0} user(s).`);
  if (users) {
    for (const u of users) {
      console.log(`  • User: ${u.email || u.id} | Current Balance: ${u.token_balance}`);
    }
  }

  console.log("\n🔄 Refreshing token limits for all accounts to 200,000...");
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("users")
    .update({
      token_balance: 200000,
      last_token_refresh: now
    })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all non-system users

  if (updateError) {
    console.error("❌ Failed to update users:", updateError.message);
    process.exit(1);
  }

  console.log("✅ Successfully refreshed all token limits to 200,000!");
  process.exit(0);
}

main();
