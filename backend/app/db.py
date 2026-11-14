
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

# Remove libpq-specific URL parameters unsupported by asyncpg.
url = make_url(settings.database_url)
query = dict(url.query)
query.pop("channel_binding", None)
query.pop("sslmode", None)

url = url.set(query=query)

engine = create_async_engine(
    url,
    connect_args={"ssl": "require"},
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with SessionLocal() as session:
        yield session
