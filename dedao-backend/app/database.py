"""数据库连接与会话管理（SQLAlchemy 2.0 + SQLite）"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./dedao.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # SQLite 需要允许跨线程访问（uvicorn 的线程池里跑同步路由）
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 依赖注入：每个请求一个独立会话，请求结束自动关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
