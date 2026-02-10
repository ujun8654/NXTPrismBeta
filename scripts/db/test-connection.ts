import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import dns from 'dns';

// IPv4 강제 (Supabase IPv6 문제 우회)
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function tryConnect(label: string, config: any) {
  const sql = postgres(config);
  try {
    const result = await sql`SELECT NOW() as time, current_database() as db, version() as ver`;
    console.log(`✅ [${label}] 연결 성공!`);
    console.log(`   시간: ${result[0].time}`);
    console.log(`   DB: ${result[0].db}`);
    console.log(`   버전: ${result[0].ver.slice(0, 60)}...`);
    await sql.end();
    return true;
  } catch (err: any) {
    console.error(`❌ [${label}] 실패:`, err.message);
    await sql.end();
    return false;
  }
}

async function main() {
  // 시도 1: Pooler Transaction mode (6543)
  let ok = await tryConnect('Pooler 6543', {
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    username: 'postgres.qnlbthkinposqfvjepnu',
    password: 'NxtPrism2026',
    ssl: 'require',
  });
  if (ok) return;

  // 시도 2: Pooler Session mode (5432)
  ok = await tryConnect('Pooler 5432', {
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    username: 'postgres.qnlbthkinposqfvjepnu',
    password: 'NxtPrism2026',
    ssl: 'require',
  });
  if (ok) return;

  // 시도 3: Direct connection (IPv4 강제)
  ok = await tryConnect('Direct', {
    host: 'db.qnlbthkinposqfvjepnu.supabase.co',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: 'NxtPrism2026',
    ssl: 'require',
  });
  if (ok) return;

  console.log('\n모든 방법 실패. Supabase 대시보드에서 아래를 확인해주세요:');
  console.log('  1. Settings > Database > Connection pooling이 켜져 있는지');
  console.log('  2. Database password가 정확한지');
  console.log('  3. "Resolve" 버튼으로 IPv4 호환성을 켰는지');
}

main();
