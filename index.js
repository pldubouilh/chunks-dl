var Fetcher = require('./fetcher.js');

var chunksFetcher = new Fetcher();

console.log('\n  Starting fetching process')
chunksFetcher.emit('go', 'a86566ea5523bd0b088784bed1f671abfe7ff6a7c74511f0f7a15175022bedd8')

chunksFetcher.on('over', function(path) {
    console.log('Over ! Path : ' + path)
});
