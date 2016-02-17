//var Fetcher = require('./fetcher.js');

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 3000;
    glob = require("glob")

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
  var pub = uri.split('/')[1]
  if(!pub.match(/[0-9A-Fa-f]{64}/g))
    return
  console.log(pub)

  var arr = uri.split('/')
  arr.shift()
  arr.shift()
  var query = arr.join('/')
  console.log(query)

  debugger;
  var loc = glob.sync(__dirname + '/received/' + pub + '/content/*/' + query)[0]
  console.log(loc)

  if (loc === undefined){
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not Found\n");
    response.end();
    return;
  }
  else {
    var filename = path.join(loc)
    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  }
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
