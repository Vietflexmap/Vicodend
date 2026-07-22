import fs from 'node:fs';
import path from 'node:path';
import {sha256} from './security.js';

export class HashLedger {
  constructor(file = 'data/ledger.ndjson') { this.file=file; fs.mkdirSync(path.dirname(file), {recursive:true}); }
  append(event) {
    const lines = fs.existsSync(this.file) ? fs.readFileSync(this.file,'utf8').trim().split('\n').filter(Boolean) : [];
    const previousHash = lines.length ? JSON.parse(lines.at(-1)).hash : '0'.repeat(64);
    const body = {timestamp:new Date().toISOString(), previousHash, event};
    const row = {...body, hash:sha256(JSON.stringify(body))};
    fs.appendFileSync(this.file, JSON.stringify(row)+'\n', {mode:0o600}); return row;
  }
  verify() {
    if (!fs.existsSync(this.file)) return {valid:true, entries:0};
    let previousHash='0'.repeat(64), count=0;
    for (const line of fs.readFileSync(this.file,'utf8').trim().split('\n').filter(Boolean)) {
      const row=JSON.parse(line); const {hash,...body}=row;
      if (body.previousHash!==previousHash || sha256(JSON.stringify(body))!==hash) return {valid:false, entries:count};
      previousHash=hash; count++;
    }
    return {valid:true, entries:count, head:previousHash};
  }
}
