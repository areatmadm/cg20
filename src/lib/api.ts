if (!import.meta.env.VITE_API_BASE) {
  throw new Error('VITE_API_BASE 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

export const API_BASE: string = import.meta.env.VITE_API_BASE;
