
import asyncio
from sqlalchemy import text
from app.db import engine


async def main():
    try:
        print("Testing SQLAlchemy database connection...")

        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            print("SUCCESS: Database connection established.")
            print("Query result:", result.scalar())

    except Exception as exc:
        print("DATABASE CONNECTION FAILED")
        print("Error type:", type(exc).__name__)
        print("Error:", str(exc))

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
