import { generateEmbedding } from "./embeddings";
import supabase from "./supabase";

export async function addInterest(interest: string, userId: string) {
  const vector = await generateEmbedding(interest);
  await supabase.from('interests').insert({ user_id: userId, interest, embedding: vector });
}

export async function getRelevantInterests(topic: string, userId: string) {
  const vector = await generateEmbedding(topic);
  const { data, error } = await supabase.rpc("match_interests", {
    p_user_id: userId,
    query_embedding: vector,
    match_threshold: 0.4,
    match_count: 5
  });
  if (error) throw error;
  return data;
}

export async function getInterests(userId: string): Promise<{ interest: string }[]> {
  const { data, error } = await supabase.rpc('get_random_interests', {
    p_user_id: userId
  });
  if (error) throw error;
  return (data || []) as { interest: string }[];
}


export async function getAllInterests(userId: string): Promise<{ interest: string }[]> {
  const { data, error } = await supabase
    .from('interests')
    .select('interest')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as { interest: string }[];
}

export async function getRecentSeenTopics(userId: string, limit: number = 20): Promise<string[]> {
  const { data, error } = await supabase
    .from('seen_topics')
    .select('topic')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('⚠️ getRecentSeenTopics failed:', error.message);
    return [];
  }
  return (data || []).map((row: any) => row.topic);
}

export async function matchSeenTopics(
  queryEmbedding: number[],
  userId: string,
  threshold: number = 0.85
): Promise<{ topic: string; similarity: number }[]> {
  const { data, error } = await supabase.rpc('match_seen_topics', {
    p_user_id: userId,
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: 5,
  });
  if (error) {
    console.warn('⚠️ matchSeenTopics RPC failed (may not exist yet):', error.message);
    return [];
  }
  return (data || []) as { topic: string; similarity: number }[];
}

export async function addSeenTopic(title: string, summary: string, userId: string, preComputedEmbedding?: number[]) {
  const vector = preComputedEmbedding || await generateEmbedding(`${title}\n${summary}`);
  const { error } = await supabase.from('seen_topics').insert({
    user_id: userId,
    topic: title,
    embedding: vector
  });

  if (error) throw error;
}

export async function deleteInterest(interest: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('interests')
    .delete()
    .eq('user_id', userId)
    .eq('interest', interest);
  if (error) throw error;
}

export async function getUserInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("interests")
    .select("interest")
    .eq("user_id", userId);

  if (error) throw error;

  if (!data || data.length === 0) {
    // Seed default interests — broad, magazine-style categories
    const defaults = [
      "how things work",
      "surprising science",
      "forgotten history",
      "human behavior",
      "food and culture",
      "great stories",
      "money and power",
      "the natural world",
    ];

    for (const interest of defaults) {
      await addInterest(interest, userId);
    }
    return defaults;
  }

  return data.map((d: any) => d.interest);
}