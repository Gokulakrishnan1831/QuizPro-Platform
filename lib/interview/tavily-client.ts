// lib/interview/tavily-client.ts

function getTavilyApiKeys(): string[] {
  const keysStr = process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY;
  if (!keysStr) {
    throw new Error('TAVILY_API_KEYS is not configured');
  }
  return keysStr.split(',').map((k) => k.trim()).filter(Boolean);
}

function shuffleKeys(keys: string[]): string[] {
  const arr = [...keys];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

/**
 * Searches for company interview questions using a rotating pool of Tavily API keys 
 * to bypass rate limits and pull targeted snippet data without hitting Cloudflare captchas.
 */
export async function searchTavilyCompanyQuestions(
  company: string,
  role: string
): Promise<TavilySearchResult[]> {
  let keys: string[] = [];
  try {
    keys = getTavilyApiKeys();
  } catch (error) {
    console.warn('Tavily API keys missing, skipping external web search fallback.');
    return [];
  }

  const shuffledKeys = shuffleKeys(keys);
  const query = `"${company}" "${role}" interview questions technical data analytics`;
  let lastError: Error | null = null;
  
  // Try up to 3 keys safely before bubbling out
  const maxAttempts = Math.min(3, Math.max(1, shuffledKeys.length));
  
  for (let i = 0; i < maxAttempts; i++) {
    const apiKey = shuffledKeys[i];
    try {
      // 5-second aggressive timeout to prevent Vercel blocking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: 'basic',
          include_domains: [
            'glassdoor.co.in', 
            'glassdoor.com', 
            'ambitionbox.com', 
            'interviewbit.com', 
            'geeksforgeeks.org'
          ],
          max_results: 8, // Enough context to trigger grounding, not enough to blow up token limits
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const rawText = await response.text();
        if (response.status === 429) {
           console.warn(`⚠ Tavily Rate Limit Hit for key index ${i}. Rotating load-balancer.`);
           throw new Error(`429: ${rawText}`);
        }
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.results) {
         return [];
      }
      
      console.log(`✅ Tavily search succeeded via load-balancer (Attempt ${i + 1})`);
      return data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      }));
      
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
          console.warn(`Tavily timeout on key index ${i}. Rotating...`);
      }
      if (i === maxAttempts - 1) {
        break;
      }
    }
  }
  
  console.warn('Tavily Search exhausted across all rotated keys. LLM will use internal fallback memory.');
  return []; // Graceful failover to original LLM RAG
}
