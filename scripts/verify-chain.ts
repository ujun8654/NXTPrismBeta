/**
 * 체인 검증만 실행하는 간단한 스크립트
 * 사용법: npx tsx scripts/verify-chain.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EvidenceLedger } from '../packages/evidence-ledger/src/ledger';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const ledger = new EvidenceLedger(supabase);

  console.log('\n  NXTPrism Chain Verification');
  console.log('  ==========================\n');

  const result = await ledger.verifyChain(TENANT_ID);

  if (result.valid) {
    console.log(`  Result: VALID`);
    console.log(`  Records checked: ${result.records_checked}`);
    console.log('\n  All records are intact. No tampering detected.\n');
  } else {
    console.log(`  Result: INVALID`);
    console.log(`  Records checked: ${result.records_checked}`);
    if (result.first_invalid_at) {
      console.log(`  Tampered at: sequence #${result.first_invalid_at}`);
    }
    if (result.error) {
      console.log(`  Reason: ${result.error}`);
    }
    console.log('\n  TAMPERING DETECTED!\n');
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
