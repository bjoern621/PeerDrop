create table devices
(
    uuid UUID NOT NULL,
    display_name TEXT NOT NULL,
    account_id INTEGER NOT NULL,
    CONSTRAINT devices_pk PRIMARY KEY (uuid, account_id),
    CONSTRAINT users_fk FOREIGN KEY (account_id) REFERENCES users(id) ON DELETE CASCADE
);

alter table devices
    owner to postgres;

