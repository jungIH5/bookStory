const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// Initialize Database Table
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
    
    // 3. User Table
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

    // 4. Clubs Table
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

    // Seed Dummy Clubs if empty or few
    const { rows: existingClubs } = await pool.query('SELECT count(*) FROM clubs');
    const clubCount = parseInt(existingClubs[0].count);
    
    if (clubCount < 5) {
      await pool.query(`
        INSERT INTO clubs (name, description, category, location, lat, lng, member_count, image)
        VALUES 
        ('합정 독서 기록단', '합정역 근처 조용한 카페에서 함께 책 읽고 기록하는 모임입니다.', '독서/기록', '합정동', 37.5494, 126.9133, 12, 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800'),
        ('잠실 소설 클럽', '잠실 롯데월드몰 근처에서 최신 소설을 분석하고 토론합니다.', '소설/토론', '잠실동', 37.5133, 127.1001, 8, 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800'),
        ('홍대 디자인 인사이트', '예술과 디자인 서적을 읽으며 영감을 나누는 합정-홍대 라인 모임.', '예술/디자인', '서교동', 37.5567, 126.9236, 15, 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800'),
        ('송파 수필의 밤', '잠실/송파 직장인들이 모여 하루 한 구절 공유하는 밤 모임.', '에세이', '송파동', 37.5101, 127.1128, 6, 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800'),
        ('강남 비즈니스 독서회', '성장을 꿈꾸는 직장인들의 경제경영서 요약 모임.', '비즈니스', '역삼동', 37.5006, 127.0360, 24, 'https://images.unsplash.com/photo-1552250575-e508473b090f?q=80&w=800'),
        ('성수 숲속 독서', '성수동 카페거리에서 커피와 함께하는 주말 독서 시간.', '독서/인문', '성수동', 37.5445, 127.0560, 10, 'https://images.unsplash.com/photo-1481627526605-594220f7f2fb?q=80&w=800'),
        ('망원 문학 산책', '동네 카페를 돌며 고전 문학의 의미를 찾는 모임.', '소설/인문', '망원동', 37.5559, 126.9015, 7, 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=800'),
        ('신촌 철학 브런치', '어려운 철학 책을 쉽게 풀어보는 브런치 타임.', '인문/철학', '대현동', 37.5591, 126.9432, 5, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=800'),
        ('연남동 기록자들', '자신의 일상을 책으로 엮어보는 독립출판 준비 모임.', '독서/기록', '연남동', 37.5612, 126.9248, 11, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'),
        ('성신 경제 스터디', '최신 경제 트렌드 뉴스를 책으로 깊게 파봅니다.', '비즈니스', '동선동', 37.5926, 127.0164, 9, 'https://images.unsplash.com/photo-1611974717537-48843914e1fd?q=80&w=800'),
        ('마포 만화 애호가', '서사가 있는 만화와 그래픽 노블을 공유합니다.', '취미/만화', '마포동', 37.5393, 126.9452, 18, 'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?q=80&w=800'),
        ('종로 역사 탐방', '역사서를 읽고 실제 유적지를 가보는 현장형 모임.', '인문/역사', '종로1가', 37.5714, 126.9788, 13, 'https://images.unsplash.com/photo-1548013146-72479768bbaa?q=80&w=800'),
        ('서울숲 에세이 쓰기', '감성을 담은 짧은 글을 매주 한 편씩 완성합니다.', '기록/에세이', '성수동1가', 37.5431, 127.0448, 4, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'),
        ('광화문 독토회', '시사 전문 서적을 읽고 열띤 토론을 벌입니다.', '사회/문화', '광화문', 37.5759, 126.9768, 20, 'https://images.unsplash.com/photo-1517245385169-46b8b23f0385?q=80&w=800'),
        ('이태원 글로벌 낭독', '원서 읽기를 통해 언어와 문화를 동시에 배웁니다.', '외국어/문학', '이태원동', 37.5345, 126.9942, 12, 'https://images.unsplash.com/photo-1523050335456-cbbefe286207?q=80&w=800'),
        ('여의도 금융 독서', '금융 시장의 원리를 책을 통해 마스터합니다.', '경제/경영', '여의도동', 37.5216, 126.9242, 16, 'https://images.unsplash.com/photo-1591696208162-a9775fb4465d?q=80&w=800'),
        ('혜화 예술가의 눈', '미술사와 예술론을 연구하는 심도 있는 안목 모임.', '예술/학술', '명륜동', 37.5818, 127.0019, 8, 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800'),
        ('건대 판타지 정복', '판타지 소설과 장르 문학을 사랑하는 사람들의 모임.', '장르/소설', '화양동', 37.5425, 127.0709, 22, 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800'),
        ('남산 시(詩) 산책', '계절마다 변하는 위대한 시구들을 함께 읽습니다.', '문학/시', '예장동', 37.5538, 126.9912, 6, 'https://images.unsplash.com/photo-1502134249126-5fcd058c3d0d?q=80&w=800'),
        ('용산 데이터 사이언스', 'IT 기술 서적과 데이터 분석법을 함께 공부합니다.', '자기계발/IT', '한강로동', 37.5299, 126.9648, 14, 'https://images.unsplash.com/photo-1551288049-bbbda536ad37?q=80&w=800')
      `);
      console.log('Dummy clubs seeded!');
    }

    // Posts (커뮤니티 게시글)
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

    // Post Likes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        user_id INTEGER NOT NULL,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, post_id)
      )
    `);

    // Comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Club Members
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

// --- API Endpoints ---

// Get all clubs
app.get('/api/clubs', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clubs ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create club
app.post('/api/clubs', async (req, res) => {
  const { name, description, category, location, lat, lng, image } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO clubs (name, description, category, location, lat, lng, image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, category, location, lat, lng, image || '']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Registration
app.post('/api/users', async (req, res) => {
  const { name, gender, age, location, lat, lng } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, gender, age, location, lat, lng) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, gender, age, location, lat, lng]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Credentials
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Naver Book Search Proxy
app.get('/api/books/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Query parameter is required' });

  try {
    const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=10`;
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Naver Search Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Book Analysis with Claude and Naver Blog
app.get('/api/books/analyze', async (req, res) => {
  const { title, author } = req.query;
  if (!title) return res.status(400).json({ error: 'Book title is required' });

  try {
    // 1. Search for blog reviews on Naver
    const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(title + ' ' + (author || '') + ' 서평 후기')}&display=5`;
    const blogResponse = await fetch(blogUrl, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });
    const blogData = await blogResponse.json();
    const reviews = blogData.items?.map(item => `- ${item.title}: ${item.description}`).join('\n') || '서평 정보를 찾을 수 없습니다.';

    // 2. Analyze with Claude
    const prompt = `당신은 독서 토론 전문가입니다.

책: ${title} (${author || '작자미상'})

블로그 서평 자료:
${reviews}

위 정보를 바탕으로 아래 JSON 형식으로 정확히 응답해주세요. JSON 외에 다른 텍스트는 포함하지 마세요.

{
  "analysis": "이 책이 독자에게 주는 핵심 의미, 가치, 주제 의식을 3~4문장으로 깊이 있게 분석",
  "pages": 예상 페이지 수 숫자 (정보 없으면 250),
  "thematic_questions": [
    "책의 핵심 개념이나 철학적 논점을 탐구하는 토론 질문",
    "저자의 관점이나 의도에 대해 묻는 질문",
    "독자 자신의 경험과 삶을 이 책과 연결하는 질문"
  ],
  "shift_questions": [
    {"perspective": "적용한 관점 (예: 경제학적 관점)", "question": "그 관점에서 바라본 예상치 못한 시각의 질문"},
    {"perspective": "또 다른 관점 (예: 역사적 관점)", "question": "그 관점에서 바라본 질문"}
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    let responseText = message.content[0].text.trim();
    // 마크다운 코드블록 감싸진 경우 제거
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(responseText);
    res.json({
      analysis: parsed.analysis || '',
      pages: parsed.pages || 250,
      questions: {
        thematic: parsed.thematic_questions || [],
        perspective_shift: parsed.shift_questions || []
      }
    });
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze book' });
  }
});

// Register read book
app.post('/api/books/read', async (req, res) => {
  console.log('Register book request received:', req.body.title);
  const { title, author, image, publisher, isbn, pages } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'INSERT INTO read_books (title, author, image, publisher, isbn, pages) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title.replace(/<\/?[^>]+(>|$)/g, ""), author, image, publisher, isbn, pages || 250]
    );
    console.log('Book registered successfully:', result.rows[0].title);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save book' });
  }
});

