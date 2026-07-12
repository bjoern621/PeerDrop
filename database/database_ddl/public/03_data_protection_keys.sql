-- ASP.NET Core data protection key ring. The backend reads and writes this table
-- through its IXmlRepository; the XML elements are managed by the framework.
create table data_protection_keys
(
    id            serial
        constraint data_protection_keys_pk
            primary key,
    friendly_name text,
    xml           text not null
);

alter table data_protection_keys
    owner to postgres;
