'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Game, getSteamHeader, getSteamStoreUrl, statPanels } from '@/lib/data';
import { GameCard } from './game-card';
import { API_BASE } from '@/lib/api';
import { useExchange } from '@/lib/exchange-context';

const accentClass = {
  purple: 'from-[#9f6fff] to-[#5d33d6]',
  pink: 'from-[#ff73e2] to-[#b93cff]',
  cyan: 'from-[#57f0ff] to-[#2a7fff]',
  amber: 'from-[#ffd76d] to-[#ff8a3d]',
} as const;

// ── 타입 ──────────────────────────────────────────────────
type RawReview = {
  is_positive: boolean;
  playtime_hours: number;
  content: string;
  date: number;
};

type ReviewData = {
  positive: number;
  negative: number;
  totalReviews: number;
  topPositive: { content: string; playtime_hours: number }[];
  topNegative: { content: string; playtime_hours: number }[];
};

type PriceData = {
  KRW: number;
  USD: number;
  JPY: number;
};

type NewsItem = {
  gid: string;
  title: string;
  url: string;
  author: string;
  contents: string;
  feedlabel: string;
  date: number;
};

type PredictionData = {
  isOnSale: boolean;
  currentDiscount: number;
  currentPrice: number;
  regularPrice: number;
  avgCycleDays: number | null;
  lastSaleDate: string | null;
  nextPredictedDate: string | null;
  history: { date: string; discount: number; price: number }[];
};

// ── 유틸 ──────────────────────────────────────────────────
function stripHtml(str?: string) {
  if (!str) return ''; // 값이 없으면 빈 문자열을 반환하고 종료
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('ko-KR');
}

function LoadingSpinner() {
  return (
    <div className="flex h-20 items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c084fc] border-t-transparent" />
    </div>
  );
}

