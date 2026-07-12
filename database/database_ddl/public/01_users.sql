create table users
(
    id           serial
        constraint users_pk
            primary key,
    display_name text not null
        constraint uq_display_name UNIQUE,
    passwort text not null,
    security_stamp uuid not null default gen_random_uuid()
);

alter table users
    owner to postgres;

