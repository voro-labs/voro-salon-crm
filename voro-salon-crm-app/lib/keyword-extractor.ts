
// Simple stopword list for English (and some Portuguese common words since user is Brazilian)
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "because", "as", "what",
  "when", "where", "how", "who", "whom", "which", "that", "it", "he",
  "she", "they", "we", "you", "i", "me", "him", "her", "them", "us",
  "my", "your", "his", "hers", "their", "our", "its", "on", "in", "at",
  "to", "for", "of", "with", "by", "from", "up", "down", "about", "into",
  "over", "after", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "can", "could", "should",
  "would", "will", "may", "might", "must", "very", "really", "just",
  "too", "so", "quite", "more", "most", "some", "any", "no", "not",
  "only", "own", "other", "another", "such", "like", "than", "new",
  "old", "good", "bad", "great", "small", "big", "high", "low",
  "long", "short", "first", "last", "next", "previous", "one", "two",
  "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  // Portuguese common words
  "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da",
  "em", "no", "na", "por", "para", "com", "sem", "e", "mas", "ou",
  "que", "se", "como", "quando", "onde", "quem", "qual", "ele", "ela",
  "eles", "elas", "nos", "vos", "eu", "tu", "meu", "teu", "seu",
  "nosso", "voso", "foi", "fui", "era", "ser", "estar", "tem", "tinha",
  "mais", "menos", "muito", "pouco", "bom", "mau", "sim", "nao", "não",
])

export function extractKeywords(text: string): string[] {
  if (!text) return []

  // improved regex to handle unicode characters for portuguese accents
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "") // Remove punctuation, keep letters and spaces
    .split(/\s+/)

  const keywords = words.filter((w) => w.length > 2 && !STOPWORDS.has(w))

  // Return unique keywords
  return Array.from(new Set(keywords))
}
