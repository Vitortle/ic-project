<?php
/* Solicita ganhar acesso como professor */
session_start();
    $first_name = $_SESSION['first_name'];
    $last_name = $_SESSION['last_name'];
    $email = $_SESSION['email'];
    $active = $_SESSION['active'];        
    #$comprovante_prof = $_FILES['comprovante_prof']['name'];

if (isset($_POST['solicita_prof'])) { //user registering
        
        require 'registra_prof.php';
        
    }   
?>



<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Professor</title>
  <?php include 'css/css.html'; ?>

    <script type=text/javascript src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.js"></script>
    <script type=text/javascript src="https://cdnjs.cloudflare.com/ajax/libs/jquery.maskedinput/1.4.1/jquery.maskedinput.js"></script>   
    <script> <!-- Mascara do CPF -->
    $(document).ready(function($){
        $('#cpf').mask("999.999.999-99", {placeholder: "### ### ### ##"});
        }); 

    </script>
</head>
<body>
    
    <div class="form">
        <div id="signup">            
        <h1>Solicitar acesso como Professor</h1>
        <h3><FONT COLOR="white"> Olá <?= $first_name.' '.$last_name ?>. Para solicitar acesso como professor basta completar os campos 
            abaixo e esperar o contato de nossa equipe.</FONT></h3>
          
        <form name="form_solicita_prof" action="solicita_prof.php" method="post" enctype="multipart/form-data" autocomplete="off">
                      
            <div class="field-wrap">   
                <div style="color:rgba(255, 255, 255, 0.5);font-size: 17px;">
                Confirme seu nome completo
                </div>              
              <input type="text"required autocomplete="off" name='nome_completo' value="<?php echo "$first_name $last_name" ?>"/>
            </div>            

            <div class="field-wrap">
            <div style="color:rgba(255, 255, 255, 0.5);font-size: 17px;">
                Confirme seu email de contato
            </div>
            <input type="email"required autocomplete="off" name='email_institucional' value="<?php echo "$email" ?>"/>
            </div>
            
            <div class="field-wrap">
            <div style="color:rgba(255, 255, 255, 0.5); font-size: 17px;">
                Digite seu CPF
            </div>            
            <input type="text"  name='cpf' id='cpf'/>            
            </div>
          
            <label>Selecione sua foto: </label>
            <input type="file" name="comprovante_prof" accept="image/*" required /><br>            
        <button type="submit" class="button button-block" name="solicita_prof" />Solicitar acesso</button>
        
        </form>        
        </div>                    
    </div>
</body>
</html>
