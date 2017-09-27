<?php
function editar_professor($tipo)
{
    
    if($tipo != 2)
    {
        return 0;
    }
    else
    {
        
        $id = $_GET['id'];

        $result = $mysqli->query("SELECT * FROM professores WHERE id_usuario=$id") or die($mysqli->error());  

        $row = mysqli_fetch_array($result);        
        

        // check that the 'id' matches up with a row in the databse

        if($row)

        {
            $email_institucional = $row['email_institucional'];
            $nome_completo = $row['nome_completo'];
            $cpf = $row['cpf'];                        
        
            echo "$email";

        }
        
    }
}


function renderForm($id, $firstname, $lastname, $email, $active, $error, $tipo)
{
    ?>
    <html>
    <head>
    <title>Editar Usuário</title>
    </head>
    <body>

    <?php
    if ($error != '')
    {
        echo '<div style="padding:4px; border:1px solid red; color:red;">'.$error.'</div>';
    }

    ?>

    <form action="" method="post">
    <input type="hidden" name="id" value="<?php echo $id; ?>"/>
    <div>
    <p><strong>ID:</strong> <?php echo $id; ?></p>
    <strong>Nome: *</strong> <input type="text" name="firstname" value="<?php echo $firstname; ?>"/><br/>
    <strong>Sobrenome: *</strong> <input type="text" name="lastname" value="<?php echo $lastname; ?>"/><br/>
    <strong>Email: *</strong> <input type="text" name="email" value="<?php echo $email; ?>"/><br/>
    <?php   
    
    if($active == 1)
    {
        echo '<strong>Conta já está confirmada.';
    }
    else
    {
        echo '<strongConta não confirmada. </strong>'; 
        ?><strong>Ativar conta: *</strong> <input type="text" name="active" value=""/><br/><?php
    }
    #$prof=editar_professor($tipo);
    ?>
    
    <p>* Obrigatório</p>

    <input type="submit" name="submit" value="Enviar">
    </div>
    </form>
    </body>
</html>

    <?php

}

require 'db.php';

if (isset($_POST['submit']))
{

    if (is_numeric($_POST['id']))
    {
        $id = $_POST['id'];
        $firstname = $mysqli->real_escape_string(htmlspecialchars($_POST['firstname']));
        $lastname = $mysqli->real_escape_string(htmlspecialchars($_POST['lastname']));
        $email = $mysqli->real_escape_string(htmlspecialchars($_POST['email']));
        $active = (int) $mysqli->real_escape_string($_POST['active']);
        $tipo = $mysqli->real_escape_string($_POST['tipo']);
        if ($firstname == '' || $lastname == '' || $email == '')
        {            
            $error = 'ERROR: Please fill in all required fields!';
            renderForm($id, $firstname, $lastname, $email, $active, $error, $tipo);
        }
        else
        {
            $mysqli->query("UPDATE users SET first_name='$firstname', last_name='$lastname', email='$email', active='$active' WHERE id='$id'")
            or die($mysqli->error());
            header("Location: ver_usuarios.php");
        }
    }
    else
    {
        echo 'Error!';
    }
}

else
{
    if (isset($_GET['id']) && is_numeric($_GET['id']) && $_GET['id'] > 0)
    {
        $id = $_GET['id'];
        $result = $mysqli->query("SELECT * FROM users WHERE id=$id") or die($mysqli->error());
        $result_prof = $mysqli->query("SELECT * FROM professores WHERE id_usuario=$id")
        or die($mysqli->error());
        $row = mysqli_fetch_array($result);        
        $row_prof = mysqli_fetch_array($result_prof);
        // check that the 'id' matches up with a row in the databse
        if($row)
        {
            $firstname = $row['first_name'];
            $lastname = $row['last_name'];
            $email = $row['email'];
            $active= $row['active'];
            $tipo = $row['tipo'];                 
        renderForm($id, $firstname, $lastname, $email, $active, '', $tipo);
        }
        else
        // if no match, display result
        {
        echo "No results!";
        }
    }
    else
    // if the 'id' in the URL isn't valid, or if there is no 'id' value, display an error
    {
        echo 'Error!';
    }
}

?>