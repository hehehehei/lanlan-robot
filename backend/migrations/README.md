# Database Migrations

This directory contains SQLx migrations for the backend application.

## Running Migrations

To run migrations:

```bash
sqlx migrate run --database-url "mysql://root:password@localhost/cad_db"
```

## Creating New Migrations

To create a new migration:

```bash
sqlx migrate add <migration_name> --source backend/migrations
```

## Offline Mode

This project uses SQLx offline mode. To generate the `sqlx-data.json` file for compile-time verification:

```bash
cargo sqlx prepare --database-url "mysql://root:password@localhost/cad_db"
```
