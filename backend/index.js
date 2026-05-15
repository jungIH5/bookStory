const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// ─── DB ───────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── JWE (jose v4, dir + A256GCM) ────────────────────────────────────────────
let _jose;
async function getJose() {
  if (!_jose) _jose = await import('jose');
  return _jose;
}

function getSecret() {
  const s = process.env.JWT_SECRET || 'bookstory-default-secret-change-me!!';
  const buf = Buffer.alloc(32);
  Buffer.from(s).copy(buf);
  return buf;
}

async function createToken(payload) {
  const { EncryptJWT } = await getJose();
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .encrypt(getSecret());
}

async function verifyToken(token) {
  try {
    const { jwtDecrypt } = await getJose();
    const { payload } = await jwtDecrypt(token, getSecret(), { clockTolerance: 15 });
    return payload;
  } catch {
    return null;
  }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  const payload = await verifyToken(auth.slice(7));
  if (!payload?.userId) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
  req.userId = Number(payload.userId);
  next();
}

// ─── CORS whitelist ───────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
].join(',')).split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // 모바일 앱 네이티브 요청은 origin이 없음 → 허용
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked'));
  },
  credentials: true,
}));

// ─── 보안 헤더 ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 브루트포스 방어: 회원가입 IP당 1시간 10회
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '회원가입 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.' },
});

// AI 엔드포인트 보호: IP당 1시간 30회
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI 분석 요청이 너무 많습니다.' },
});

app.use(globalLimiter);

// ─── Input validation whitelist ───────────────────────────────────────────────
const isValidName = (s) => typeof s === 'string' && /^[가-힣a-zA-Z\s]{1,50}$/.test(s.trim());
const isValidAge = (n) => {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 120;
};
const isValidText = (s, max = 500) =>
  typeof s === 'string' && s.trim().length > 0 && s.length <= max;

