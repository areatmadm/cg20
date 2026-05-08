import { AppShell } from '@/components/app-shell';
import ActivePageClient from '@/components/active-page-client';
import { DetailPage } from '@/components/detail-page';
import { HomePage } from '@/components/home-page';
import InsightPageClient from '@/components/insight-page-client';
import { PredictPage } from '@/components/predict-page';
import { RankingBoard } from '@/components/ranking-board';
import { RecommendPageClient } from '@/components/recommend-page-client';
import { SearchPageClient } from '@/components/search-page-client';
import { RouterProvider, matchPath, useRouterContext } from '@/compat/router';
import { games } from '@/lib/data';

function RoutedPage() {
  const { pathname } = useRouterContext();

  // ── /games/:id — 더미데이터 먼저, 없으면 API id만으로 렌더 ──
  const gameParams = matchPath('/games/:id', pathname);
  if (gameParams) {
    const rawId = gameParams.id;
    const numId = Number(rawId);

    // 더미데이터에 있으면 기존 방식 유지 (related 포함)
    const dummyGame = games.find(
      (g) => g.steamAppId === numId || String(g.steamAppId) === rawId
    );

    if (dummyGame) {
      const related = games
        .filter((item) => item.steamAppId !== dummyGame.steamAppId)
        .slice(0, 3);
      return <AppShell><DetailPage game={dummyGame} related={related} /></AppShell>;
    }

    // 더미에 없으면 steamAppId만 넘겨서 DetailPage가 API로 직접 로드
    return <AppShell><DetailPage steamAppId={numId} related={[]} /></AppShell>;
  }

  // ── /predict/:id ──────────────────────────────────────────
  const predictParams = matchPath('/predict/:id', pathname);
  if (predictParams) {
    const numId = Number(predictParams.id);
    const game = games.find((g) => g.steamAppId === numId)
      ?? { steamAppId: numId, title: `Game #${numId}`, slug: '', genre: [], tags: [],
           platforms: [], score: 0, discountRate: 0, prices: { kr: '-', us: '-', jp: '-' },
           priceKRW: 0, originalKRW: 0, reviewLabel: '', reason: [], playtime: '0',
           updateStatus: '', streamStatus: '', predictedSale: [], similar: [], news: [],
           summary: '' };
    return <AppShell><PredictPage game={game} /></AppShell>;
  }

  switch (pathname) {
    case '/':         return <AppShell><HomePage /></AppShell>;
    case '/active':   return <AppShell><ActivePageClient /></AppShell>;
    case '/rankings': return <AppShell><RankingBoard /></AppShell>;
    case '/recommend':return <AppShell><RecommendPageClient /></AppShell>;
    case '/insight':  return <AppShell><InsightPageClient /></AppShell>;
    case '/search':   return <AppShell><SearchPageClient /></AppShell>;
    default:          return <AppShell><HomePage /></AppShell>;
  }
}

export default function App() {
  return <RouterProvider><RoutedPage /></RouterProvider>;
}
