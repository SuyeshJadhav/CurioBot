import supabase from "./supabase";

export interface Article {
  id: string;
  user_id: string;
  title: string;
  content: string;
  domain: string;
  summary: string;
  created_at: string;
  rabbit_holes?: RabbitHole[];
  tldr?: string;
}

export interface SavedSketch {
  id: string;
  user_id: string;
  article_id: string;
  notes: string | null;
  created_at: string;
  articles?: Article;
}

export interface DailyWonder {
  id: string;
  topic: string;
  summary: string;
  domain: string;
  publish_date: string;
  created_at: string;
  article_id?: string; // Optional if we link it
}

export interface LibraryCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// ── Article Operations ─────────────────────────────────────────

import { UserSettings, RabbitHole } from "../types";

export async function saveArticle(
  userId: string,
  title: string,
  content: string,
  domain: string,
  summary: string,
  rabbitHoles?: RabbitHole[],
  tldr?: string
): Promise<string> {
  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: userId,
      title,
      content,
      domain,
      summary,
      rabbit_holes: rabbitHoles,
      tldr,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save article: ${error.message}`);
  }

  return data.id;
}

export async function getArticleHistory(userId: string): Promise<Partial<Article>[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, domain, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch article history: ${error.message}`);
  }

  return data || [];
}

export async function getArticleById(articleId: string): Promise<Article> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch article: ${error.message}`);
  }

  return data;
}

// ── Saved Sketches Operations ──────────────────────────────────

export async function saveSketch(userId: string, articleId: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from("saved_sketches")
    .upsert({
      user_id: userId,
      article_id: articleId,
      notes: notes || null,
    }, { onConflict: "user_id,article_id" });

  if (error) {
    throw new Error(`Failed to save sketch: ${error.message}`);
  }
}

export async function unsaveSketch(userId: string, articleId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_sketches")
    .delete()
    .eq("user_id", userId)
    .eq("article_id", articleId);

  if (error) {
    throw new Error(`Failed to unsave sketch: ${error.message}`);
  }
}

export async function getSavedSketches(userId: string) {
  const { data, error } = await supabase
    .from("saved_sketches")
    .select(`
      id,
      notes,
      created_at,
      article_id,
      articles (
        id,
        title,
        domain,
        summary,
        content
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch saved sketches: ${error.message}`);
  }

  return data || [];
}

export async function updateSketchNotes(userId: string, articleId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from("saved_sketches")
    .update({ notes })
    .eq("user_id", userId)
    .eq("article_id", articleId);

  if (error) {
    throw new Error(`Failed to update sketch notes: ${error.message}`);
  }
}

// ── Daily Wonders Operations ───────────────────────────────────

export async function getDailyWonder() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_wonders")
    .select("*")
    .eq("publish_date", today)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch daily wonder: ${error.message}`);
  }

  return data;
}

export async function publishDailyWonder(
  topic: string,
  summary: string,
  domain: string,
  articleId: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("daily_wonders")
    .insert({
      topic,
      summary,
      domain,
      article_id: articleId,
      publish_date: today,
    });

  if (error) {
    // If it fails because of duplicate publish_date, we ignore it
    if (error.code !== "23505") {
      throw new Error(`Failed to publish daily wonder: ${error.message}`);
    }
  }
}

// ── Library Collections Operations ──────────────────────────────

export async function getLibraryCollections(userId: string): Promise<LibraryCollection[]> {
  const { data, error } = await supabase
    .from("library_collections")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch library collections: ${error.message}`);
  }

  return data || [];
}

export async function createLibraryCollection(
  userId: string,
  name: string,
  description?: string
): Promise<LibraryCollection> {
  const { data, error } = await supabase
    .from("library_collections")
    .insert({
      user_id: userId,
      name,
      description: description || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create collection: ${error.message}`);
  }

  return data;
}

export async function addArticleToCollection(collectionId: string, articleId: string): Promise<void> {
  const { error } = await supabase
    .from("library_articles")
    .insert({
      collection_id: collectionId,
      article_id: articleId,
    });

  if (error) {
    // Ignore duplicate entries in collection
    if (error.code !== "23505") {
      throw new Error(`Failed to add article to collection: ${error.message}`);
    }
  }
}

export async function getCollectionArticles(collectionId: string) {
  const { data, error } = await supabase
    .from("library_articles")
    .select(`
      id,
      created_at,
      articles (
        id,
        title,
        domain,
        summary
      )
    `)
    .eq("collection_id", collectionId);

  if (error) {
    throw new Error(`Failed to fetch articles in collection: ${error.message}`);
  }

  return data || [];
}

// ── User Settings & Article Deletion Operations ────────────────

const DEFAULT_SETTINGS: UserSettings = {
  knowledge_level: "intermediate",
  reading_time: "5min",
  topic_novelty: "mixed",
  model: "gemini-3.1-flash-lite",
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch settings, using default:", error);
    return DEFAULT_SETTINGS;
  }

  if (!data || !data.settings) {
    return DEFAULT_SETTINGS;
  }

  return data.settings as UserSettings;
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      settings: settings as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to save user settings: ${error.message}`);
  }
}

export async function deleteArticle(userId: string, articleId: string): Promise<void> {
  // 1. Delete matching entries from library_articles
  await supabase.from("library_articles").delete().eq("article_id", articleId);

  // 2. Delete matching entries from saved_sketches
  await supabase.from("saved_sketches").delete().eq("article_id", articleId);

  // 3. Delete matching entries from daily_wonders
  await supabase.from("daily_wonders").delete().eq("article_id", articleId);

  // 4. Finally delete the article itself
  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete article: ${error.message}`);
  }
}

export async function recordArticleRead(userId: string, articleId: string): Promise<void> {
  const { error } = await supabase
    .from("article_reads")
    .insert({
      user_id: userId,
      article_id: articleId,
    });

  if (error) {
    console.error(`Failed to record article read: ${error.message}`);
  }
}

export async function getArticleReadDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("article_reads")
    .select("read_at")
    .eq("user_id", userId)
    .order("read_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch article read dates: ${error.message}`);
    return [];
  }

  return (data || []).map((row: any) => row.read_at);
}


