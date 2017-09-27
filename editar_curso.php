<?php

function renderForm($id, $nome, $descricao, $carga_horaria, $id_criador, $id_responsavel, $error)
{
    ?>
    <html>
    <head>
    <title>Editar Curso</title>
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
    <strong>Nome:</strong> <input type="text" name="nome" value="<?php echo $nome; ?>"/><br/>
    <strong>Descrição:</strong> <input type="text" name="descricao" value="<?php echo $descricao; ?>"/><br/>
    <strong>ID do criador:</strong> <?php echo $id_criador; ?><br/>
    <strong>Carga Horária:</strong> <?php echo $carga_horaria; ?><br/>
    <strong>ID do responsável:</strong> <input type="text" name="id_responsavel" value="<?php echo $id_responsavel; ?>"/><br/>        
    

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
        $nome = $mysqli->real_escape_string(htmlspecialchars($_POST['nome']));
        $descricao = $mysqli->real_escape_string(htmlspecialchars($_POST['descricao']));        
        $id_responsavel = $mysqli->real_escape_string(htmlspecialchars($_POST['id_responsavel']));
        
        if ($nome == '' || $descricao == '' || $id_responsavel == '')
        {            
            $error = 'ERROR: Por favor, complete todos os campos!';
            renderForm($id, $nome, $descricao, $carga_horaria, $id_criador, $id_responsavel, $error);
        }
        else
        {
            $mysqli->query("UPDATE cursos SET nome_curso='$nome', descricao='$descricao', id_responsavel='$id_responsavel' WHERE idcurso='$id'")
            or die($mysqli->error());
            header("Location: ver_curso.php");
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
        
        $result = $mysqli->query("SELECT * FROM cursos WHERE idcurso=$id") or die($mysqli->error());              

        $row = mysqli_fetch_array($result);        
        
        // check that the 'id' matches up with a row in the databse
        if($row)
        {
            $nome = $row['nome_curso'];
            $descricao = $row['descricao'];
            $carga_horaria = $row['carga_horaria'];
            $id_criador = $row['id_criador'];
            $id_responsavel = $row['id_responsavel'];            
        
            renderForm($id, $nome, $descricao, $carga_horaria, $id_criador, $id_responsavel, '');
        }

        else        
        {
            echo "No results!";
            echo $_GET['id'];
        }
    }
    else   
    {
        echo 'Error!';
    }
}
?>