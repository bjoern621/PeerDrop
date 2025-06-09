create table devices
(
    uuid UUID NOT NULL CONSTRAINT devices_pk PRIMARY KEY,
    display_name TEXT NOT NULL,
    account_id INTEGER NOT NULL CONSTRAINT users_fk FOREIGN KEY
);

alter table devices
    owner to postgres;

