'use strict';
const { parentPort } = require('worker_threads');

/// Seeding
parentPort.once('message', (seeds) => {

  /// Init main function
  parentPort.on('message', async (userData) => {
    /// Custom Heavy Calculation here
    /// or a function that came with the seed
    let calculatedStrings = [];
    for (let seed of seeds) {
      calculatedStrings.push(`${seed} participated in ${userData}`);
    }

    parentPort.postMessage(calculatedStrings);
  });

  parentPort.postMessage('SEEDED');
});
