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
                ALTER TABLE clubs ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL
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

            # 댓글 대댓글(parent_comment_id)
            cur.execute("""
                ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id
                INTEGER REFERENCES comments(id) ON DELETE SET NULL
            """)

            # 읽은 책 감상평/공개여부
            cur.execute("""
                ALTER TABLE read_books ADD COLUMN IF NOT EXISTS impression TEXT DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE read_books ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE
            """)

            # 모임 평점/리뷰
            cur.execute("""
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

            # 샘플 게시물/댓글 시딩 (비어있을 때만)
            cur.execute("SELECT COUNT(*) FROM posts")
            if cur.fetchone()[0] == 0:
                cur.execute("""
                    INSERT INTO users (name, gender, age, location, lat, lng) VALUES
                    ('김독서', '여성', 32, '강남구', 37.5172, 127.0473) RETURNING id
                """)
                u1 = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO users (name, gender, age, location, lat, lng) VALUES
                    ('이경제', '남성', 28, '마포구', 37.5663, 126.9024) RETURNING id
                """)
                u2 = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO users (name, gender, age, location, lat, lng) VALUES
                    ('박과학', '남성', 35, '종로구', 37.5735, 126.9788) RETURNING id
                """)
                u3 = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO posts (user_id, title, content, book_title) VALUES (%s,%s,%s,%s) RETURNING id
                """, (u1, '사피엔스를 읽고 — 인류 역사를 바꾼 세 가지 혁명',
                    '유발 하라리의 『사피엔스』는 인류의 역사를 완전히 새로운 시각으로 보여줍니다.\n\n'
                    '이 책에서 가장 충격적이었던 부분은 농업혁명이 인류에게 오히려 재앙이었을 수도 있다는 주장이었어요. '
                    '수렵채집 시절보다 더 고된 노동, 더 단조로운 식단, 더 빈번한 전염병... 우리가 당연히 진보라고 여겼던 것이 '
                    '사실은 쌍날의 검이었다는 걸 깨달았습니다.\n\n'
                    '특히 "허구(fiction)를 믿는 능력"이 호모 사피엔스를 특별하게 만들었다는 논지가 인상 깊었어요. '
                    '화폐, 국가, 법, 종교 — 이 모든 것이 우리가 함께 믿기로 한 이야기라는 거잖아요. '
                    '그 공유된 상상이 대규모 협력을 가능하게 하고 세상을 바꿨다고 하라리는 말합니다.\n\n'
                    '독서 모임에서 함께 읽으면 정말 토론 거리가 무궁무진할 것 같아요. 여러분은 어떻게 읽으셨나요?',
                    '사피엔스'))
                p1 = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO posts (user_id, title, content, book_title) VALUES (%s,%s,%s,%s) RETURNING id
                """, (u2, '돈의 심리학 — 부자가 되는 것은 얼마나 버느냐가 아니다',
                    '모건 하우절의 『돈의 심리학』을 읽으며 투자에 대한 생각이 완전히 바뀌었습니다.\n\n'
                    '저자가 강조하는 핵심은 "얼마나 버느냐"가 아니라 "어떻게 행동하느냐"입니다. '
                    '금융 지식보다 행동이 훨씬 중요하다는 것이죠. 복리의 마법도 결국 오랜 시간 흔들리지 않고 '
                    '버티는 능력에서 나온다는 걸 이 책을 통해 실감했어요.\n\n'
                    '"충분함을 아는 것(knowing when to stop)"이라는 챕터도 마음에 깊이 남았습니다. '
                    '끊임없이 더 많이를 원하다가 모든 것을 잃는 사람들의 이야기가 남의 일처럼 느껴지지 않았거든요.\n\n'
                    '경제적 자유보다 중요한 것은 자신의 시간을 통제할 수 있는 자유라는 메시지 — '
                    '정말 많은 생각을 하게 만드는 책입니다. 경제/투자에 관심 있는 분들께 강력 추천해요!',
                    '돈의 심리학'))
                p2 = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO posts (user_id, title, content, book_title) VALUES (%s,%s,%s,%s) RETURNING id
                """, (u3, '코스모스를 읽으며 우주의 경이로움에 빠지다',
                    '칼 세이건의 『코스모스』를 처음 펼쳤을 때, 첫 문장부터 압도당했습니다.\n\n'
                    '"우주는 과거에도 있었고, 현재에도 있으며, 앞으로도 있을 전부다." '
                    '이 단순한 문장이 왜 그렇게 묵직하게 느껴지는지, 읽으면서 계속 생각하게 됩니다.\n\n'
                    '특히 코스모스 캘린더(우주의 역사를 1년으로 압축한 개념)를 통해 인류의 역사가 얼마나 짧은지 '
                    '실감하면서 한편으로는 경이롭고 한편으로는 겸허해졌어요. '
                    '우리 인간이 별들의 물질로 만들어졌다는 사실이 시적이면서도 과학적인 진실이라는 것이요.\n\n'
                    '과학책이라고 어렵지 않아요. 오히려 세이건의 문체는 시처럼 아름답습니다. '
                    '우주에 관심 있는 분이라면, 아니 그런 관심이 없더라도 한 번쯤은 꼭 읽어보시길 바랍니다.',
                    '코스모스'))
                p3 = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO posts (user_id, title, content, book_title) VALUES (%s,%s,%s,%s) RETURNING id
                """, (u1, '총균쇠 — 지리가 역사를 결정했다는 충격적인 주장',
                    '재레드 다이아몬드의 『총, 균, 쇠』는 왜 어떤 민족은 세계를 정복했고 '
                    '어떤 민족은 정복당했는가에 대한 답을 제시합니다.\n\n'
                    '저자의 답은 인종이나 지능의 차이가 아니라 "지리적, 생태적 조건"의 차이입니다. '
                    '유라시아에 가축화할 수 있는 동식물이 많았기 때문에 문명이 먼저 발달했고, '
                    '그 결과 총과 균과 쇠를 먼저 갖게 됐다는 것이죠.\n\n'
                    '특히 가축과 함께 살면서 얻게 된 전염병 면역이 신대륙 정복의 핵심 무기였다는 사실은 '
                    '아직도 머릿속을 맴돌아요. 의도하지 않은 생물학적 무기... '
                    '역사를 이런 시각으로 볼 수 있다는 게 정말 흥미롭습니다.',
                    '총균쇠'))
                p4 = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO posts (user_id, title, content, book_title) VALUES (%s,%s,%s,%s) RETURNING id
                """, (u3, '파인만의 물리학 강의 — 과학이 이렇게 재밌을 수 있다니',
                    '리처드 파인만의 강의록을 책으로 읽으면서, 왜 그가 20세기 최고의 물리학자이자 '
                    '최고의 교사라고 불리는지 알 것 같았습니다.\n\n'
                    '파인만은 복잡한 물리 개념을 놀라울 정도로 명쾌하게 설명합니다. '
                    '"과학적으로 이해하지 못하면서 그 내용에 대해 설명을 들었다고 착각하지 말라"는 그의 태도가 '
                    '책 전체에 흐르고 있어요. 수식 뒤에 숨겨진 직관적 의미를 끊임없이 강조합니다.\n\n'
                    '물리학 비전공자인 저도 양자역학 챕터를 읽으면서 "이게 이런 의미였어?" 하는 순간들이 여러 번 있었어요. '
                    '수학 공식보다 개념의 본질을 이해하는 것이 더 중요하다는 것, 파인만이 평생 강조한 메시지인 것 같습니다.',
                    '파인만의 물리학 강의'))
                p5 = cur.fetchone()[0]

                # 댓글 시딩
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s) RETURNING id
                """, (p1, u2, '저도 이 책 읽고 큰 충격을 받았어요. 특히 농업혁명이 인류에게 오히려 재앙일 수 있다는 주장, 정말 역발상이죠.'))
                c1_1 = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (%s,%s,%s,%s)
                """, (p1, u1, '맞아요! 수렵채집인들의 뼈를 분석하면 농경민보다 더 건강했다는 연구결과가 있더라고요. '
                              '우리가 당연히 여기는 "발전"이 실제로는 개인의 삶을 더 힘들게 만든 측면이 있다는 게 충격이었어요.', c1_1))
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s)
                """, (p1, u3, '"허구를 믿는 능력"이라는 개념이 정말 신선했습니다. '
                              '화폐도 국가도 결국 우리가 공유하는 이야기라는 것 — 과학자 입장에서 보면 '
                              '사회현상을 이렇게 분석할 수 있다는 게 흥미로워요.'))

                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s) RETURNING id
                """, (p2, u1, '"얼마나 버느냐"보다 "어떻게 행동하느냐"가 중요하다는 말이 너무 와닿아요. '
                              '고수익 종목을 찾느라 에너지를 쏟기보다 꾸준히 투자하는 행동력이 더 중요하다는 것, 실천하기가 쉽지 않지만요.'))
                c2_1 = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s) RETURNING id
                """, (p2, u3, '복리에 대한 챕터가 인상 깊었습니다. 워런 버핏 자산의 96%가 60세 이후에 만들어졌다는 통계... '
                              '결국 시간이 가장 중요한 투자 자산이라는 게 과학적 사고와도 맞닿아 있더라고요.'))
                c2_2 = cur.fetchone()[0]
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (%s,%s,%s,%s)
                """, (p2, u2, '정확히요! 아인슈타인이 복리를 "세계 8번째 불가사의"라고 했다는 것도 책에 나오죠. '
                              '결국 부자가 되는 비결은 천재성이 아니라 시간과 인내심이라는 메시지가 오히려 위로가 됐어요.', c2_2))

                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s)
                """, (p3, u1, '코스모스 캘린더 설명이 정말 압도적이죠. 인류의 역사 전체가 12월 31일 마지막 몇 초라는 것... '
                              '겸손해지면서도 우리 존재가 얼마나 경이로운지 동시에 느꼈어요.'))
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s)
                """, (p3, u2, '세이건의 문장이 정말 시처럼 아름답죠. 과학책인데 읽으면서 감동받은 것은 이 책이 처음이었어요. '
                              '"우리는 모두 별의 먼지"라는 문장은 평생 잊지 못할 것 같아요.'))

                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s)
                """, (p4, u2, '총균쇠는 정말 세계관을 바꾸는 책이죠. 문명의 우열이 인종이 아니라 지리적 조건에서 비롯됐다는 것, '
                              '얼마나 많은 편견을 깨주는 주장인지... 역사를 공부하는 방식 자체가 달라졌어요.'))

                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s)
                """, (p5, u2, '파인만의 강의를 직접 들으면 어땠을까 항상 상상해요. '
                              '"직접 유도해보지 않으면 그 내용을 이해한 게 아니다"라는 그의 철학이 공부에 대한 자세를 바꿔줬습니다.'))
                cur.execute("""
                    INSERT INTO comments (post_id, user_id, content) VALUES (%s,%s,%s)
                """, (p5, u1, '물리학 비전공자로서 파인만 책을 읽을 수 있을지 걱정했는데, '
                              '개념을 이렇게 쉽게 설명할 수 있다는 것 자체가 경이롭더라고요. '
                              '이 책 덕분에 과학에 대한 두려움이 많이 사라진 것 같아요.'))

                # 좋아요 시딩
                for uid, pid in [(u2,p1),(u3,p1),(u1,p2),(u3,p2),(u1,p3),(u2,p3),(u2,p4),(u1,p5),(u2,p5)]:
                    cur.execute(
                        "INSERT INTO post_likes (user_id, post_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                        (uid, pid)
                    )

        conn.commit()
        print("Database tables initialized!")
    except Exception as e:
        conn.rollback()
        print(f"DB init error: {e}")
        raise
    finally:
        _pool.putconn(conn)
