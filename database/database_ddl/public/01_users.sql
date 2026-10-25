create table users
(
    id           serial
        constraint users_pk
            primary key,
    display_name text not null
        constraint uq_display_name UNIQUE,
    passwort text not null,
    security_stamp uuid not null default gen_random_uuid(),
    -- Same characters as ClientTokenFormat in the backend
    chosen_client_token text
        constraint chk_chosen_client_token check (chosen_client_token ~ '^[a-z0-9]{5}$')
);

alter table users
    owner to postgres;