// ── 탭: 리뷰 요약 ────────────────────────────────────────
function TabReview({ gameId }: { gameId: number }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/steam-game/${gameId}/reviews`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((json) => {
        const reviews: RawReview[] = json.data ?? [];
        const total    = reviews.length;
        if (total === 0) throw new Error();
        const pos      = reviews.filter((r) => r.is_positive);
        const neg      = reviews.filter((r) => !r.is_positive);
        const pick = (arr: RawReview[], n = 3) =>
          [...arr]
            .filter((r) => r.content?.trim())
            .sort((a, b) => b.playtime_hours - a.playtime_hours)
            .slice(0, n)
            .map((r) => ({ content: r.content.slice(0, 200), playtime_hours: Math.round(r.playtime_hours) }));

        setData({
          positive: Math.round(pos.length / total * 100),
          negative: Math.round(neg.length / total * 100),
          totalReviews: total,
          topPositive: pick(pos),
          topNegative: pick(neg),
        });
      })
      .catch(() => setError('리뷰 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <p className="text-xs text-red-400">{error}</p>;
  if (!data)   return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs text-white/60">
            <span>긍정 {data.positive}%</span>
            <span>부정 {data.negative}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${data.positive}%` }} />
          </div>
        </div>
        <span className="text-xs text-white/40">총 {data.totalReviews.toLocaleString()}개</span>
      </div>
      {data.topPositive.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-emerald-400">👍 추천 리뷰</div>
          <div className="space-y-2">
            {data.topPositive.map((r, i) => (
              <div key={i} className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs leading-5 text-white/70">
                {r.content}<span className="ml-2 text-white/30">{r.playtime_hours}시간</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.topNegative.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-red-400">👎 비추천 리뷰</div>
          <div className="space-y-2">
            {data.topNegative.map((r, i) => (
              <div key={i} className="rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-5 text-white/70">
                {r.content}<span className="ml-2 text-white/30">{r.playtime_hours}시간</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 탭: 구매 타이밍 ──────────────────────────────────────
function TabPrediction({ gameId }: { gameId: number }) {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/game/${gameId}/discount-prediction`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError('할인 예측 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <p className="text-xs text-red-400">{error}</p>;
  if (!data)   return null;

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-3 text-sm ${data.isOnSale ? 'border-emerald-400/30 bg-emerald-400/8 text-emerald-300' : 'border-white/10 bg-white/5 text-white/60'}`}>
        {data.isOnSale
          ? `🎉 현재 ${data.currentDiscount}% 할인 중! ₩${data.currentPrice.toLocaleString()}`
          : `💤 현재 할인 없음 — 정가 ₩${data.regularPrice.toLocaleString()}`}
      </div>
      <div className="space-y-2 text-sm">
        {data.avgCycleDays && (
          <div className="flex justify-between text-white/65">
            <span>평균 할인 주기</span>
            <span className="font-semibold text-[#c084fc]">약 {data.avgCycleDays}일</span>
          </div>
        )}
        {data.lastSaleDate && (
          <div className="flex justify-between text-white/65">
            <span>마지막 할인일</span>
            <span>{data.lastSaleDate}</span>
          </div>
        )}
        {data.nextPredictedDate && (
          <div className="flex justify-between text-white/65">
            <span>다음 예상 할인</span>
            <span className="font-semibold text-amber-400">{data.nextPredictedDate} 예상</span>
          </div>
        )}
      </div>
      {data.history.length > 0 && (
        <div>
          <div className="mb-2 text-xs text-white/45">최근 할인 이력</div>
          <div className="space-y-1">
            {data.history.map((h, i) => (
              <div key={i} className="flex justify-between rounded-lg bg-white/4 px-3 py-1.5 text-xs text-white/60">
                <span>{h.date}</span>
                <span className="text-emerald-400">-{h.discount}%</span>
                <span>₩{h.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link href={`/predict/${gameId}`} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/10 bg-white/5 py-2 text-center text-xs text-white/60 hover:border-[#c084fc]/50 hover:text-white/80 transition">
        할인 예측 캘린더 전체 보기 →
      </Link>
    </div>
  );
}

// ── API에서 Game 객체 만들기 ──────────────────────────────
function buildGameFromApi(data: Record<string, unknown>, appId: number): Game {
  return {
    steamAppId:   appId,
    title:        (data.game_name as string) ?? `Game #${appId}`,
    genre:        [],
    tags:         [],
    score:        0,
    discountRate: 0,
    originalKRW:  0,
    priceKRW:     0,
    prices:       { kr: '-', us: '-', jp: '-' },
    platforms:    [
      ...(data.os_windows ? ['Windows'] : []),
      ...(data.os_mac     ? ['Mac']     : []),
      ...(data.os_linux   ? ['Linux']   : []),
    ],
    playtime:     '정보 없음',
    streamStatus: '-',
    reviewLabel:  '정보 없음',
    summary:      (data.game_description as string) ?? '',
    reason:       [],
    headerImage:  (data.header_image_url as string) ?? null,
  } as unknown as Game;
}

// ── 메인 DetailPage ───────────────────────────────────────
export function DetailPage({
  game: propGame,
  related,
  steamAppId: propAppId,
}: {
  game?: Game;
  related: Game[];
  steamAppId?: number;
}) {
  const [activeTab, setActiveTab]     = useState<'intro' | 'review' | 'timing'>('intro');
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const rates = useExchange();

  // ── API에서 게임 기본정보 로드 (더미에 없는 game_id용) ──
  const [apiGame, setApiGame]         = useState<Game | null>(null);
  const [gameLoading, setGameLoading] = useState(!propGame && !!propAppId);

  useEffect(() => {
    if (propGame || !propAppId) return;
    setGameLoading(true);
    fetch(`${API_BASE}/steam-game/${propAppId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data) setApiGame(buildGameFromApi(json.data, propAppId));
      })
      .catch(() => {})
      .finally(() => setGameLoading(false));
  }, [propAppId, propGame]);

  // 실제 사용할 game 객체
  const game = propGame ?? apiGame;
  const appId = game?.steamAppId ?? propAppId!;

  // ── 실시간 가격 API ───────────────────────────────────────
  const [prices, setPrices] = useState<PriceData | null>(null);
  useEffect(() => {
    if (!appId) return;
    fetch(`${API_BASE}/steam-game/${appId}/price`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => json?.prices ? setPrices(json.prices) : null)
      .catch(() => {});
  }, [appId]);

  // ── 뉴스 API ──────────────────────────────────────────────
  const [news, setNews]               = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  useEffect(() => {
    if (!appId) return;
    fetch(`${API_BASE}/steam-game/${appId}/news`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.data) setNews(json.data.slice(0, 2)); })
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, [appId]);

  // ── 로딩 중 ──────────────────────────────────────────────
  if (gameLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#c084fc] border-t-transparent" />
      </div>
    );
  }

  // ── 게임 없음 fallback ────────────────────────────────────
  if (!game) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-white/40">
        <span className="text-3xl">🎮</span>
        <span className="text-sm">게임 정보를 불러올 수 없습니다.</span>
        <Link href="/rankings" className="mt-2 text-xs text-[#c084fc] underline">랭킹으로 돌아가기</Link>
      </div>
    );
  }

  // 가격 — API 우선, 없으면 더미
  const krwPrice = prices?.KRW ?? game.priceKRW ?? 0;
  const usdPrice = prices?.USD ?? parseFloat((game.prices?.us ?? '0').replace('$', '').replace('Free', '0'));
  const jpyPrice = prices?.JPY ?? parseFloat((game.prices?.jp ?? '0').replace('¥', '').replace(',', '').replace('무료', '0'));

  // 환율 환산
  const usdKrw = Math.round(usdPrice * rates.usd);
  const jpyKrw = Math.round(jpyPrice * rates.jpy);

  const formatPrice = (currency: string, val: number) => {
    if (val === 0) return '무료';
    if (currency === 'KRW') return `₩${val.toLocaleString()}`;
    if (currency === 'USD') return `$${val.toFixed(2)}`;
    if (currency === 'JPY') return `¥${val.toLocaleString()}`;
    return `${val}`;
  };

  const tabs = [
    { key: 'intro',   label: '게임 소개' },
    { key: 'review',  label: '리뷰 요약' },
    { key: 'timing',  label: '구매 타이밍' },
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.38fr_0.88fr]">
      <div className="space-y-6">
        <section className="panel overflow-hidden p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between text-xs text-white/50">
            <span>상세 분석 · Steam game detail</span>
            <span>{(game.genre ?? []).join(' · ')}</span>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.78fr] lg:items-stretch">
            {/* 왼쪽 컬럼 */}
            <div className="flex flex-col gap-3">
              <img
                src={(game as any).headerImage ?? (game as any).header_image_url ?? getSteamHeader(appId)}
                alt={game.title}
                className="h-[260px] w-full rounded-[22px] object-cover shadow-neon"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getSteamHeader(appId); }}
              />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl border border-white/10 bg-[#2a124d]" />)}
              </div>

              {/* ── 탭 ── */}
              <div className="panel-soft flex flex-1 flex-col p-4" style={{ minHeight: 0 }}>
                <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`text-sm transition ${activeTab === tab.key ? 'font-semibold text-white' : 'text-white/50 hover:text-white/80'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'intro' && (
                    <>
                      <p className="text-sm leading-6 text-white/72">{game.summary ?? '게임 소개 정보가 없습니다.'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(game.tags ?? []).map((tag) => <span key={tag} className="pill">#{tag}</span>)}
                      </div>
                    </>
                  )}
                  {activeTab === 'review' && <TabReview gameId={appId} />}
                  {activeTab === 'timing' && <TabPrediction gameId={appId} />}
                </div>
              </div>
            </div>

            {/* 오른쪽 컬럼 */}
            <div className="flex flex-col gap-4">
              {/* 할인/가격/버튼 */}
              <div className="rounded-[24px] border border-line/60 bg-[#241047] p-5 shadow-glow">
                <div className="text-emerald-400 text-3xl font-bold">
                  {(game.discountRate ?? 0) > 0 ? `-${game.discountRate}%` : '정가'}
                </div>
                <div className="mt-1 text-2xl font-bold text-mint">
                  {formatPrice('KRW', krwPrice)}
                </div>
                {(game.discountRate ?? 0) > 0 && game.originalKRW > 0 && (
                  <div className="mt-1 text-sm text-white/35 line-through">
                    ₩{game.originalKRW.toLocaleString()}
                  </div>
                )}
                <div className="mt-2 text-sm text-white/70">
                  {game.reviewLabel ?? '정보 없음'} · {game.score ?? 0}점
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={getSteamStoreUrl(appId)} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-[#55d58a] px-4 py-3 text-center text-sm font-semibold text-black">지금 구매</a>
                  <Link href={`/predict/${appId}`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">할인 예측</Link>
                </div>
                <div className="mt-4 space-y-2 text-xs text-white/55">
                  <div>플랫폼: {(game.platforms ?? []).join(', ') || '정보 없음'}</div>
                  <div>평균 플레이타임: {game.playtime ?? '정보 없음'}</div>
                  <div>스트리밍 지표: {game.streamStatus ?? '-'}</div>
                </div>
              </div>

              {/* 환율 */}
              <div className="panel-soft p-4">
                <div className="mb-1 text-sm font-semibold">환율</div>
                {rates.loading
                  ? <div className="text-xs text-white/40">환율 로딩 중...</div>
                  : <div className="mb-1 text-[10px] text-white/30">기준: {rates.updatedAt}</div>
                }
                <div className="space-y-2 text-sm text-white/65">
                  <div className="flex justify-between">
                    <span>한화</span>
                    <span className="font-semibold text-mint">{formatPrice('KRW', krwPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>엔화</span>
                    <span>{formatPrice('JPY', jpyPrice)} <span className="text-xs text-white/35">(≈₩{jpyKrw.toLocaleString()})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>달러</span>
                    <span>{formatPrice('USD', usdPrice)} <span className="text-xs text-white/35">(≈₩{usdKrw.toLocaleString()})</span></span>
                  </div>
                </div>
              </div>

              {/* 게임 사도 되는 이유 */}
              <div className="panel-soft flex flex-1 flex-col p-4">
                <div className="mb-4 text-sm font-semibold">게임 사도 되는 이유?</div>
                {(game.reason ?? []).length > 0 ? (
                  <div className="flex flex-1 flex-col justify-around">
                    {(game.reason ?? []).map((item, idx) => (
                      <div key={item}>
                        <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                          <span>{item}</span><span>{90 - idx * 10}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div className="h-2 rounded-full bg-gradient-to-r from-[#64ffc8] to-[#ff70ea]" style={{ width: `${90 - idx * 10}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-white/30">추후 업데이트 예정</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="panel p-5 md:p-6">
            <div className="mb-4 section-title">추천 이유 요약</div>
            <div className="rounded-2xl border border-emerald-400/20 bg-[#2f4879] p-4 text-sm text-white/80">
              지금 사도 무난한 편입니다. 최근 업데이트와 높은 사용자 평가, 긴 플레이타임 덕분에 할인 폭이 크지 않아도 만족도가 높습니다.
            </div>
          </div>
          <div className="panel p-5 md:p-6">
            <div className="mb-4 section-title">할인 비교 후 추천</div>
            <div className="space-y-2 text-sm text-white/65">
              <div className="flex justify-between">
                <span>한화</span>
                <span className="font-semibold text-mint">{formatPrice('KRW', krwPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>일본</span>
                <span>{formatPrice('JPY', jpyPrice)} <span className="text-xs text-white/35">(≈₩{jpyKrw.toLocaleString()})</span></span>
              </div>
              <div className="flex justify-between">
                <span>미국</span>
                <span>{formatPrice('USD', usdPrice)} <span className="text-xs text-white/35">(≈₩{usdKrw.toLocaleString()})</span></span>
              </div>
            </div>
            {!rates.loading && (
              <div className="mt-2 text-[10px] text-white/30">환율 기준: {rates.updatedAt}</div>
            )}
            <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-2.5 text-xs text-emerald-300">
              💡 {
                Math.min(krwPrice, usdKrw, jpyKrw) === krwPrice ? '한국' :
                Math.min(krwPrice, usdKrw, jpyKrw) === usdKrw  ? '미국' : '일본'
              } 구매가 가장 저렴해요.
            </div>
          </div>
        </section>

        {/* 게임 소식 */}
        <section className="panel p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="section-title">게임 소식</div>
            <a
              href={`https://store.steampowered.com/news/app/${appId}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-white/45 hover:text-white/70 transition"
            >
              more →
            </a>
          </div>
          {newsLoading ? (
            <LoadingSpinner />
          ) : news.length > 0 ? (
            <div className="space-y-4">
              {news.map((item, idx) => (
                <a
                  key={item.gid}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid gap-4 rounded-2xl border border-white/6 bg-white/[0.03] p-3 transition hover:border-white/15 md:grid-cols-[180px_1fr]"
                >
                  <div className={`h-[96px] rounded-xl ${idx % 2 === 0 ? 'bg-[#5a3f2d]' : 'bg-[#7b6a4a]'}`} />
                  <div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>{item.feedlabel}</span>
                      <span>·</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                    <div className="mt-1 text-base font-semibold">{item.title}</div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/65">
                      {stripHtml(item.contents)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/35">게임 소식이 없습니다.</div>
          )}
        </section>

        {/* 바로가기 */}
        <section className="panel p-5">
          <div className="mb-4 section-title">바로가기</div>
          <div className="space-y-3 text-sm text-white/70">
            <Link href={`/predict/${appId}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1d0d39] px-4 py-3 hover:border-[#c084fc]/50 transition">할인예측 페이지 <ExternalLink className="h-4 w-4" /></Link>
            <Link href="/rankings" className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1d0d39] px-4 py-3 hover:border-[#c084fc]/50 transition">게임 순위 페이지 <ExternalLink className="h-4 w-4" /></Link>
            <Link href="/recommend" className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1d0d39] px-4 py-3 hover:border-[#c084fc]/50 transition">추천 결과 페이지 <ExternalLink className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="section-title">비슷한 게임 추천</div>
            <span className="text-xs text-white/50">태그 기반</span>
          </div>
          <div className="space-y-4">
            {related.map((item) => <GameCard key={item.steamAppId} game={item} compact />)}
          </div>
        </section>

        {/* 통계 요약 */}
        <section className="panel p-5">
          <div className="mb-4 section-title">통계 요약</div>
          <div className="space-y-4">
            {statPanels.map((panel) => (
              <div key={panel.title} className="rounded-2xl border border-white/8 bg-[#241141] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">{panel.title}</h3>
                  <button
                    onClick={() => setExpandedStat(expandedStat === panel.title ? null : panel.title)}
                    className="text-xs text-white/45 hover:text-white/70 transition"
                  >
                    {expandedStat === panel.title ? '접기 ▲' : '더보기 ▼'}
                  </button>
                </div>
                <div className="mb-3 h-14 rounded-lg bg-[#1a0d2f] p-2">
                  <div className="flex h-full items-end gap-2">
                    {panel.bars.map((bar, i) => (
                      <div key={i} className={`flex-1 rounded-t-md bg-gradient-to-t ${accentClass[panel.accent]}`} style={{ height: `${bar}%` }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{panel.leftLabel}</span>
                  <span>{panel.rightLabel}</span>
                </div>
                {expandedStat === panel.title && (
                  <div className="mt-3 rounded-xl border border-white/8 bg-white/4 p-3 text-xs text-white/55 leading-5">
                    {panel.title} 관련 상세 데이터입니다. 추후 실데이터 연결 시 업데이트됩니다.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
