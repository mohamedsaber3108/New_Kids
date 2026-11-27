# Performance baseline (measured, not optimised)

## Machine
- Build server (shared, busy), 8 vCPU, Node v22.23.5. NOT production size.
- Load generator and server run in one process on the same machine, so numbers are a lower bound.
- Free RAM was about 2 GB (6.8 GB available) at run time. The 100-concurrency run was skipped for memory.

## API load test
Script: `scripts/load-test.mjs`. It uses only Node built-ins and the repo's own `server/app.mjs`. File-backed SQLite, WAL mode. 20 guardians, 60 learners. 20 s of mixed learner traffic (snapshot 45%, progression 20%, heartbeat 20%, controls 10%, attempts 5%).

Commands:
```
node /home/ec2-user/projects/New_Kids/scripts/load-test.mjs
node /home/ec2-user/projects/New_Kids/scripts/load-test.mjs 10 20
```

| Concurrency | Requests | req/s | p50 | p95 | p99 | 5xx / error rate | Event-loop p99 | RSS |
|---|---|---|---|---|---|---|---|---|
| 10 | 17070 | 854 | 10.3 ms | 20.9 ms | 33.3 ms | 0 / 0% | 29.3 ms | 283 MB |
| 50 (default) | 19068 | 953 | 49.2 ms | 73.1 ms | 118.4 ms | 0 / 0% | 59.1 ms | 303 MB |
| 100 | not run | | | | | | | |

All responses were 200 or 201.

Login burst (40 concurrent logins, scrypt cost):

| Run | Burst total | Login p50 | Login p95 | /api/health p95 during burst | Event-loop p99 |
|---|---|---|---|---|---|
| default (50) | 372.1 ms | 228.6 ms | 366.8 ms | 16.1 ms | 22.3 ms |
| 10 | 386.7 ms | 231.4 ms | 371.8 ms | 21.5 ms | 15.4 ms |

The script printed PASS for both runs against its own built-in criteria. Those are not agreed targets.

## Bundle size (from GitHub Actions run 45923426581, as given by the task owner; not re-measured here)

| Asset | Size | Gzip |
|---|---|---|
| main JS (index) | 429.6 kB | 130.0 kB |
| react chunk | 142.8 kB | 45.7 kB |
| CSS | 80.4 kB | 17.3 kB |

## Lighthouse LCP / INP
Not measured: needs a browser run on a mid phone and a low-end tablet profile.

## Targets
None set here. Pass lines come from the owner and the Security judge after this baseline.
