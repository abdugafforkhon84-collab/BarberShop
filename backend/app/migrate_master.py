from sqlalchemy import text
from .master_database import MasterBase, master_engine

def migrate_master_db():
    print(f"Migrating master DB ({master_engine.url})...")

    # First run create_all so any new tables like platform_tariff_settings are created
    MasterBase.metadata.create_all(bind=master_engine)

    with master_engine.begin() as conn:
        tenant_cols = [
            ("subscription_price", "FLOAT DEFAULT 0.0"),
            ("is_trial", "BOOLEAN DEFAULT FALSE"),
            ("parent_id", "INTEGER DEFAULT NULL"),
        ]

        for col, col_def in tenant_cols:
            try:
                conn.execute(text(f"ALTER TABLE tenants ADD COLUMN {col} {col_def}"))
                print(f"  Added tenants.{col}")
            except Exception:
                pass

        # Check platform_tariff_settings
        try:
            conn.execute(text("ALTER TABLE platform_tariff_settings ADD COLUMN tariffs_json TEXT DEFAULT '[]'"))
            print("  Added platform_tariff_settings.tariffs_json")
        except Exception:
            pass

    print("Master DB migration completed successfully.")

if __name__ == "__main__":
    migrate_master_db()
