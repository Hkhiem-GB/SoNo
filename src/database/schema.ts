export const DB_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DEBTOR', 'CREDITOR')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_people_type ON people(type);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);

CREATE TABLE IF NOT EXISTS debt_activities (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  original_amount INTEGER NOT NULL CHECK(original_amount > 0),
  remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0),
  status TEXT NOT NULL CHECK(status IN ('UNPAID', 'PAID')),
  FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_debt_activities_person ON debt_activities(person_id);
CREATE INDEX IF NOT EXISTS idx_debt_activities_status ON debt_activities(status);
CREATE INDEX IF NOT EXISTS idx_debt_activities_date ON debt_activities(created_at);

CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  paid_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (activity_id) REFERENCES debt_activities (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_history_activity ON payment_history(activity_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_paid_at ON payment_history(paid_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const SCHEMA_STATEMENTS: string[] = [
  'PRAGMA foreign_keys = ON;',
  `CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('DEBTOR', 'CREDITOR')),
    created_at TEXT NOT NULL
  );`,
  'CREATE INDEX IF NOT EXISTS idx_people_type ON people(type);',
  'CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);',
  `CREATE TABLE IF NOT EXISTS debt_activities (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    original_amount INTEGER NOT NULL CHECK(original_amount > 0),
    remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0),
    status TEXT NOT NULL CHECK(status IN ('UNPAID', 'PAID')),
    FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
  );`,
  'CREATE INDEX IF NOT EXISTS idx_debt_activities_person ON debt_activities(person_id);',
  'CREATE INDEX IF NOT EXISTS idx_debt_activities_status ON debt_activities(status);',
  'CREATE INDEX IF NOT EXISTS idx_debt_activities_date ON debt_activities(created_at);',
  `CREATE TABLE IF NOT EXISTS payment_history (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    paid_at TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (activity_id) REFERENCES debt_activities (id) ON DELETE CASCADE
  );`,
  'CREATE INDEX IF NOT EXISTS idx_payment_history_activity ON payment_history(activity_id);',
  'CREATE INDEX IF NOT EXISTS idx_payment_history_paid_at ON payment_history(paid_at);',
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];

