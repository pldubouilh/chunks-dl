var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Fetcher = function() {

  var DHT = require('bittorrent-dht')
  var WebTorrent = require('webtorrent')
  var ed = require('ed25519-supercop')
  var sha1 = require('simple-sha1')
  var fs = require('fs')
  var jf = require('jsonfile')
  var glob = require('glob')
  var mkdirp = require('mkdirp')

  var key, keybuffer, pub, pubBuffer
  var timerToken, localData, torrent
  var self = this

  Fetcher.msgBuffer = []
  Fetcher.done = false

  var waitingToFetch = false
  var connected = 0
  var DELAYUPDATE = 5


  // Init DHT & BT cli
  var dht = new DHT({ bootstrap: true, verify: ed.verify })
  var client = new WebTorrent()
  log("\n  Connecting to the DHT...")


  dht.on('ready', function () {
    log("\n  DHT reached.")
    connected = 1
    if(waitingToFetch)
      goGet()
  })

  setTimeout(function () {
    if (!connected) log("\n  Can't seems to be able to get to the DHT...")
  }, 2 * 60 * 1000) //2mn


  // Go !
  this.on('go', function(k) {

    if (k === undefined){
      log('\n  No key provided')
      return
    }

    pubBuffer = Buffer(k, 'hex')
    pub = k
    keyBuffer = sha1.sync(pubBuffer)
    key = keyBuffer.toString('hex')

    // pub = buffer(k, hex)
    // key = sha1.sync(pub)

    if (torrent !== undefined)
      clearTorrent()

    // Data directory
    //localData = __dirname + '/received/' + k + "/magnet"
    localData = __dirname + '/received/' + pub

    // Make dir and touch new files for non any non existing stuff
    if ( ! fs.existsSync(localData) ){
      log('\n  New address, creating dir')
      mkdirp(localData)
    }

    // Leave if not connected
    if(connected)
      goGet()
    else{
      waitingToFetch = true
      log("\n  Waiting for a DHT connection...")
    }
  });


  function goGet(){

    waitingToFetch = false
    log("\n  DHT connected !")
    log('\n  Public key : ' + pub)
    log("\n  Getting " + key)

    debugger;
    dht.get(key,getCb)
  }


  function getCb(err, res){

    // Delayed loop to automatically download updates
    timerToken = setTimeout(goGet, DELAYUPDATE*1000*60)

    // Return on error
    if (err){
      log('\n  Didn\'t get any reply from the DHT')
      log(err)
      return
    }
    log('\n  Received from DHT :  ' + res.v.toString('Utf8'))

    // Try to read key. Write it otherwise
    try {
      var read = jf.readFileSync(localData + '/magnet')
    }
    catch(err){
      log('\n  Initialisation of magnet')
      jf.writeFileSync(localData + '/magnet', res)
      responseHandler(res.v.toString('Utf8'), undefined)
      return
    }

    jf.writeFileSync(localData + '/magnet', res)
    responseHandler(res.v.toString('Utf8'), Buffer(read.v).toString('Utf8'), res)

  }

  function responseHandler (val, previousVal, res){

    // First d/l
    if(previousVal === undefined)
      popTorrent(val, dht)

    // > No new content
    else if(previousVal ===  val){

      if (torrent === undefined){
        log('\n  No new content, seed')
        popTorrent(val, dht)
      }
      else
        help(res)
    }

    // > New content !
    else{
      log('\n  New content')
      if (torrent !== undefined)
        clearTorrent()
      popTorrent(val, dht)
    }
  }

  function popTorrent (magnet, htable){

    var torrentPath = localData + '/content/'
    log('\n  Passing over to the torrent engine')
    log('\n  Storing there : ' + torrentPath)

    client.add(magnet, {path : torrentPath}, function (t){
      torrent = t
      log('\n  Client downloading ')

      elapsed()
      function elapsed (){
       log('  =====' + '\nProgress : ' + torrent.progress*100 + '\nDownloaded: ' + torrent.downloaded + '\nSpeed: ' + torrent.downloadSpeed)
       if (torrent.progress === 1)
         done()
       else
         setTimeout(elapsed, 5000)
      }
    })
  }

  function done (){

    log('\n  Download over - now seed !')

    // Stuff should be in received/localWebsiteName/someFolder/someName.html
    var path = glob.sync(localData + "/content/*/*.html")[0]
    if(!path) return

    // Display website
    log('\n  Url :' + path)
    self.emit('over', path);
    Fetcher.done = true
  }

  function help (res){
    console.log('\n  No new content, and we\'re already seeding, let\'s help')
    dht.put(res, function (err, hash) {
      if (err)
        console.log(err)
      else
        console.log('\n  We just gracefully updated the DHT ! How nice...')
    })
  }

  function clearTorrent (){
    client.remove(torrent)
    torrent = undefined
    window.clearTimeout(timerToken)
  }

  function log(message){
    console.log(message)
    Fetcher.msgBuffer.push(message)
  }

} // end class


util.inherits(Fetcher, EventEmitter);
module.exports = Fetcher
