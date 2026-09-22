import sqlite3
import os
from .master_database import MasterBase, master_engine

def migrate_master_db():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "master.db")
    print(f"Checking master DB at {db_path}...")

    # First run create_all so any new tables like platform_tariff_settings are created
    MasterBase.metadata.create_all(bind=master_engine)

    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        cur.execute("PRAGMA table_info(tenants)")
        existing_cols = {row[1] for row in cur.fetchall()}

        tenant_cols = [
            ("subscription_price", "REAL DEFAULT 0.0"),
            ("is_trial", "INTEGER DEFAULT 0"),
        ]

        for col, col_def in tenant_cols:
            if col not in existing_cols:
                cur.execute(f"ALTER TABLE tenants ADD COLUMN {col} {col_def}")
                print(f"  Added tenants.{col}")

        conn.commit()
        conn.close()
        print("Master DB migration completed successfully.")
    else:
        print("master.db file does not exist yet (it will be created on app start).")

if __name__ == "__main__":
    migrate_master_db()
