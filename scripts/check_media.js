const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c\\.system_generated\\logs\\transcript_full.jsonl')
});

rl.on('line', (line) => {
  if (line.includes('"media"')) {
    const obj = JSON.parse(line);
    console.log(`Step ${obj.step_index} (${obj.source}):`, obj.media);
  }
});
