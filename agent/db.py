import asyncpg
import json
import os

_pool: asyncpg.Pool | None = None


async def _set_codecs(conn: asyncpg.Connection):
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )
    await conn.set_type_codec(
        "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=os.getenv("DATABASE_URL"),
        min_size=1,
        max_size=10,
        init=_set_codecs,
    )
    await _init_db()


async def close_pool():
    if _pool:
        await _pool.close()


async def get_db():
    async with _pool.acquire() as conn:
        yield conn


async def _init_db():
    async with _pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100),
                    gender VARCHAR(10),
                    age INT,
                    location VARCHAR(200),
                    lat DOUBLE PRECISION,
                    lng DOUBLE PRECISION,
                    voice_sample VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await conn.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_sample VARCHAR(500)"
            )

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS read_books (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    author TEXT,
                    image TEXT,
                    publisher TEXT,
                    isbn TEXT,
                    pages INTEGER DEFAULT 250,
                    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    impression TEXT DEFAULT '',
                    is_public BOOLEAN DEFAULT TRUE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
                )
            """)
            await conn.execute(
                "ALTER TABLE read_books ADD COLUMN IF NOT EXISTS impression TEXT DEFAULT ''"
            )
            await conn.execute(
                "ALTER TABLE read_books ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE"
            )
            await conn.execute(
                "ALTER TABLE read_books ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
            )
            await conn.execute(
                "ALTER TABLE read_books ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'finished'"
            )
            await conn.execute(
                "ALTER TABLE read_books ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''"
            )

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS clubs (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(200),
                    description TEXT,
                    category VARCHAR(50),
                    location VARCHAR(200),
                    lat DOUBLE PRECISION,
                    lng DOUBLE PRECISION,
                    image TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL
                )
            """)
            await conn.execute(
                "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
            )
            await conn.execute(
                "ALTER TABLE clubs DROP COLUMN IF EXISTS member_count"
            )

            club_count = await conn.fetchval("SELECT COUNT(*) FROM clubs")
            if club_count < 5:
                await conn.execute("""
                    INSERT INTO clubs (name, description, category, location, lat, lng, image) VALUES
                    ('합정 독서 기록단','합정역 근처 조용한 카페에서 함께 책 읽고 기록하는 모임입니다.','독서/기록','합정동',37.5494,126.9133,'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800'),
                    ('잠실 소설 클럽','잠실 롯데월드몰 근처에서 최신 소설을 분석하고 토론합니다.','소설/토론','잠실동',37.5133,127.1001,'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800'),
                    ('홍대 디자인 인사이트','예술과 디자인 서적을 읽으며 영감을 나누는 합정-홍대 라인 모임.','예술/디자인','서교동',37.5567,126.9236,'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800'),
                    ('송파 수필의 밤','잠실/송파 직장인들이 모여 하루 한 구절 공유하는 밤 모임.','에세이','송파동',37.5101,127.1128,'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800'),
                    ('강남 비즈니스 독서회','성장을 꿈꾸는 직장인들의 경제경영서 요약 모임.','비즈니스','역삼동',37.5006,127.0360,'https://images.unsplash.com/photo-1552250575-e508473b090f?q=80&w=800'),
                    ('성수 숲속 독서','성수동 카페거리에서 커피와 함께하는 주말 독서 시간.','독서/인문','성수동',37.5445,127.0560,'https://images.unsplash.com/photo-1481627526605-594220f7f2fb?q=80&w=800'),
                    ('망원 문학 산책','동네 카페를 돌며 고전 문학의 의미를 찾는 모임.','소설/인문','망원동',37.5559,126.9015,'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=800'),
                    ('신촌 철학 브런치','어려운 철학 책을 쉽게 풀어보는 브런치 타임.','인문/철학','대현동',37.5591,126.9432,'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=800'),
                    ('연남동 기록자들','자신의 일상을 책으로 엮어보는 독립출판 준비 모임.','독서/기록','연남동',37.5612,126.9248,'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'),
                    ('성신 경제 스터디','최신 경제 트렌드 뉴스를 책으로 깊게 파봅니다.','비즈니스','동선동',37.5926,127.0164,'https://images.unsplash.com/photo-1611974717537-48843914e1fd?q=80&w=800'),
                    ('마포 만화 애호가','서사가 있는 만화와 그래픽 노블을 공유합니다.','취미/만화','마포동',37.5393,126.9452,'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?q=80&w=800'),
                    ('종로 역사 탐방','역사서를 읽고 실제 유적지를 가보는 현장형 모임.','인문/역사','종로1가',37.5714,126.9788,'https://images.unsplash.com/photo-1548013146-72479768bbaa?q=80&w=800'),
                    ('서울숲 에세이 쓰기','감성을 담은 짧은 글을 매주 한 편씩 완성합니다.','기록/에세이','성수동1가',37.5431,127.0448,'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'),
                    ('광화문 독토회','시사 전문 서적을 읽고 열띤 토론을 벌입니다.','사회/문화','광화문',37.5759,126.9768,'https://images.unsplash.com/photo-1517245385169-46b8b23f0385?q=80&w=800'),
                    ('이태원 글로벌 낭독','원서 읽기를 통해 언어와 문화를 동시에 배웁니다.','외국어/문학','이태원동',37.5345,126.9942,'https://images.unsplash.com/photo-1523050335456-cbbefe286207?q=80&w=800'),
                    ('여의도 금융 독서','금융 시장의 원리를 책을 통해 마스터합니다.','경제/경영','여의도동',37.5216,126.9242,'https://images.unsplash.com/photo-1591696208162-a9775fb4465d?q=80&w=800'),
                    ('혜화 예술가의 눈','미술사와 예술론을 연구하는 심도 있는 안목 모임.','예술/학술','명륜동',37.5818,127.0019,'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800'),
                    ('건대 판타지 정복','판타지 소설과 장르 문학을 사랑하는 사람들의 모임.','장르/소설','화양동',37.5425,127.0709,'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800'),
                    ('남산 시(詩) 산책','계절마다 변하는 위대한 시구들을 함께 읽습니다.','문학/시','예장동',37.5538,126.9912,'https://images.unsplash.com/photo-1502134249126-5fcd058c3d0d?q=80&w=800'),
                    ('용산 데이터 사이언스','IT 기술 서적과 데이터 분석법을 함께 공부합니다.','자기계발/IT','한강로동',37.5299,126.9648,'https://images.unsplash.com/photo-1551288049-bbbda536ad37?q=80&w=800')
                """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS posts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    title VARCHAR(300) NOT NULL,
                    content TEXT NOT NULL,
                    book_title VARCHAR(300),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_likes (
                    user_id INTEGER NOT NULL,
                    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                    PRIMARY KEY (user_id, post_id)
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS comments (
                    id SERIAL PRIMARY KEY,
                    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    content TEXT NOT NULL,
                    parent_comment_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await conn.execute(
                "ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES comments(id) ON DELETE SET NULL"
            )

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS club_members (
                    id SERIAL PRIMARY KEY,
                    club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(club_id, user_id)
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS reading_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    read_book_id INTEGER REFERENCES read_books(id) ON DELETE SET NULL,
                    book_title VARCHAR(300),
                    book_analysis TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await conn.execute(
                "ALTER TABLE reading_sessions ADD COLUMN IF NOT EXISTS read_book_id INTEGER REFERENCES read_books(id) ON DELETE SET NULL"
            )
            # book_title은 비인증 세션의 fallback으로 nullable 유지, book_author는 JOIN으로 대체
            await conn.execute(
                "ALTER TABLE reading_sessions DROP COLUMN IF EXISTS book_author"
            )
            # 기존 세션 read_book_id 연결 (제목+유저 기준 매칭)
            await conn.execute("""
                UPDATE reading_sessions rs SET read_book_id = rb.id
                FROM read_books rb
                WHERE rs.user_id = rb.user_id
                  AND rs.book_title = rb.title
                  AND rs.read_book_id IS NULL
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS session_qa (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER REFERENCES reading_sessions(id) ON DELETE CASCADE,
                    question TEXT NOT NULL,
                    answer TEXT,
                    question_type VARCHAR(20) DEFAULT 'followup',
                    turn_order INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS recordings (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
                    filename VARCHAR(300),
                    transcript TEXT,
                    labeled_transcript TEXT,
                    summary TEXT,
                    key_topics JSONB,
                    followup_questions JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await conn.execute(
                "ALTER TABLE recordings ADD COLUMN IF NOT EXISTS labeled_transcript TEXT"
            )
            await conn.execute(
                "ALTER TABLE recordings ADD COLUMN IF NOT EXISTS summary TEXT"
            )
            await conn.execute(
                "ALTER TABLE recordings ADD COLUMN IF NOT EXISTS key_topics JSONB"
            )
            await conn.execute(
                "ALTER TABLE recordings ADD COLUMN IF NOT EXISTS followup_questions JSONB"
            )
            await conn.execute(
                "ALTER TABLE recordings DROP COLUMN IF EXISTS duration_seconds"
            )
            # recording_analyses 데이터를 recordings로 이전 후 테이블 제거 (없으면 skip)
            try:
                async with conn.transaction():
                    await conn.execute("""
                        UPDATE recordings r SET
                            summary = ra.summary,
                            key_topics = ra.key_topics,
                            followup_questions = ra.followup_questions
                        FROM recording_analyses ra
                        WHERE ra.recording_id = r.id
                          AND r.summary IS NULL
                    """)
                    await conn.execute("DROP TABLE IF EXISTS recording_analyses")
            except Exception:
                pass

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS club_reviews (
                    id SERIAL PRIMARY KEY,
                    club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                    review_text TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(club_id, user_id)
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS reading_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    read_book_id INTEGER REFERENCES read_books(id) ON DELETE SET NULL,
                    duration_seconds INTEGER NOT NULL DEFAULT 0,
                    started_reading_at DATE,
                    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await conn.execute(
                "ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS read_book_id INTEGER REFERENCES read_books(id) ON DELETE SET NULL"
            )
            await conn.execute(
                "ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS started_reading_at DATE"
            )
            # 기존 로그 read_book_id 연결 (book_title 컬럼이 있는 경우에만)
            try:
                async with conn.transaction():
                    await conn.execute("""
                        UPDATE reading_logs rl SET read_book_id = rb.id
                        FROM read_books rb
                        WHERE rl.user_id = rb.user_id
                          AND rl.book_title = rb.title
                          AND rl.read_book_id IS NULL
                    """)
            except Exception:
                pass
            # 텍스트 컬럼 제거 (기존 데이터 마이그레이션 후)
            await conn.execute("ALTER TABLE reading_logs DROP COLUMN IF EXISTS book_title")
            await conn.execute("ALTER TABLE reading_logs DROP COLUMN IF EXISTS book_author")
            await conn.execute("ALTER TABLE reading_logs DROP COLUMN IF EXISTS book_image")
            await conn.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS stats_public BOOLEAN DEFAULT TRUE"
            )
            await conn.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(200)"
            )
            await conn.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)"
            )
            await conn.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(100)"
            )

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS highlights (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    read_book_id INTEGER REFERENCES read_books(id) ON DELETE CASCADE,
                    text TEXT NOT NULL,
                    page_num INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS dive_rooms (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(300) NOT NULL,
                    book_title VARCHAR(300) DEFAULT '',
                    book_image TEXT DEFAULT '',
                    book_isbn VARCHAR(50) DEFAULT '',
                    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    host_name VARCHAR(100) DEFAULT '',
                    scheduled_at TIMESTAMPTZ NOT NULL,
                    reading_minutes INTEGER NOT NULL DEFAULT 30,
                    discussion_minutes INTEGER NOT NULL DEFAULT 20,
                    max_participants INTEGER NOT NULL DEFAULT 8,
                    late_join_cutoff_minutes INTEGER DEFAULT 10,
                    notice TEXT DEFAULT '',
                    status VARCHAR(20) DEFAULT 'scheduled',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS dive_participants (
                    id SERIAL PRIMARY KEY,
                    room_id INTEGER REFERENCES dive_rooms(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'waiting',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(room_id, user_id)
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS dive_messages (
                    id SERIAL PRIMARY KEY,
                    room_id INTEGER REFERENCES dive_rooms(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    user_name VARCHAR(100) DEFAULT '',
                    content TEXT NOT NULL,
                    is_ai BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                ALTER TABLE dive_rooms ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT TRUE
            """)
            await conn.execute("""
                UPDATE dive_rooms SET chat_enabled = TRUE WHERE chat_enabled IS NULL
            """)
            await conn.execute("""
                ALTER TABLE dive_rooms ADD COLUMN IF NOT EXISTS room_image TEXT DEFAULT ''
            """)
            await conn.execute("""
                ALTER TABLE dive_messages ADD COLUMN IF NOT EXISTS to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_images (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    image_data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS friendships (
                    id SERIAL PRIMARY KEY,
                    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(requester_id, addressee_id)
                )
            """)

            await conn.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_whisper BOOLEAN DEFAULT TRUE"
            )
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_follows (
                    id SERIAL PRIMARY KEY,
                    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(follower_id, following_id)
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_blocks (
                    id SERIAL PRIMARY KEY,
                    blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(blocker_id, blocked_id)
                )
            """)

            # post_likes user_id FK 추가
            try:
                async with conn.transaction():
                    await conn.execute("""
                        ALTER TABLE post_likes
                        ADD CONSTRAINT fk_post_likes_user
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    """)
            except Exception:
                pass  # 이미 존재하는 경우
            # comments 부모 댓글 삭제 시 CASCADE로 변경
            try:
                async with conn.transaction():
                    await conn.execute(
                        "ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_parent_comment_id_fkey"
                    )
                    await conn.execute("""
                        ALTER TABLE comments
                        ADD CONSTRAINT comments_parent_comment_id_fkey
                        FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
                    """)
            except Exception:
                pass

            # 샘플 게시물/댓글 시딩
            post_count = await conn.fetchval("SELECT COUNT(*) FROM posts")
            if post_count == 0:
                u1 = await conn.fetchval(
                    "INSERT INTO users (name, gender, age, location, lat, lng) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
                    '김독서', '여성', 32, '강남구', 37.5172, 127.0473,
                )
                u2 = await conn.fetchval(
                    "INSERT INTO users (name, gender, age, location, lat, lng) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
                    '이경제', '남성', 28, '마포구', 37.5663, 126.9024,
                )
                u3 = await conn.fetchval(
                    "INSERT INTO users (name, gender, age, location, lat, lng) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
                    '박과학', '남성', 35, '종로구', 37.5735, 126.9788,
                )

                p1 = await conn.fetchval(
                    "INSERT INTO posts (user_id, title, content, book_title) VALUES ($1,$2,$3,$4) RETURNING id",
                    u1,
                    '사피엔스를 읽고 — 인류 역사를 바꾼 세 가지 혁명',
                    '유발 하라리의 『사피엔스』는 인류의 역사를 완전히 새로운 시각으로 보여줍니다.\n\n'
                    '이 책에서 가장 충격적이었던 부분은 농업혁명이 인류에게 오히려 재앙이었을 수도 있다는 주장이었어요. '
                    '수렵채집 시절보다 더 고된 노동, 더 단조로운 식단, 더 빈번한 전염병... 우리가 당연히 진보라고 여겼던 것이 '
                    '사실은 쌍날의 검이었다는 걸 깨달았습니다.\n\n'
                    '특히 "허구(fiction)를 믿는 능력"이 호모 사피엔스를 특별하게 만들었다는 논지가 인상 깊었어요. '
                    '화폐, 국가, 법, 종교 — 이 모든 것이 우리가 함께 믿기로 한 이야기라는 거잖아요.',
                    '사피엔스',
                )
                p2 = await conn.fetchval(
                    "INSERT INTO posts (user_id, title, content, book_title) VALUES ($1,$2,$3,$4) RETURNING id",
                    u2,
                    '돈의 심리학 — 부자가 되는 것은 얼마나 버느냐가 아니다',
                    '모건 하우절의 『돈의 심리학』을 읽으며 투자에 대한 생각이 완전히 바뀌었습니다.\n\n'
                    '저자가 강조하는 핵심은 "얼마나 버느냐"가 아니라 "어떻게 행동하느냐"입니다. '
                    '금융 지식보다 행동이 훨씬 중요하다는 것이죠. 복리의 마법도 결국 오랜 시간 흔들리지 않고 '
                    '버티는 능력에서 나온다는 걸 이 책을 통해 실감했어요.',
                    '돈의 심리학',
                )
                p3 = await conn.fetchval(
                    "INSERT INTO posts (user_id, title, content, book_title) VALUES ($1,$2,$3,$4) RETURNING id",
                    u3,
                    '코스모스를 읽으며 우주의 경이로움에 빠지다',
                    '칼 세이건의 『코스모스』를 처음 펼쳤을 때, 첫 문장부터 압도당했습니다.\n\n'
                    '"우주는 과거에도 있었고, 현재에도 있으며, 앞으로도 있을 전부다." '
                    '이 단순한 문장이 왜 그렇게 묵직하게 느껴지는지, 읽으면서 계속 생각하게 됩니다.',
                    '코스모스',
                )
                p4 = await conn.fetchval(
                    "INSERT INTO posts (user_id, title, content, book_title) VALUES ($1,$2,$3,$4) RETURNING id",
                    u1,
                    '총균쇠 — 지리가 역사를 결정했다는 충격적인 주장',
                    '재레드 다이아몬드의 『총, 균, 쇠』는 왜 어떤 민족은 세계를 정복했고 '
                    '어떤 민족은 정복당했는가에 대한 답을 제시합니다.\n\n'
                    '저자의 답은 인종이나 지능의 차이가 아니라 "지리적, 생태적 조건"의 차이입니다.',
                    '총균쇠',
                )
                p5 = await conn.fetchval(
                    "INSERT INTO posts (user_id, title, content, book_title) VALUES ($1,$2,$3,$4) RETURNING id",
                    u3,
                    '파인만의 물리학 강의 — 과학이 이렇게 재밌을 수 있다니',
                    '리처드 파인만의 강의록을 책으로 읽으면서, 왜 그가 20세기 최고의 물리학자이자 '
                    '최고의 교사라고 불리는지 알 것 같았습니다.',
                    '파인만의 물리학 강의',
                )

                c1 = await conn.fetchval(
                    "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING id",
                    p1, u2, '저도 이 책 읽고 큰 충격을 받았어요. 특히 농업혁명이 인류에게 오히려 재앙일 수 있다는 주장, 정말 역발상이죠.',
                )
                await conn.execute(
                    "INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES ($1,$2,$3,$4)",
                    p1, u1,
                    '맞아요! 수렵채집인들의 뼈를 분석하면 농경민보다 더 건강했다는 연구결과가 있더라고요.',
                    c1,
                )
                await conn.execute(
                    "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3)",
                    p1, u3, '"허구를 믿는 능력"이라는 개념이 정말 신선했습니다.',
                )
                c2 = await conn.fetchval(
                    "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING id",
                    p2, u1, '"얼마나 버느냐"보다 "어떻게 행동하느냐"가 중요하다는 말이 너무 와닿아요.',
                )
                await conn.execute(
                    "INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES ($1,$2,$3,$4)",
                    p2, u2,
                    '복리에 대한 챕터가 인상 깊었습니다. 워런 버핏 자산의 96%가 60세 이후에 만들어졌다는 통계...',
                    c2,
                )
                await conn.execute(
                    "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3)",
                    p3, u1, '코스모스 캘린더 설명이 정말 압도적이죠.',
                )
                await conn.execute(
                    "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3)",
                    p4, u2, '총균쇠는 정말 세계관을 바꾸는 책이죠.',
                )
                await conn.execute(
                    "INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3)",
                    p5, u2, '파인만의 강의를 직접 들으면 어땠을까 항상 상상해요.',
                )

                for uid, pid in [(u2,p1),(u3,p1),(u1,p2),(u3,p2),(u1,p3),(u2,p3),(u2,p4),(u1,p5),(u2,p5)]:
                    await conn.execute(
                        "INSERT INTO post_likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
                        uid, pid,
                    )

    print("Database tables initialized!")
