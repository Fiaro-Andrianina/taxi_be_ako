import os
from pathlib import Path

# Load .env immediately before any other imports
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

# Note: We have mysqlclient 2.2.8 installed, so we don't need PyMySQL fallback
# if os.getenv("DB_ENGINE") == "mysql":
#     try:
#         import pymysql
#         pymysql.install_as_MySQLdb()
#     except ImportError:
#         pass