// Get registered books
app.get('/api/books/read', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM read_books ORDER BY read_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch read books' });
  }
});

// Community Posts
app.get('/api/community/posts', async (req, res) => {
  const userId = parseInt(req.query.user_id) || 0;
  try {
    const { rows } = await pool.query(`
      SELECT
        p.*,
        COALESCE(u.name, '익명') AS author,
        COUNT(DISTINCT pl.user_id)::int AS likes,
        COUNT(DISTINCT c.id)::int AS comments,
        EXISTS(SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS liked
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN post_likes pl ON pl.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
    `, [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts', async (req, res) => {
  const { user_id, title, content, book_title } = req.body;
  if (!title || !content) return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO posts (user_id, title, content, book_title) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id || null, title, content, book_title || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts/:id/like', async (req, res) => {
  const { user_id } = req.body;
  const postId = req.params.id;
  if (!user_id) return res.status(400).json({ error: '로그인이 필요합니다.' });
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2',
      [user_id, postId]
    );
    if (rows.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [user_id, postId]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [user_id, postId]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 내가 참여한 모임 ID 목록
app.get('/api/clubs/joined', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.json([]);
  try {
    const { rows } = await pool.query(
      'SELECT club_id FROM club_members WHERE user_id = $1',
      [userId]
    );
    res.json(rows.map(r => r.club_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 모임 참여
app.post('/api/clubs/:id/join', async (req, res) => {
  const { user_id } = req.body;
  const clubId = req.params.id;
  if (!user_id) return res.status(400).json({ error: '로그인이 필요합니다.' });
  try {
    const { rowCount } = await pool.query(
      'INSERT INTO club_members (club_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [clubId, user_id]
    );
    if (rowCount > 0) {
      await pool.query('UPDATE clubs SET member_count = member_count + 1 WHERE id = $1', [clubId]);
    }
    res.json({ joined: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 모임 탈퇴
app.delete('/api/clubs/:id/leave', async (req, res) => {
  const { user_id } = req.body;
  const clubId = req.params.id;
  if (!user_id) return res.status(400).json({ error: '로그인이 필요합니다.' });
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM club_members WHERE club_id = $1 AND user_id = $2',
      [clubId, user_id]
    );
    if (rowCount > 0) {
      await pool.query(
        'UPDATE clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1',
        [clubId]
      );
    }
    res.json({ left: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
