# Kamil Pietka — Portfolio

Personal portfolio website for showcasing selected software engineering projects, cloud/data engineering work, and deployed applications.

Live site:

https://kamilpietka.dev

## About

I am a Backend / Cloud Software Engineer working across:

- PHP / Laravel
- TypeScript / Node.js
- Python
- AWS
- Docker
- SQL
- Flutter / Dart

I focus on building software that is testable, maintainable, and deployable in real environments.

## Featured Projects

### Vouchers

Full-stack voucher application with a Laravel backend and separate client application.

Repositories:

- Backend: https://github.com/kamilloo/vouchers
- Frontend: https://github.com/kamilloo/vouchers-app

Planned live deployment:

- https://vouchers.kamilpietka.dev
- https://api-vouchers.kamilpietka.dev

### AWS Data Engineering Labs

Hands-on cloud data engineering projects covering batch and streaming architectures.

Technologies include:

- Amazon S3
- AWS Glue
- Amazon Athena
- Amazon Kinesis
- AWS Lambda
- Amazon DynamoDB
- Python

Repositories:

- https://github.com/kamilloo/aws-data-engineering-labs-etl-elt
- https://github.com/kamilloo/aws-data-engineering-labs-real-time-processing

### My Library

Local-first Flutter application for cataloguing books and tracking lending.

Features include:

- SQLite storage
- book search and filtering
- lending history
- barcode / ISBN scanning
- Open Library metadata lookup

Repository:

https://github.com/kamilloo/my-library-app

## Portfolio Architecture

The portfolio is self-hosted on a Linux VPS.

```text
Browser
   |
   v
Cloudflare
   |
   v
Caddy
   |
   v
Static portfolio site