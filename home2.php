<!DOCTYPE html>
<html>
<title>W3.CSS Template</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
<link rel="stylesheet" href="https://www.w3schools.com/lib/w3-theme-black.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
<script src="//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script>
<link rel="stylesheet" type="text/css" href="//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css">
<style>
html,body,h1,h2,h3,h4,h5,h6 {font-family: "Verdana", sans-serif}
</style>
<body>

<!-- Navbar -->
<div class="w3-top">
  <div class="w3-bar w3-theme w3-top w3-left-align w3-large">
    <a class="w3-bar-item w3-button w3-right w3-hide-large w3-hover-white w3-large w3-theme-l1" href="javascript:void(0)" onclick="w3_open()"><i class="fa fa-bars"></i></a>
    <a href="#" class="w3-bar-item w3-button w3-theme-l1">Nome do Sistema</a>
    <div class="dropdown">
  <button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown">Dropdown Example
  <span class="caret"></span></button>
  <ul class="dropdown-menu">
    <li><a href="#">HTML</a></li>
    <li><a href="#">CSS</a></li>
    <li><a href="#">JavaScript</a></li>
  </ul>
</div>
    
    
    <ul class="nav navbar-nav pull-right panel-menu">

                    <li class="dropdown">
                            <a href="#" class="dropdown-toggle account" data-toggle="dropdown">
                                    <div class="avatar">
                                            <img src="http://i1.wp.com/storify.com/public/img/default.avatar.png" class="img-rounded" alt="avatar" /><b class="caret"></b>
                                    </div>
                                    <i class="fa fa-angle-down pull-right"></i>
                                    <div class="user-mini pull-right">
                                            <span class="welcome">Welcome,</span>
                                            <span>Jane Devoops</span>
                                    </div>
                            </a>
                            <ul class="dropdown-menu">
                                    <li>
                                            <a href="#">
                                                    <i class="fa fa-user"></i>
                                                    <span>Profile</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="ajax/page_messages.html" class="ajax-link">
                                                    <i class="fa fa-envelope"></i>
                                                    <span>Messages</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="ajax/gallery_simple.html" class="ajax-link">
                                                    <i class="fa fa-picture-o"></i>
                                                    <span>Albums</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="ajax/calendar.html" class="ajax-link">
                                                    <i class="fa fa-tasks"></i>
                                                    <span>Tasks</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="#">
                                                    <i class="fa fa-cog"></i>
                                                    <span>Settings</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="#">
                                                    <i class="fa fa-power-off"></i>
                                                    <span>Logout</span>
                                            </a>
                                    </li>
                            </ul>
                    </li>
            </ul>
					

</div>
 
   
</div>

<!-- Sidebar -->
<nav class="w3-sidebar w3-bar-block w3-collapse w3-large w3-theme-l5 w3-animate-left" style="z-index:3;width:250px;margin-top:43px;" id="mySidebar">
  <a href="javascript:void(0)" onclick="w3_close()" class="w3-right w3-xlarge w3-padding-large w3-hover-black w3-hide-large" title="Close Menu">
    <i class="fa fa-remove"></i>
  </a>
  <h4 class="w3-bar-item"><b>Menu</b></h4>
  <a class="w3-bar-item w3-button w3-hover-black" href="#">Meus cursos</a>
  <a class="w3-bar-item w3-button w3-hover-black" href="#">Catálogo de cursos</a>
  
  <a class="w3-bar-item w3-button w3-hover-black" href="#">Contato</a>
  
    <div class="form-group">
  <label class="col-md-4 control-label" for="selectbasic">Select Basic</label>
  <ul class="nav navbar-nav pull-right panel-menu">

                    <li class="dropdown">
                            <a href="#" class="dropdown-toggle account" data-toggle="dropdown">
                                    <div class="avatar">
                                            <img src="img/avatar.jpg" class="img-rounded" alt="avatar" /><b class="caret"></b>
                                    </div>
                                    <i class="fa fa-angle-down pull-right"></i>
                                    <div class="user-mini pull-right">
                                            <span class="welcome">Welcome,</span>
                                            <span>Jane Devoops</span>
                                    </div>
                            </a>
                            <ul class="dropdown-menu">
                                    <li>
                                            <a href="#">
                                                    <i class="fa fa-user"></i>
                                                    <span>Profile</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="ajax/page_messages.html" class="ajax-link">
                                                    <i class="fa fa-envelope"></i>
                                                    <span>Messages</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="ajax/gallery_simple.html" class="ajax-link">
                                                    <i class="fa fa-picture-o"></i>
                                                    <span>Albums</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="ajax/calendar.html" class="ajax-link">
                                                    <i class="fa fa-tasks"></i>
                                                    <span>Tasks</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="#">
                                                    <i class="fa fa-cog"></i>
                                                    <span>Settings</span>
                                            </a>
                                    </li>
                                    <li>
                                            <a href="#">
                                                    <i class="fa fa-power-off"></i>
                                                    <span>Logout</span>
                                            </a>
                                    </li>
                            </ul>
                    </li>
            </ul>
