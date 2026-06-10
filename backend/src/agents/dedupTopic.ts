import { AgentStateType, NodeMetrics } from "../types";
import { matchSeenTopics } from "../lib/memory";

export async function dedupTopicNode(
	state: AgentStateType           // ← only this param, no metrics arg
): Promise<Partial<AgentStateType>> {
	const startTime = Date.now();

	if (!state.currentTopic) {
		return { dedupPassed: false };
	}

	// If a specific topic was requested, bypass dedup similarity check entirely
	if (state.requestedTopic) {
		console.log(`✅ [Dedup] Bypassing dedup for requested topic: "${state.currentTopic.title}"`);
		const nodeMetric: NodeMetrics = {
			nodeName: "dedup_topic",
			durationMs: Date.now() - startTime,
			success: true,
		};
		return { dedupPassed: true, nodeMetrics: [nodeMetric] };
	}

	// Reuse the embedding already computed by topicPicker — no extra API call
	if (!state.topicEmbedding) {
		console.warn("⚠️ [Dedup] No embedding found, skipping dedup check.");
		return { dedupPassed: true };
	}

	const similarSeen = await matchSeenTopics(
		state.topicEmbedding,
		state.userId,
		0.85
	);

	const nodeMetric: NodeMetrics = {
		nodeName: "dedup_topic",
		durationMs: Date.now() - startTime,
		success: true,
	};

	if (similarSeen.length === 0) {
		console.log(`✅ [Dedup] "${state.currentTopic.title}" is fresh.`);
		return { dedupPassed: true, dedupAttempts: state.dedupAttempts, nodeMetrics: [nodeMetric] };
	}

	console.log(`🔄 [Dedup] Too similar to: ${similarSeen.map(t => `${t.topic} (similarity: ${t.similarity.toFixed(4)})`).join(", ")}. Retry.`);
	return {
		dedupPassed: false,
		dedupAttempts: state.dedupAttempts + 1,
		currentTopic: undefined,
		topicEmbedding: undefined,
		// Feed matched titles into seenTopics so topicPicker avoids them next attempt
		seenTopics: similarSeen.map(t => t.topic),
		nodeMetrics: [nodeMetric],
	};
}
