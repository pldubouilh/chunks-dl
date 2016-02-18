var http = require("http")
    url = require("url")
    path = require("path")
    fs = require("fs")
    port = process.argv[2] || 3000
    glob = require("glob")
    Fetcher = require('./fetcher.js')

var chunksFetcher = new Fetcher();

function http404(response){
  response.writeHead(404, {"Content-Type": "text/plain"});
  response.write("404 Not Found\n");
  response.end();
}

function serveFile (response, filename){
  fs.readFile(filename, "binary", function(err, file) {
    if(err){
      response.writeHead(500, {"Content-Type": "text/plain"});
      response.write(err + "\n");
      response.end();
    }
    else{
      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    }
  });
}
http.createServer(function(request, response) {

  console.log('\n  ------------------------')

  var uri = url.parse(request.url).pathname
  var pub = uri.split('/')[1]

  // is it a progress report ?
  if (pub === 'report'){
    console.log('\n  Reporting download...')

    debugger
    response.writeHead(200)
    response.write(Fetcher.msgBuffer.join('+'))
    response.end()

    Fetcher.msgBuffer = []

  }

  // is it a valid pub key?
  else if(!pub.match(/[0-9A-Fa-f]{64}/g)){
    console.log('\n  Serving homepage')
    serveFile(response, __dirname + '/backend/home.html')
  }

  // Website exists at all ?
  else if(glob.sync(__dirname + '/received/' + pub + '/content').length === 0){
    console.log('\n  Starting fetching process')
    chunksFetcher.emit('go', pub)
    serveFile(response, __dirname + '/backend/wait.html')
  }

  // Website on disk serve things if available
  else {
    // extract file requested
    var arr = uri.split('/')
    arr.shift()
    arr.shift()
    var query = arr.join('/')

    // local file location
    var loc = glob.sync(__dirname + '/received/' + pub + '/content/*/' + query)[0]
    console.log('\n  Pub key : ' + pub + '\n  Query : ' + query + '\n  Location : ' + loc)

    if (loc === undefined)
      http404(response)

    else {
      var filename = path.join(loc)
      if (fs.statSync(filename).isDirectory())
        filename += 'index.html';

      serveFile(response, filename)
    }
  }
}).listen(parseInt(port, 10));

//console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
