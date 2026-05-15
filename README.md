# Distributed API Rate Limiter as a Service (SaaS)

A production-grade, highly available Rate Limiting backend and SDK designed to protect public APIs. Built with **Node.js, gRPC, Redis, Kafka, and PostgreSQL**, this system processes rate-limit checks in sub-10 milliseconds while maintaining strict atomicity and eventual consistency for analytics.

![Architecture: Microservices](https://img.shields.io/badge/Architecture-Microservices-blue)
![gRPC](https://img.shields.io/badge/gRPC-Sub--10ms_Latency-success)
![Redis](https://img.shields.io/badge/Redis-Atomic_Lua_Scripts-red)
![Kafka](https://img.shields.io/badge/Kafka-Event_Driven_Analytics-black)

## System Architecture

The system is decoupled into an ultra-fast critical path for request authorization and a background asynchronous path for zero-loss analytics.

```mermaid
graph TD
    subgraph "Customer Environment"
        App[Customer Express App]
        SDK[NPM SDK Middleware]
        App --> SDK
    end

    subgraph "Cloud Infrastructure (SaaS)"
        Gateway[Public API Gateway HTTP/REST]
        gRPC[Internal Limiter Service Node.js]
        Redis[(Redis Cluster)]
        Kafka[Kafka Event Bus]
        DB[(PostgreSQL)]
        Worker[Analytics Worker Node.js]
        
        Gateway -->|1. gRPC CheckLimit| gRPC
        gRPC -->|2. Atomic Lua Check| Redis
        gRPC -.->|3. Async Event Log| Kafka
        Kafka --> Worker --> DB
        DB -.->|Periodic Rule Sync| gRPC
    end

    SDK -->|HTTPS POST| Gateway
    SDK -.->|429 Too Many Requests| App
    SDK -.->|next() Allowed| App


# Engineering Trade-offs & System Design
This project was built to solve the most common failures in distributed rate limiting:

Preventing Race Conditions: Instead of reading and writing to Redis from Node.js (which fails under concurrent load), the core Sliding Window algorithm is written in a Lua Script and executed natively inside Redis. This guarantees absolute atomicity per request.

Minimizing Latency (gRPC): The internal Limiter Service communicates with the API Gateway via gRPC (HTTP/2 + Protobufs), drastically reducing serialization overhead compared to standard JSON REST APIs.

Database Bottlenecks & Caching: Querying PostgreSQL for user tier rules on every request would crush the database. Instead, the Node.js service utilizes an In-Memory Cache that periodically synchronizes with PostgreSQL, allowing sub-millisecond rule lookups.

Zero-Loss Async Analytics: Logging usage data synchronously degrades API response times. This system uses the "Fire and Forget" pattern. The Limiter Service drops a lightweight payload into an Apache Kafka topic and immediately responds to the user. A separate worker service consumes these events and bulk-inserts them into PostgreSQL.

Technology Stack
## Core Backend: Node.js, Express.js
## Internal RPC: gRPC, Protocol Buffers
## Engine / State: Redis, Lua Scripting
## Event Broker: Apache Kafka (KRaft mode)
## Persistent Storage: PostgreSQL