// ─── DB 초기화 ────────────────────────────────────────────────────────────────
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS read_books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        image TEXT,
        publisher TEXT,
        isbn TEXT,
        pages INTEGER DEFAULT 250,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        gender VARCHAR(10),
        age INT,
        location VARCHAR(200),
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        description TEXT,
        category VARCHAR(50),
        location VARCHAR(200),
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        member_count INT DEFAULT 1,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { rows: existingClubs } = await pool.query('SELECT count(*) FROM clubs');
    if (parseInt(existingClubs[0].count) < 5) {
      await pool.query(`
        INSERT INTO clubs (name, description, category, location, lat, lng, member_count, image) VALUES
        ('합정 독서 기록단','합정역 근처 조용한 카페에서 함께 책 읽고 기록하는 모임입니다.','독서/기록','합정동',37.5494,126.9133,12,'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800'),
        ('잠실 소설 클럽','잠실 롯데월드몰 근처에서 최신 소설을 분석하고 토론합니다.','소설/토론','잠실동',37.5133,127.1001,8,'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800'),
        ('홍대 디자인 인사이트','예술과 디자인 서적을 읽으며 영감을 나누는 합정-홍대 라인 모임.','예술/디자인','서교동',37.5567,126.9236,15,'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800'),
        ('송파 수필의 밤','잠실/송파 직장인들이 모여 하루 한 구절 공유하는 밤 모임.','에세이','송파동',37.5101,127.1128,6,'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800'),
        ('강남 비즈니스 독서회','성장을 꿈꾸는 직장인들의 경제경영서 요약 모임.','비즈니스','역삼동',37.5006,127.0360,24,'https://images.unsplash.com/photo-1552250575-e508473b090f?q=80&w=800')
      `);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(300) NOT NULL,
        content TEXT NOT NULL,
        book_title VARCHAR(300),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        user_id INTEGER NOT NULL,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, post_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_members (
        id SERIAL PRIMARY KEY,
        club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(club_id, user_id)
      )
    `);
    console.log('Database tables initialized!');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};
initDb();

// ─── API endpoints ────────────────────────────────────────────────────────────
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 회원가입 — JWE 토큰 발급 + 브루트포스 방어
app.post('/api/users', registerLimiter, async (req, res) => {
  const { name, gender, age, location, lat, lng } = req.body;
  if (!isValidName(name)) return res.status(400).json({ error: '이름은 한글/영문 1~50자입니다.' });
  if (!isValidAge(age)) return res.status(400).json({ error: '나이는 1~120 사이여야 합니다.' });
  if (!isValidText(location, 200)) return res.status(400).json({ error: '활동 지역을 입력해주세요.' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, gender, age, location, lat, lng) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name.trim(), gender || '기타', Number(age), location.trim(), lat || null, lng || null]
    );
    const user = rows[0];
    const token = await createToken({ userId: user.id, name: user.name });
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 토큰 갱신 (앱 재시작 시 기존 userId로 재발급)
app.post('/api/auth/token', registerLimiter, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    const token = await createToken({ userId: rows[0].id, name: rows[0].name });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 책 검색 (공개)
app.get('/api/books/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Query parameter is required' });
  try {
    const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=10`;
    const response = await fetch(url, {
      headers: { 'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// 책 AI 분석 (인증 + AI rate limit)
app.get('/api/books/analyze', requireAuth, aiLimiter, async (req, res) => {
  const { title, author } = req.query;
  if (!title) return res.status(400).json({ error: 'Book title is required' });
  try {
    const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(title + ' ' + (author || '') + ' 서평 후기')}&display=5`;
    const blogResponse = await fetch(blogUrl, {
      headers: { 'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET }
    });
    const blogData = await blogResponse.json();
    const reviews = blogData.items?.map(item => `- ${item.title}: ${item.description}`).join('\n') || '서평 없음';

    const prompt = `당신은 독서 토론 전문가입니다.\n\n책: ${title} (${author || '작자미상'})\n\n블로그 서평:\n${reviews}\n\n아래 JSON으로만 응답하세요.\n\n{"analysis":"핵심 의미 3~4문장","pages":예상페이지수,"thematic_questions":["질문1","질문2","질문3"],"shift_questions":[{"perspective":"관점","question":"질문"},{"perspective":"관점","question":"질문"}]}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    let text = message.content[0].text.trim();
    if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(text);
    res.json({
      analysis: parsed.analysis || '',
      pages: parsed.pages || 250,
      questions: { thematic: parsed.thematic_questions || [], perspective_shift: parsed.shift_questions || [] }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze book' });
  }
});

// 읽은 책 등록 (인증 필요)
app.post('/api/books/read', requireAuth, async (req, res) => {
  const { title, author, image, publisher, isbn, pages } = req.body;
  if (!isValidText(title, 300)) return res.status(400).json({ error: 'Title is required' });
  try {
    const result = await pool.query(
      'INSERT INTO read_books (title, author, image, publisher, isbn, pages) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title.replace(/<\/?[^>]+(>|$)/g, ''), author, image, publisher, isbn, pages || 250]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save book' });
  }
});

// 읽은 책 조회 (공개)
app.get('/api/books/read', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM read_books ORDER BY read_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch read books' });
  }
});

// 모임 조회 (공개)
app.get('/api/clubs', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clubs ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 모임 생성 (인증 필요)
app.post('/api/clubs', requireAuth, async (req, res) => {
  const { name, description, category, location, lat, lng, image } = req.body;
  if (!isValidText(name, 200)) return res.status(400).json({ error: '모임 이름을 입력해주세요.' });
  if (!isValidText(location, 200)) return res.status(400).json({ error: '위치를 입력해주세요.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO clubs (name, description, category, location, lat, lng, image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name.trim(), description || '', category || '기타', location.trim(), lat || null, lng || null, image || '']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 내 참여 모임 (인증 필요)
app.get('/api/clubs/joined', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT club_id FROM club_members WHERE user_id = $1', [req.userId]
    );
    res.json(rows.map(r => r.club_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 모임 가입 (인증 필요)
app.post('/api/clubs/:id/join', requireAuth, async (req, res) => {
  const clubId = parseInt(req.params.id);
  if (!clubId) return res.status(400).json({ error: '잘못된 요청입니다.' });
  try {
    const { rowCount } = await pool.query(
      'INSERT INTO club_members (club_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [clubId, req.userId]
    );
    if (rowCount > 0) {
      await pool.query('UPDATE clubs SET member_count = member_count + 1 WHERE id = $1', [clubId]);
    }
    res.json({ joined: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 모임 탈퇴 (인증 필요)
app.delete('/api/clubs/:id/leave', requireAuth, async (req, res) => {
  const clubId = parseInt(req.params.id);
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [clubId, req.userId]
    );
    if (rowCount > 0) {
      await pool.query('UPDATE clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [clubId]);
    }
    res.json({ left: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 커뮤니티 게시글 (공개 조회)
app.get('/api/community/posts', async (req, res) => {
  const userId = parseInt(req.query.user_id) || 0;
  try {
    const { rows } = await pool.query(`
      SELECT p.*, COALESCE(u.name, '익명') AS author_name,
        COUNT(DISTINCT pl.user_id)::int AS like_count,
        COUNT(DISTINCT c.id)::int AS comment_count,
        EXISTS(SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS liked_by_user
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN post_likes pl ON pl.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      GROUP BY p.id, u.name ORDER BY p.created_at DESC
    `, [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 게시글 작성 (인증 필요)
app.post('/api/community/posts', requireAuth, async (req, res) => {
  const { title, content, book_title } = req.body;
  if (!isValidText(title, 300)) return res.status(400).json({ error: '제목을 입력해주세요.' });
  if (!isValidText(content, 5000)) return res.status(400).json({ error: '내용을 입력해주세요.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO posts (user_id, title, content, book_title) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, title.trim(), content.trim(), book_title?.trim() || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 좋아요 토글 (인증 필요)
app.post('/api/community/posts/:id/like', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.id);
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.userId, postId]
    );
    if (rows.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.userId, postId]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [req.userId, postId]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Backend server running on http://localhost:${port}`));
