/**
 * Editorial templates that constrain the *shape* of a topic toward
 * narrative, accessible angles. One is randomly selected per generation
 * and injected into the topic picker prompt.
 */
export const editorialTemplates = [
  "The surprising reason [everyday thing] works the way it does",
  "The historical mistake that changed [modern thing] forever",
  "Why [common belief] is completely backwards",
  "The strange science behind [familiar experience]",
  "How [obscure historical event] accidentally created [modern phenomenon]",
  "The [country/culture] figured out [problem] 500 years before everyone else",
  "What [animal/plant] can teach us about [human behavior]",
  "The tiny detail that reveals something huge about [topic]",
  "The person you've never heard of who invented [ubiquitous thing]",
  "Why [two seemingly unrelated things] are secretly the same thing",
  "The experiment that changed how we understand [concept]",
  "What happens when [familiar system] breaks down completely",
];

export function pickRandomTemplate(): string {
  return editorialTemplates[Math.floor(Math.random() * editorialTemplates.length)];
}
