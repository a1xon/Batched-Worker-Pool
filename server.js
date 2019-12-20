
    /// Seeded Batched Worker Pool
    ///
    /// 3 Batches á 4 Workers  
    /// batchedWorkerPool = [
    ///     [ Worker, Worker, Worker, Worker]
    ///     [ Worker, Worker, Worker, Worker]
    ///     [ Worker, Worker, Worker, Worker]
    /// ]
    /// Each batch of worker is identical
    /// Each Worker of a Batch can get individually seeded with parameters, functions, etc.
    /// This is more RAM-heavy but can help deliver seperatable CPU heavy tasks quicker
        
'use strict';

const http = require('http');

const { Worker } = require('worker_threads');
const numCPUs = require('os').cpus().length;
const workersPerBatch = 3;

const maxBatches = Math.floor(numCPUs / workersPerBatch);
console.info(`${maxBatches} Batches - ${workersPerBatch} Workers each`);

/// each seed could be a
/// parameter, function, regEx etc. - simply adapt ./worker.js

const seeds = ['Mr. White', 'Mr. Orange', 'Mr. Blond', 'Mr. Pink', 'Mr. Blue', 'Mr. Brown'];

let batchedWorkerPool = [];
let waitingRequests = [];

const chunk = (array, chunkSize) => {
    let chunkedArray = new Array(chunkSize);
    for (let [index, seed] of array.entries()) {
        if (!Array.isArray(chunkedArray[index % chunkSize])) {
            chunkedArray[index % chunkSize] = []
        }
        chunkedArray[index % chunkSize].push(seed);
    }
    return chunkedArray;
}

const seedingWorkers = (batchedWorkerPool, chunkedSeeds) => {
    let seedPromises = [];
    /// every batch of workers needs to get the same set of seeds
    for (let batch of batchedWorkerPool) {
        for (let [index, worker] of batch.entries()) {
            let seedPromise = new Promise((resolve, reject) => {
                worker.postMessage(chunkedSeeds[index]);
                worker.once('message', (response) => {
                    if (response === 'SEEDED') {
                        resolve(true);
                    }
                worker.once('error', (error) => {
                    reject(error);
                }); 
                });
            })
            seedPromises.push(seedPromise);
        }
    }
    return Promise.all(seedPromises);
}

const handleRequest = async (res, userData, batch) => {

    let workerResults = [];
    /// send each worker of the batch the data
    for (let worker of batch) {
        let workerResult = new Promise((resolve,reject) => {
            worker.postMessage(userData);
            worker.once('message', (workerData) => {
                resolve(workerData);
            });
        });
        workerResults.push(workerResult);
    }

    /// Waiting for all results is optional but is usefull if results need some cleaning
    let results = await Promise.all(workerResults);

    /// Result cleaning
    results = [...results].flat();
    // Send it
    res.end(JSON.stringify(results));
    
    // If requests are waiting, reuse the current batch of workers to handle the queued
    // request (waitingRequests is an array of functions). Add the batch to pool if no requests are queued.
    if (waitingRequests.length > 0) {
        waitingRequests.shift()(batch);
    } else {
        batchedWorkerPool.push(batch);
    }
}

const start = async () => {
    
    /// fill batch pool with workers
    for (let i = 0; i < maxBatches; i++) {
        let batch = [];
        for (let j = 0; j < workersPerBatch; j++) {
            batch.push(new Worker('./worker.js'));
        }
        batchedWorkerPool.push(batch);
    }

    /// chunk seeds so each worker gets a similiar amount of seeds
    const chunkedSeeds = chunk(seeds, workersPerBatch);
    /// seed workers
    await seedingWorkers(batchedWorkerPool, chunkedSeeds);

    /// some kind of eventdriven data
    http.createServer((req, res) => {
        let body = '';
        req.setEncoding('utf8');  // Receive strings rather than binary data
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let userData;
            try {
                ///some input cleaning
                userData = body.toLowerCase();
            } catch (err) {
                res.writeHead(400);
                res.end(`Failed to parse body: ${err}`);
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            if (batchedWorkerPool.length > 0) {
                /// handle request with first batch of workers
                handleRequest(res, userData, batchedWorkerPool.shift());
            } else {
                // Queue up requests when no worker is available.
                // The function is waiting for a worker to be assigned.
                waitingRequests.push((batch) => handleRequest(res, userData, batch));
            }
        });
    }).listen(3000);
}

start();