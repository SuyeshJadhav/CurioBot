import { supervisorAgent } from '../agents/supervisor';
import supabase from './supabase';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const WONDER_INTERESTS = [
  'astronomy', 'nature', 'lost history', 'deep oceans',
  'ancient civilizations', 'quantum mechanics', 'space exploration',
  'biotechnology', 'neuroscience', 'game theory'
];

async function checkAndPreGeneratePool() {
  console.log('🔄 [Wonder Worker] Checking pre-generation wonder pool size...');
  
  try {
    // 1. Check count of unused articles in wonder_pool
    const { count, error } = await supabase
      .from('wonder_pool')
      .select('*', { count: 'exact', head: true })
      .is('used_at', null);

    if (error) {
      console.error('⚠️ [Wonder Worker] Failed to check wonder pool size:', error.message);
      return;
    }

    const currentSize = count || 0;
    console.log(`📊 [Wonder Worker] Current unused wonder pool size: ${currentSize}/3`);

    if (currentSize < 3) {
      const needed = 3 - currentSize;
      console.log(`🚀 [Wonder Worker] Pool size below target. Pre-generating ${needed} articles...`);

      for (let i = 0; i < needed; i++) {
        // Pick random interests for general curiosity
        const shuffled = [...WONDER_INTERESTS].sort(() => 0.5 - Math.random());
        const selectedInterests = shuffled.slice(0, 3);

        console.log(`✍️ [Wonder Worker] Pre-generating article ${i + 1}/${needed} with interests:`, selectedInterests);

        try {
          const result = await supervisorAgent(
            selectedInterests,
            SYSTEM_USER_ID
          );

          if (result.currentTopic && result.article) {
            const { error: insertError } = await supabase
              .from('wonder_pool')
              .insert({
                topic: result.currentTopic.title,
                summary: result.currentTopic.summary,
                domain: result.currentTopic.domain,
                article: result.article,
                rabbit_holes: result.rabbitHoles || [],
              });

            if (insertError) {
              console.error('⚠️ [Wonder Worker] Failed to insert pre-generated article to wonder_pool:', insertError.message);
            } else {
              console.log(`✅ [Wonder Worker] Pre-generated article "${result.currentTopic.title}" added successfully.`);
            }
          } else {
            console.error('⚠️ [Wonder Worker] Supervisor pipeline returned empty content.');
          }
        } catch (pipelineErr: any) {
          console.error('⚠️ [Wonder Worker] Error running supervisor pipeline:', pipelineErr.message || pipelineErr);
        }

        // Wait a short time between generations to avoid hitting rate limits
        if (i < needed - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } else {
      console.log('✅ [Wonder Worker] Pool target is satisfied. No new generation needed.');
    }
  } catch (err: any) {
    console.error('⚠️ [Wonder Worker] Unexpected error in worker loop:', err.message || err);
  }
}

export function initWonderWorker() {
  console.log('⚙️ [Wonder Worker] Initializing Daily Wonder Pre-Generation Worker...');
  
  // Run check immediately on startup
  setTimeout(() => {
    checkAndPreGeneratePool();
  }, 10000); // 10 seconds delay after startup to let server settle

  // Check pool size every hour
  const ONE_HOUR_MS = 60 * 60 * 1000;
  setInterval(() => {
    checkAndPreGeneratePool();
  }, ONE_HOUR_MS);
}
