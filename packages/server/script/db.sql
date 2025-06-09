-- annotations.sql
-- Run this in psql (or your favourite migration tool) to bootstrap the schema.

CREATE TABLE IF NOT EXISTS annotations (
    id          BIGSERIAL PRIMARY KEY,          -- the row your code returns
    scrolly     INTEGER      NOT NULL,          -- window.scrollY
    url         TEXT         NOT NULL,          -- page URL
    payload     JSONB        NOT NULL,          -- { annotations[], date, window } blob
    screenshot  BYTEA        NOT NULL,          -- decode(...'base64') lands here
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Nice-to-have helper indexes
CREATE INDEX IF NOT EXISTS annotations_url_idx     ON annotations (url);
CREATE INDEX IF NOT EXISTS annotations_payload_gin ON annotations USING GIN (payload);
