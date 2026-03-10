-- Demo Access Log: track who accesses demo dashboards and how often
CREATE TABLE demo_access_log (
    id              SERIAL PRIMARY KEY,
    promo_code_id   INT REFERENCES promo_codes(id) ON DELETE SET NULL,
    email           VARCHAR(255) NOT NULL,
    demo_code       VARCHAR(50) NOT NULL,
    demo_type       VARCHAR(20),
    access_type     VARCHAR(20) DEFAULT 'code_entry',
    ip_address      VARCHAR(50),
    user_agent      TEXT,
    session_token   VARCHAR(64),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_demo_access_email ON demo_access_log(email);
CREATE INDEX idx_demo_access_promo ON demo_access_log(promo_code_id);
CREATE INDEX idx_demo_access_created ON demo_access_log(created_at DESC);