</div>
 
  
</nav>

<!-- Overlay effect when opening sidebar on small screens -->
<div class="w3-overlay w3-hide-large" onclick="w3_close()" style="cursor:pointer" title="close side menu" id="myOverlay"></div>

<!-- Main content: shift it to the right by 250 pixels when the sidebar is visible -->
<div class="w3-main" style="margin-left:250px">

  <div class="w3-row w3-padding-64">
    <div class="w3-twothird w3-container">
      <h1 class="w3-text-teal">Heading</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Lorem ipsum
        dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </div>
    <div class="w3-third w3-container">
      <p class="w3-border w3-padding-large w3-padding-32 w3-center">AD</p>
      <p class="w3-border w3-padding-large w3-padding-64 w3-center">AD</p>
    </div>
  </div>

  <div class="w3-row">
    <div class="w3-twothird w3-container">
      <h1 class="w3-text-teal">Heading</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Lorem ipsum
        dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </div>
    <div class="w3-third w3-container">
      <p class="w3-border w3-padding-large w3-padding-32 w3-center">AD</p>
      <p class="w3-border w3-padding-large w3-padding-64 w3-center">AD</p>
    </div>
  </div>

  <div class="w3-row w3-padding-64">
    <div class="w3-twothird w3-container">
      <h1 class="w3-text-teal">Heading</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Lorem ipsum
        dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </div>
    <div class="w3-third w3-container">
      <p class="w3-border w3-padding-large w3-padding-32 w3-center">AD</p>
      <p class="w3-border w3-padding-large w3-padding-64 w3-center">AD</p>
    </div>
  </div>

  <!-- Pagination -->
  <div class="w3-center w3-padding-32">
    <div class="w3-bar">
      <a class="w3-button w3-black" href="#">1</a>
      <a class="w3-button w3-hover-black" href="#">2</a>
      <a class="w3-button w3-hover-black" href="#">3</a>
      <a class="w3-button w3-hover-black" href="#">4</a>
      <a class="w3-button w3-hover-black" href="#">5</a>
      <a class="w3-button w3-hover-black" href="#">»</a>
    </div>
  </div>

  <footer id="myFooter">
    <div class="w3-container w3-theme-l2 w3-padding-32">
      <h4>Footer</h4>
    </div>

    <div class="w3-container w3-theme-l1">
      <p>Powered by <a href="https://www.w3schools.com/w3css/default.asp" target="_blank">w3.css</a></p>
    </div>
  </footer>

<!-- END MAIN -->
</div>

<script>
// Get the Sidebar
var mySidebar = document.getElementById("mySidebar");

// Get the DIV with overlay effect
var overlayBg = document.getElementById("myOverlay");

// Toggle between showing and hiding the sidebar, and add overlay effect
function w3_open() {
    if (mySidebar.style.display === 'block') {
        mySidebar.style.display = 'none';
        overlayBg.style.display = "none";
    } else {
        mySidebar.style.display = 'block';
        overlayBg.style.display = "block";
    }
}

// Close the sidebar with the close button
function w3_close() {
    mySidebar.style.display = "none";
    overlayBg.style.display = "none";
}
</script>

</body>
</html>
