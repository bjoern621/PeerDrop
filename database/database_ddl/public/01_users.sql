create table users
(
    id           serial
        constraint users_pk
            primary key,
    display_name text not null
        constraint uq_display_name UNIQUE,
    passwort text not null,
    security_stamp uuid not null default gen_random_uuid(),
    -- Same letters as ClientTokenFormat in the backend
    chosen_client_token text
        constraint chk_chosen_client_token check (chosen_client_token ~ '^[bdfghjklmnprstvzaiou]{5}$')
);

alter table users
    owner to postgres;

