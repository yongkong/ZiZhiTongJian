export interface Volume {
  num: number
  title: string
  era: string
  era_group: string
  range_text: string
  status: string
}

export interface Segment {
  t?: string
  n?: string
}

export interface OrigPara {
  seq: number
  kind: string
  segments: Segment[]
  plain: string
  tj_year: number | null
}

export interface BoyPara {
  seq: number
  kind: string
  text: string
  by_year: number | null
  file?: string | null
}

export interface Stats {
  vols: number
  done: number
  lessonsDone: number
  lessonsAll: number
  due: number
  streak: number
  nextLesson: string
}

export interface LessonSummary {
  slug: string
  seq: number
  title: string
  subtitle: string
  focus: string
  status: string
  best_score: number | null
}

export interface QuizItem {
  q: string
  options: string[]
  answer: number
  explain: string
}

export interface PassageRef {
  title: string
  orig: { volume: number; seqs: number[] }
  boy: { section: number; seqs: number[] }
}

export interface Highlight {
  pattern: string
  note: string
}

export interface LessonContent {
  keyPoints?: string[]
  intro: string[]
  blocks: Array<
    | { type: 'narration'; title: string; text: string }
    | ({ type: 'passage' } & PassageRef)
    | { type: 'insight'; title: string; items?: string[]; groups?: Array<{ tag: string; title: string; text: string }> }
  >
  quiz: QuizItem[]
  resources: Array<{ title: string; url: string }>
}

export interface ReviewCard {
  id: number
  front: string
  back: string
  due: string
  reps: number
  interval_days: number
}

export interface AuthUser {
  id: number
  name: string
}

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!r.ok) {
    let msg = String(r.status)
    try { msg = (await r.json()).error ?? msg } catch { /* 保留状态码 */ }
    throw new Error(msg)
  }
  return r.json()
}

export const api = {
  register: (name: string, password: string) =>
    j<AuthUser>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, password }) }),
  login: (name: string, password: string) =>
    j<AuthUser>('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) }),
  logout: () => j<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => j<{ user: AuthUser | null }>('/api/auth/me'),
  stats: () => j<Stats>('/api/stats'),
  volumes: () => j<Volume[]>('/api/volumes'),
  volume: (num: number) =>
    j<{ volume: Volume; paragraphs: OrigPara[] }>(`/api/volumes/${num}`),
  markReading: (num: number, status: string) =>
    j<{ ok: boolean }>(`/api/reading/${num}`, { method: 'POST', body: JSON.stringify({ status }) }),
  boyangBooks: () => j<Array<{ id: number; title: string; box: string }>>('/api/boyang/books'),
  boyangBook: (id: number) =>
    j<{ book: { id: number; title: string; box: string }; sections: Array<{ id: number; kind: string; title: string; y0: number | null; y1: number | null }> }>(`/api/boyang/books/${id}`),
  boyangSection: (id: number) =>
    j<{ section: { id: number; title: string; book_id: number }; paragraphs: BoyPara[]; highlights: Highlight[] }>(`/api/boyang/sections/${id}`),
  boyangByYear: (year: number) =>
    j<Array<{ id: number; title: string; book_title: string }>>(`/api/boyang/by-year/${year}`),
  lessons: () => j<LessonSummary[]>('/api/lessons'),
  lesson: (slug: string) =>
    j<{ slug: string; title: string; subtitle: string; focus: string; content: LessonContent; state: { status: string; best_score: number } | null }>(`/api/lessons/${slug}`),
  passage: (body: PassageRef) =>
    j<{ orig: Array<OrigPara & { segments: Segment[] }>; boy: BoyPara[]; highlights: Highlight[]; origHighlights: Highlight[] }>('/api/passage', {
      method: 'POST',
      body: JSON.stringify({ volume: body.orig.volume, seqs: body.orig.seqs, section: body.boy.section, bseqs: body.boy.seqs }),
    }),
  completeLesson: (slug: string, score: number) =>
    j<{ ok: boolean }>(`/api/lessons/${slug}/complete`, { method: 'POST', body: JSON.stringify({ score }) }),
  reviewQueue: () => j<ReviewCard[]>('/api/review/queue'),
  reviewAnswer: (cardId: number, grade: 0 | 1 | 2) =>
    j<{ ok: boolean; next_due: string; interval_days: number }>('/api/review/answer', {
      method: 'POST',
      body: JSON.stringify({ cardId, grade }),
    }),
}

export function fmtYear(y: number): string {
  return y < 0 ? `前 ${-y}` : `${y}`
}
