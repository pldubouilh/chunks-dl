// Toasting
var toasted = null
var fadeDelay = 8

function toast(msg){

  console.log(msg);
  msg = msg.substring(0, 40)

  // Already toasted ? Reset
  if(toasted){
    var prev = $('.popup').html();
    $('.popup').html(prev + '<br />' + msg)
    window.clearTimeout(toasted);
  }
  else // fresh toast !
    $('.popup').html(msg)

  // Display if not hovered
  if( ! $(".popup").is(':hover') )
    $(".popup").css('opacity', '1')

  // Callback to fadeout
  toasted = setTimeout(function(){
    $('.popup').css('opacity', '0')
    toasted = null
  }, fadeDelay*1000);
}
