'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from '@/compat/next-navigation'; // 💡 Vite 환경 호환을 위해 경로 수정
import { API_BASE } from '@/lib/api';
import { GameCard } from './game-card';
import { Game } from '@/lib/data'; // 타입만 가져오기

export function SearchPageClient() {
  const params = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [genre, setGenre] = useState('전체');
  
  // API 결과를 담을 상태
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  // URL 파라미터에서 초기 검색어 세팅
  useEffect(() => {
    setKeyword(params.get('q') ?? '');
    setGenre(params.get('genre') ?? '전체');
  }, [params]);

  // 검색어 또는 장르가 바뀔 때마다 API 호출
  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (keyword.trim()) queryParams.append('q', keyword.trim());
        if (genre !== '전체') queryParams.append('genre', genre);

        const url = `${API_BASE}/search?${queryParams.toString()}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('검색 API 호출 실패');
        
        const json = await response.json();
        
        // 💡 핵심: 백엔드 데이터를 프론트엔드 Game 타입에 맞춰서 변환(Mapping)
        const mappedResults = (json.data ?? []).map((item: any) => ({
          steamAppId: item.gameId,     // API의 gameId를 steamAppId로 연결
          title: item.name,            // API의 name을 title로 연결
          slug: String(item.gameId),
          genre: item.genres ?? [],    // API의 genres를 genre로 연결
          tags: [],                    // 검색 API엔 태그가 없으므로 빈 배열
          score: 0,
          discountRate: 0,
          priceKRW: item.price,
          // GameCard가 에러를 뿜지 않도록 prices 객체를 강제로 만들어줌
          prices: { 
            kr: item.isFree ? '무료' : `₩${item.price.toLocaleString()}`, 
            us: '-', 
            jp: '-' 
          },
          description: '',
          platform: [],
          playtime: 0
        }));

        setResults(mappedResults); // 변환된 데이터를 상태에 저장!

      } catch (error) {
        console.error('검색 중 오류 발생:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // 사용자가 타이핑 중일 때 API가 계속 호출되는 것을 방지 (디바운스 300ms)
    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, genre]);

  return (
    <section className="space-y-6">
      <div className="panel p-5 md:p-6">
        <div className="mb-4 section-title">검색 {keyword ? `· ${keyword}` : ''}</div>
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <input 
            value={keyword} 
            onChange={(e) => setKeyword(e.target.value)} 
            placeholder="게임명, 태그, 장르 검색" 
            className="h-12 rounded-xl border border-white/10 bg-[#1a1033] px-4 text-sm outline-none ring-0 placeholder:text-white/30" 
          />
          <select 
            value={genre} 
            onChange={(e) => setGenre(e.target.value)} 
            className="h-12 rounded-xl border border-white/10 bg-[#1a1033] px-4 text-sm outline-none"
          >
            {['전체', '시뮬레이션', '농장', '액션', '액션 RPG', '스포츠', 'PvPvE'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 결과 영역 */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c084fc] border-t-transparent" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {results.map((game) => <GameCard key={game.steamAppId || game.slug} game={game} />)}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-white/40">
          검색 결과가 없습니다.
        </div>
      )}
    </section>
  );
}