# Batched-Worker-Pool

Non blocking multi threaded batched worker pools in node.js 🔥
Using node.js [worker_threads](https://nodejs.org/api/worker_threads.html) module


    batchedWorkerPool = [
      [ Worker, Worker, Worker, Worker]
      [ Worker, Worker, Worker, Worker]
      [ Worker, Worker, Worker, Worker]
    ]

Each Batch of workers is identical
Each Worker of a Batch can get individually seeded with parameters, functions, etc.
This is more RAM-heavy but can help deliver seperatable, CPU heavy tasks quicker

Influenced by [https://github.com/addaleax/workers-sudoku](https://github.com/addaleax/workers-sudoku)