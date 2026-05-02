import { generateEmbedding } from "./embeddings";
import supabase from "./supabase";

export async function addInterest(interest: string) {
	const vector = await generateEmbedding(interest);
	await supabase.from('interests').insert({ interest, embedding: vector })
}

export async function getRelevantInterests(topic: string) {
	const vector = await generateEmbedding(topic);
	const { data, error } = await supabase.rpc("match_interests", {
		query_embedding: vector,
		match_threshold: 0.4,
		match_count: 5
	})
	if (error) throw error;
	return data;
}

export async function getInterests(): Promise<{ interest: string }[]> {
	const { data, error } = await supabase.rpc('get_random_interests');
	if (error) throw error;
	return (data || []) as { interest: string }[];
}

export async function addSeenTopic(title: string, summary: string) {
	const vector = await generateEmbedding(`${title}\n${summary}`);
	const { error } = await supabase.from('seen_topics').insert({
		topic: title,
		embedding: vector
	});

	if (error) throw error;
}