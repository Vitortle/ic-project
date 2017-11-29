function vidplay() {
   var video = document.getElementById("video1");  
      video.play();         
}

function vidpause(){
    var video = document.getElementById("video1");
    video.pause();
}

function restart() {
    var video = document.getElementById("video1");
    video.currentTime = 0;
}

function skip(value) {
    var video = document.getElementById("video1");
    video.currentTime += value;
}      