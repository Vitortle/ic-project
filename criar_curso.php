<?php
/* Solicita ganhar acesso como professor */
session_start();
if (isset($_POST['criar_curso'])) 
{        
    require 'registrar_curso.php';        
}   
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Criar curso</title>
    <?php include 'css/css.html'; ?>
</head>
<body>      
    <div class="form">
        <div id="signup">            
        <h1>Criar um curso</h1>
        <h3><FONT COLOR="white"> Para criar um curso basta completar os campos abaixo.</FONT></h3>
          
        <form name="form_criar_curso" action="criar_curso.php" method="post" enctype="multipart/form-data" autocomplete="off">
                      
            <div class="field-wrap">   
                <div style="color:rgba(255, 255, 255, 0.5);font-size: 17px;">
                    Nome do curso:
                </div>              
              <input type="text" required autocomplete="off" name='nome_curso'/>
            </div>            

            <div class="field-wrap">
                <div style="color:rgba(255, 255, 255, 0.5);font-size: 17px;">
                    Breve descrição do curso:
                </div>                
                <textarea name="descricao" required autocomplete="off" cols="20" rows="4"></textarea>                                             
            </div>   
            
            <div class="field-wrap">
                <div style="color:rgba(255, 255, 255, 0.5);font-size: 17px;">
                    Carga Horária:
                </div>        
            <input type="text" onkeypress='return event.charCode >= 48 && event.charCode <= 57' required autocomplete="off" name='carga_horaria'/>            
            </div>  
            <button type="submit" class="button button-block" name="criar_curso" />Criar curso</button>
        
        </form>        
        </div>                    
    </div>
</body>
</html>
