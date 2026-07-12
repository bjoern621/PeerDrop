create table refresh_tokens
(
    token_hash TEXT NOT NULL CONSTRAINT refresh_tokens_pk PRIMARY KEY,
    account_id INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT users_fk FOREIGN KEY (account_id) REFERENCES users(id) ON DELETE CASCADE
);

alter table refresh_tokens
    owner to postgres;
