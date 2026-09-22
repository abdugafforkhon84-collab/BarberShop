import sqlite3, glob

db_files = glob.glob('tenants_data/*.db')
for db_path in db_files:
    print(f'Migrating {db_path}...')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('PRAGMA table_info(users)')
    existing = {row[1] for row in cur.fetchall()}
    if 'barber_percent' not in existing:
        cur.execute('ALTER TABLE users ADD COLUMN barber_percent REAL DEFAULT 50.0')
        print('  Added users.barber_percent')

    cur.execute('PRAGMA table_info(bookings)')
    existing_cols = {row[1] for row in cur.fetchall()}
    booking_cols = [
        ('extra_services', 'TEXT'),
        ('payment_method', 'TEXT'),
        ('is_paid', 'INTEGER'),
        ('total_paid', 'REAL'),
    ]
    for col, typ in booking_cols:
        if col not in existing_cols:
            cur.execute(f'ALTER TABLE bookings ADD COLUMN {col} {typ}')
            print(f'  Added bookings.{col}')

    # ── Make bookings.service_id nullable (SQLite table rebuild) ──
    # Check if service_id has NOT NULL constraint
    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'")
    row = cur.fetchone()
    if row and 'service_id INTEGER NOT NULL' in row[0]:
        print('  Rebuilding bookings table to make service_id nullable...')
        cur.executescript("""
            PRAGMA foreign_keys = OFF;

            DROP TABLE IF EXISTS bookings_new;

            CREATE TABLE bookings_new (
                id INTEGER PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id),
                barber_id INTEGER REFERENCES users(id),
                service_id INTEGER REFERENCES services(id),
                date DATE NOT NULL,
                time TIME NOT NULL,
                duration INTEGER NOT NULL DEFAULT 30,
                price REAL NOT NULL DEFAULT 0,
                status VARCHAR NOT NULL DEFAULT 'pending',
                comment TEXT,
                created_at DATETIME,
                extra_services TEXT,
                payment_method VARCHAR(20),
                is_paid INTEGER NOT NULL DEFAULT 0,
                total_paid REAL
            );

            INSERT INTO bookings_new
                SELECT id, client_id, barber_id, service_id, date, time,
                       duration, price, status, comment, created_at,
                       extra_services, payment_method,
                       COALESCE(is_paid, 0), total_paid
                FROM bookings;

            DROP TABLE bookings;
            ALTER TABLE bookings_new RENAME TO bookings;

            PRAGMA foreign_keys = ON;
        """)
        print('  bookings.service_id is now nullable')

    cur.execute('PRAGMA table_info(settings)')
    existing = {row[1] for row in cur.fetchall()}
    settings_cols = [
        ('price_hair_wash', 'REAL'),
        ('price_beard', 'REAL'),
        ('price_mask', 'REAL'),
    ]
    for col, typ in settings_cols:
        if col not in existing:
            cur.execute(f'ALTER TABLE settings ADD COLUMN {col} {typ}')
            print(f'  Added settings.{col}')

    conn.commit()
    conn.close()
    print(f'  Done: {db_path}')

print('All tenant DBs migrated OK')
