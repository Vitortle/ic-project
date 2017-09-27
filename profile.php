<?php

session_start();
require 'db.php';

if ( $_SESSION['logged_in'] != 1 ) {
    $_SESSION['message'] = "You must log in before viewing your profile page!";
    header("location: error.php");    
}
else {    
    $first_name = $_SESSION['first_name'];
    $last_name = $_SESSION['last_name'];
    $email = $_SESSION['email'];
    $active = $_SESSION['active'];   
    $result = $mysqli->query("SELECT * FROM users WHERE email='$email'") or die($mysqli->error());
    $row = $result->fetch_object();
    $_SESSION['id'] = $row->id;
    $tipo = $row->tipo;
}

?>
<!DOCTYPE html>
<html >
<head>
  <meta charset="UTF-8">
  <title>Bem vindo <?= $first_name.' '.$last_name?></title>
  <?php include 'css/css.html'; ?>    
</head>

<body>
  <div class="form">

          <h1>Bem vindo!</h1>
          
          <p>
          <?php 
     
          // Display message about account verification link only once
          if ( isset($_SESSION['message']) )
          {
              echo $_SESSION['message'];
              
              // Don't annoy the user with more messages upon page refresh
              unset( $_SESSION['message'] );
          }
          
          ?>
          </p>
          
          <?php
          
          // Keep reminding the user this account is not active, until they activate
          if (!$active){
              echo
              '<div class="info">
              Sua conta não está verificada, por favor confirme clicando no link enviado por email!            
              </div>';
          }          
          ?>
          
        <h2><?php echo $first_name.' '.$last_name?></h2>
        <p><?= $email ?></p>        
        <a href="criar_curso.php"><button class="button button-block" name="solicita_prof"/>Criar curso</button></a><br>                    
        <a href="solicita_prof.php"><button class="button button-block" name="solicita_prof"/>Sou Professor</button></a><br>                    
        <a href="logout.php"><button class="button button-block" name="logout"/>Sair</button></a>                  
    </div>
    
<script src='http://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js'></script>
<script src="js/index.js"></script>

</body>
</html>
