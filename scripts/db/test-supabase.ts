import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function main() {
  console.log('=== NXTPrism DB 확인 ===\n');

  // 1. 테넌트 테이블 확인
  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .select('*');

  if (tErr) {
    console.error('❌ tenants 테이블:', tErr.message);
  } else {
    console.log('✅ tenants 테이블 OK —', tenants.length, '건');
    if (tenants.length > 0) console.log('  ', tenants[0]);
  }

  // 2. evidence_records 테이블 확인
  const { data: evidence, error: eErr } = await supabase
    .from('evidence_records')
    .select('*')
    .limit(1);

  if (eErr) {
    console.error('❌ evidence_records 테이블:', eErr.message);
  } else {
    console.log('✅ evidence_records 테이블 OK —', evidence.length, '건');
  }

  // 3. checkpoints 테이블 확인
  const { data: checkpoints, error: cErr } = await supabase
    .from('checkpoints')
    .select('*')
    .limit(1);

  if (cErr) {
    console.error('❌ checkpoints 테이블:', cErr.message);
  } else {
    console.log('✅ checkpoints 테이블 OK —', checkpoints.length, '건');
  }

  console.log('\n=== 완료 ===');
}

main();
