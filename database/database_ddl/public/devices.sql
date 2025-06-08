create table devices
(
    uuid UUID NOT NULL CONSTRAINT devices_pk PRIMARY KEY,
    display_name TEXT NOT NULL CONSTRAINT uq_device_display_name UNIQUE,
    account_id INTEGER NOT NULL
);

alter table devices
    owner to postgres;

