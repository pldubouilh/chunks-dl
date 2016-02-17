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

  var waitingToFetch = false
  var connected = 0
  var DELAYUPDATE = 1


  // Init DHT & BT cli
  var dht = new DHT({ bootstrap: true, verify: ed.verify })
  var client = new WebTorrent()
  console.log("\n  Connecting to the DHT...")


  dht.on('ready', function () {
    console.log("\n  DHT reached.")
    connected = 1
    if(waitingToFetch)
      goGet()
  })

  setTimeout(function () {
    if (!connected) console.log("\n  Can't seems to be able to get to the DHT...")
  }, 2 * 60 * 1000) //2mn


  // Go !
  this.on('go', function(k) {

    if (k === undefined){
      console.log('\n  No key provided')
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
      console.log('\n  New address, creating dir')
      mkdirp(localData)
    }

    // Leave if not connected
    if(connected)
      goGet()
    else{
      waitingToFetch = true
      console.log("\n  Waiting for a DHT connection...")
    }
  });


  function goGet(){

    waitingToFetch = false
    console.log("\n  DHT connected !")
    console.log('\n  Public key : ' + pub)
    console.log("\n  Getting " + key)

    debugger;
    dht.get(key,getCb)
  }

  function getCb(err, res){

    // Delayed loop to automatically download updates
    timerToken = setTimeout(goGet, DELAYUPDATE*1000*60)

    // Return on error
    if (err){
      console.log('\n  Didn\'t get any reply from the DHT')
      console.log(err)
      return
    }
    console.log('\n  Received from DHT :  ' + res.v.toString('Utf8'))

    // Try to read key. Write it otherwise
    try {
      var read = jf.readFileSync(localData + '/magnet')
    }
    catch(err){
      console.log('\n  Initialisation of magnet')
      jf.writeFileSync(localData + '/magnet', res)
      responseHandler(res.v.toString('Utf8'), undefined)
      return
    }

    jf.writeFileSync(localData + '/magnet', res)
    responseHandler(res.v.toString('Utf8'), Buffer(read.v).toString('Utf8'))

  }

  function responseHandler (val, previousVal){

    // First d/l
    if(previousVal === undefined)
      popTorrent(val, dht)

    // > No new content
    else if(previousVal ===  val){

      if (torrent === undefined){
        console.log('\n  No new content, seed')
        popTorrent(val, dht)
      }
      else
        help()
    }

    // > New content !
    else{
      console.log('\n  New content')

      if (torrent !== undefined)
        client.remove(torrent)

      popTorrent(val, dht)
    }
  }

  function popTorrent (magnet, htable){

    var torrentPath = localData + '/content/'
    console.log('\n  Passing over to the torrent engine')
    console.log('\n  Storing there : ' + torrentPath)

    client.add(magnet, {dht : htable, path : torrentPath}, function (t){
      torrent = t
      console.log('\n  Client downloading ')

      setTimeout(elapsed, 5000, t)

      function elapsed (t){
       console.log('  =====' + '\nProgress : ' + t.progress*100 + '\nDownloaded: ' + t.downloaded + '\nSpeed: ' + t.downloadSpeed)
       if (t.progress === 1)
         done()
       else
         setTimeout(elapsed, 5000)
     }
    })
  }

  function done (){

    console.log('\n  Download over - now seed !')

    // Stuff should be in received/localWebsiteName/someFolder/someName.html
    var path = glob.sync(localData + "/content/*/*.html")[0]
    if(!path) return

    // Display website
    console.log('\n  Url :' + path)
    self.emit('over', path);
  }

  function help (){
    console.log('No new content, and we\'re already seeding, let\'s help')

    var read = jf.readFileSync(localData)
    var options = {
      k: Buffer(read.k),
      seq: read.seq,
      v: Buffer(read.v),
      sign: Buffer(read.sig)
    }

    dht.put(options, function (err, hash) {
      if (err)
        console.log(err)
      else
        console.log('We just gracefully updated the DHT ! How nice...')
    })
  }

  function clearTorrent (){
    client.remove(torrent)
    torrent = undefined
    window.clearTimeout(timerToken)
  }

} // end class


util.inherits(Fetcher, EventEmitter);
module.exports = Fetcher;
