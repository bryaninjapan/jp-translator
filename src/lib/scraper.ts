import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export async function scrapeUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const buffer = Buffer.from(response.data);
    
    // Simple detection: check for charset in Content-Type header or meta tags
    // For now, try to decode as UTF-8, if it looks weird, try Shift_JIS. 
    // A more robust way is to look at the content-type header.
    let content = iconv.decode(buffer, 'utf-8');
    
    // Check for common Japanese characters or replacement characters to guess if decoding failed
    // This is a naive heuristic. Better to check charset meta tag.
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('Shift_JIS') || contentType.includes('shift_jis')) {
        content = iconv.decode(buffer, 'Shift_JIS');
    } else if (!contentType.includes('utf-8') && !contentType.includes('UTF-8')) {
        // Look for meta charset in the buffer
        const partialString = buffer.slice(0, 1000).toString('ascii');
        if (partialString.match(/charset=["']?shift_jis["']?/i)) {
            content = iconv.decode(buffer, 'Shift_JIS');
        }
    }

    const $ = cheerio.load(content);
    
    // Remove scripts, styles, navs, footers to get main content
    $('script, style, nav, footer, header, .ads, .sidebar').remove();
    
    // Try to find the main content container
    const mainSelectors = ['main', 'article', '#content', '.content', '#main', '.main', 'body'];
    let text = '';
    
    for (const selector of mainSelectors) {
      if ($(selector).length > 0) {
        // Get text, preserving some structure? 
        // For legal docs, paragraph structure is important.
        // We will extract text by paragraphs.
        const paragraphs: string[] = [];
        $(selector).find('p, h1, h2, h3, h4, h5, li, div').each((_, el) => {
             const t = $(el).text().trim();
             if (t.length > 0) paragraphs.push(t);
        });
        
        // De-duplicate and join
        text = [...new Set(paragraphs)].join('\n');
        if (text.length > 200) break; // If we found substantial text
      }
    }
    
    if (!text) {
        text = $('body').text().replace(/\s+/g, ' ').trim();
    }

    return text.substring(0, 15000); // Limit context window for LLM for now
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw new Error(`Failed to scrape ${url}`);
  }
}



