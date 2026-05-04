import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

_pool: pool.ThreadedConnectionPool | None = None


def init_pool():
    global _pool
    _pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=os.getenv("DATABASE_URL"),
    )
    _init_db()


def get_db():
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def _init_db():
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
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
            """)

            cur.execute("""
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
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_sample VARCHAR(500)
            """)

            cur.execute("""
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
            """)

            cur.execute("SELECT COUNT(*) FROM clubs")
            if cur.fetchone()[0] < 5:
                cur.execute("""
                    INSERT INTO clubs (name, description, category, location, lat, lng, member_count, image)
                    VALUES
                    ('합정 독서 기록단','합정역 근처 조용한 카페에서 함께 책 읽고 기록하는 모임입니다.','독서/기록','합정동',37.5494,126.9133,12,'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800'),
                    ('잠실 소설 클럽','잠실 롯데월드몰 근처에서 최신 소설을 분석하고 토론합니다.','소설/토론','잠실동',37.5133,127.1001,8,'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800'),
                    ('홍대 디자인 인사이트','예술과 디자인 서적을 읽으며 영감을 나누는 합정-홍대 라인 모임.','예술/디자인','서교동',37.5567,126.9236,15,'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800'),
                    ('송파 수필의 밤','잠실/송파 직장인들이 모여 하루 한 구절 공유하는 밤 모임.','에세이','송파동',37.5101,127.1128,6,'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800'),
                    ('강남 비즈니스 독서회','성장을 꿈꾸는 직장인들의 경제경영서 요약 모임.','비즈니스','역삼동',37.5006,127.0360,24,'https://images.unsplash.com/photo-1552250575-e508473b090f?q=80&w=800'),
                    ('성수 숲속 독서','성수동 카페거리에서 커피와 함께하는 주말 독서 시간.','독서/인문','성수동',37.5445,127.0560,10,'https://images.unsplash.com/photo-1481627526605-594220f7f2fb?q=80&w=800'),
                    ('망원 문학 산책','동네 카페를 돌며 고전 문학의 의미를 찾는 모임.','소설/인문','망원동',37.5559,126.9015,7,'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=800'),
                    ('신촌 철학 브런치','어려운 철학 책을 쉽게 풀어보는 브런치 타임.','인문/철학','대현동',37.5591,126.9432,5,'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=800'),
                    ('연남동 기록자들','자신의 일상을 책으로 엮어보는 독립출판 준비 모임.','독서/기록','연남동',37.5612,126.9248,11,'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'),
                    ('성신 경제 스터디','최신 경제 트렌드 뉴스를 책으로 깊게 파봅니다.','비즈니스','동선동',37.5926,127.0164,9,'https://images.unsplash.com/photo-1611974717537-48843914e1fd?q=80&w=800'),
                    ('마포 만화 애호가','서사가 있는 만화와 그래픽 노블을 공유합니다.','취미/만화','마포동',37.5393,126.9452,18,'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?q=80&w=800'),
                    ('종로 역사 탐방','역사서를 읽고 실제 유적지를 가보는 현장형 모임.','인문/역사','종로1가',37.5714,126.9788,13,'https://images.unsplash.com/photo-1548013146-72479768bbaa?q=80&w=800'),
                    ('서울숲 에세이 쓰기','감성을 담은 짧은 글을 매주 한 편씩 완성합니다.','기록/에세이','성수동1가',37.5431,127.0448,4,'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800'),
                    ('광화문 독토회','시사 전문 서적을 읽고 열띤 토론을 벌입니다.','사회/문화','광화문',37.5759,126.9768,20,'https://images.unsplash.com/photo-1517245385169-46b8b23f0385?q=80&w=800'),
                    ('이태원 글로벌 낭독','원서 읽기를 통해 언어와 문화를 동시에 배웁니다.','외국어/문학','이태원동',37.5345,126.9942,12,'https://images.unsplash.com/photo-1523050335456-cbbefe286207?q=80&w=800'),
                    ('여의도 금융 독서','금융 시장의 원리를 책을 통해 마스터합니다.','경제/경영','여의도동',37.5216,126.9242,16,'https://images.unsplash.com/photo-1591696208162-a9775fb4465d?q=80&w=800'),
                    ('혜화 예술가의 눈','미술사와 예술론을 연구하는 심도 있는 안목 모임.','예술/학술','명륜동',37.5818,127.0019,8,'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800'),
                    ('건대 판타지 정복','판타지 소설과 장르 문학을 사랑하는 사람들의 모임.','장르/소설','화양동',37.5425,127.0709,22,'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800'),
                    ('남산 시(詩) 산책','계절마다 변하는 위대한 시구들을 함께 읽습니다.','문학/시','예장동',37.5538,126.9912,6,'https://images.unsplash.com/photo-1502134249126-5fcd058c3d0d?q=80&w=800'),
                    ('용산 데이터 사이언스','IT 기술 서적과 데이터 분석법을 함께 공부합니다.','자기계발/IT','한강로동',37.5299,126.9648,14,'https://images.unsplash.com/photo-1551288049-bbbda536ad37?q=80&w=800')
                """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS posts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    title VARCHAR(300) NOT NULL,
                    content TEXT NOT NULL,
                    book_title VARCHAR(300),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS post_likes (
                    user_id INTEGER NOT NULL,
                    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                    PRIMARY KEY (user_id, post_id)
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS comments (
                    id SERIAL PRIMARY KEY,
                    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS club_members (
                    id SERIAL PRIMARY KEY,
                    club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(club_id, user_id)
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS reading_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    book_title VARCHAR(300),
                    book_author VARCHAR(300),
                    book_analysis TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
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

            cur.execute("""
                CREATE TABLE IF NOT EXISTS recordings (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
                    filename VARCHAR(300),
                    duration_seconds INTEGER,
                    transcript TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS recording_analyses (
                    id SERIAL PRIMARY KEY,
                    recording_id INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
                    summary TEXT,
                    key_topics JSONB,
                    followup_questions JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

        conn.commit()
        print("Database tables initialized!")
    except Exception as e:
        conn.rollback()
        print(f"DB init error: {e}")
        raise
    finally:
        _pool.putconn(conn)
