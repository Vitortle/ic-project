<?php
session_start();

?>

<html >
<head>
  <meta charset="UTF-8">
  <title>Administrador</title>
  <?php include 'css/css.html'; ?>
</head>

<body>
  <div class="form">

          <h1>Funcionalidades</h1>
          
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
          
          <a href="cria_user.php"><button class="button button-block" name="cria_usuario"/>Criar Usuário</button></a><br>                    
          <a href="edita_user.php"><button class="button button-block" name="cria_usuario"/>Editar Usuário</button></a><br>                    
          <a href="exclui_user.php"><button class="button button-block" name="cria_usuario"/>Excluir Usuário</button></a><br>                    
          <a href="profile.php"><button class="button button-block" name="logout"/>Voltar</button></a>                  
    </div>
    
<script src='http://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js'></script>
<script src="js/index.js"></script>

</body>
</html>
