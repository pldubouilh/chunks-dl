var http = require("http")
    url = require("url")
    path = require("path")
    fs = require("fs")
    port = process.argv[2] || 3000
    glob = require("glob")
    Fetcher = require('./fetcher.js')

var chunksFetcher = new Fetcher();

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
  var pub = uri.split('/')[1]

  // is it a progress report ?
  if (pub === 'report'){
    if(Fetcher.done){
      serveString('done')
      Fetcher.done = false
    }
    else
      serveString(Fetcher.msgBuffer.join('+'))

    Fetcher.msgBuffer = []
    return
  }

  console.log('\n  ------------------------')

  // is it a valid pub key?
  if(!pub.match(/[0-9A-Fa-f]{64}/g)){
    console.log('\n  Serving homepage')
    serveFile(__dirname + '/backend/home.html')
  }

  // Website exists at all ?
  else if(glob.sync(__dirname + '/received/' + pub + '/content').length === 0){
    console.log('\n  Starting fetching process')
    chunksFetcher.emit('go', pub)
    serveFile(__dirname + '/backend/wait.html')
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
      http404()

    else {
      var filename = path.join(loc)
      if (fs.statSync(filename).isDirectory())
        filename += 'index.html';

      serveFile(filename)
    }
  }


  function http404(){
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not Found\n");
    response.end();
  }

  function serveFile (filename){
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

  function serveString (msg){
    response.writeHead(200)
    response.write(msg)
    response.end()
  }
}).listen(parseInt(port, 10));

//console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
