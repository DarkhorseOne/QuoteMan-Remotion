import fs from 'fs-extra';
import path from 'path';

type QuoteInput = {
  id: string;
  tag: string;
  quote: string;
  author: string;
};

type QuoteNormalized = {
  id: string;
  text: string;
  author?: string;
  tag?: string;
  raw: string;
};

const INPUT_PATH = path.join(process.cwd(), 'quotes', 'quotes.json');
const OUTPUT_PATH = path.join(process.cwd(), 'quotes', 'normalized.json');

async function normalize() {
  console.log('📖 Reading quotes from:', INPUT_PATH);
  
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('❌ Input file not found!');
    process.exit(1);
  }

  const rawData: QuoteInput[] = await fs.readJSON(INPUT_PATH);
  console.log(`🔍 Found ${rawData.length} quotes.`);

  const normalized: QuoteNormalized[] = rawData.map((item) => {
    const raw = item.quote;
    const id = item.id;
    let text = raw;
    let author: string | undefined = item.author; 

    const delimiters = [' ― ', ' — ', ' - '];
    for (const delimiter of delimiters) {
      if (text.includes(delimiter)) {
        const parts = text.split(delimiter);
        const extractedAuthor = parts.pop()?.trim();
        if (!author) author = extractedAuthor;
        
        text = parts.join(delimiter).trim();
        break;
      }
    }

    text = text.replace(/^["“”]|["“”]$/g, '').trim();

    return {
      id,
      text,
      author,
      tag: item.tag,
      raw
    };
  });

  await fs.writeJSON(OUTPUT_PATH, normalized, { spaces: 2 });
  console.log(`✅ Wrote ${normalized.length} normalized quotes to ${OUTPUT_PATH}`);
}

normalize().catch(err => {
  console.error('❌ Error normalizing quotes:', err);
  process.exit(1);
});
