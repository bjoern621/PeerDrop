create table users
(
    id           serial
        constraint users_pk
            primary key,
    display_name text not null
);

alter table users
    owner to postgres;

