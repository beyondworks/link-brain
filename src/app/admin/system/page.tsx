import { supabaseAdmin } from '@/lib/supabase/admin';
import { Database, Key, Globe, Link2 } from 'lucide-react';

async function getSystemStats() {
  const db = supabaseAdmin as never as typeof supabaseAdmin;

  const [
    apiKeysResult,
    oauthResult,
    collectionsResult,
    sharedCollectionsResult,
  ] = await Promise.all([
    db.from('api_keys').select('id', { count: 'exact', head: true }),
    db.from('oauth_connections').select('id', { count: 'exact', head: true }),
    db.from('collections').select('id', { count: 'exact', head: true }),
    db.from('collections').select('id', { count: 'exact', head: true }).eq('is_public', true),
  ]);

  return {
    apiKeys: apiKeysResult.count ?? 0,
    oauthConnections: oauthResult.count ?? 0,
    collections: collectionsResult.count ?? 0,
    sharedCollections: sharedCollectionsResult.count ?? 0,
  };
}

export default async function AdminSystemPage() {
  const stats = await getSystemStats();

  const items = [
    { label: 'API 키', value: stats.apiKeys, icon: Key, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'OAuth 연결', value: stats.oauthConnections, icon: Link2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: '전체 컬렉션', value: stats.collections, icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: '공개 컬렉션', value: stats.sharedCollections, icon: Globe, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">시스템</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        API, OAuth, 컬렉션 등 시스템 리소스 현황입니다.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                  <Icon size={18} className={item.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold text-foreground">환경 정보</h2>
        <div className="mt-4 space-y-2">
          {[
            ['Node.js', process.version],
            ['Next.js', '15'],
            ['환경', process.env.NODE_ENV ?? 'development'],
            ['Supabase URL', process.env.NEXT_PUBLIC_SUPABASE_URL ?? '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <span className="text-xs font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
