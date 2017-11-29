<script src="/sis/scripts/player_video.js"></script>

</head>
<body>        

<video id="Video1" >
//  Replace these with your own video files. 
     <source src="/sis/video/teste_ogg.ogg" type="video/ogg" />
     <source src="/sis/video/teste_ogg.ogg" type="video/ogg" />
     HTML5 Video is required for this example. 
     <a href="demo.mp4">Download the video</a> file. 
</video>

<div id="buttonbar">
    <button id="restart" onclick="restart();">[]</button> 
    <button id="rew" onclick="skip(-10)">&lt;&lt;</button>
    <button id="play" onclick="vidplay()">&gt;</button>
    <button id="fastFwd" onclick="skip(10)">&gt;&gt;</button>
</div>        