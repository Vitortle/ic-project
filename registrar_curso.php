<?php
require 'db.php';
session_start();

$nome_curso = $mysqli->escape_string($_POST['nome_curso']);
$descricao = $mysqli->escape_string($_POST['descricao']);
$carga_horaria = $mysqli->escape_string($_POST['carga_horaria']);
$id = $mysqli->escape_string($_SESSION['id']);
// Check if user with that email already exists
/*$result = $mysqli->query("SELECT * FROM curso WHERE email_institucional='$email_institucional'") or die($mysqli->error());
$result_cpf = $mysqli->query("SELECT * FROM professores WHERE cpf='$cpf'") or die($mysqli->error());
// We know user email exists if the rows returned are more than 0
if ($result->num_rows > 0) 
{
    
    $_SESSION['message'] = "Este email já existe na nossa base de dados.";
    header("location: error.php");        
}
else if ( $result_cpf->num_rows > 0 ) {    
    $_SESSION['message'] = "Este CPF já existe na nossa base de dados.";
    header("location: error.php");        
}
else if ( validaCPF($cpf)==false ) {    
    $_SESSION['message'] = "CPF incorreto.";
    header("location: error.php");  
}
else 
{*/ // Email doesn't already exist in a database, proceed...    

            $sql_prof = "INSERT INTO cursos (nome_curso, descricao, carga_horaria, id_criador)" 
                    . "VALUES ('$nome_curso', '$descricao', '$carga_horaria', '$id')";  
            
            // Add user to the database
            if ( $mysqli->query($sql_prof)) 
            {
                $_SESSION['message'] = "Curso cadastrado com sucesso!";
                header("location: profile.php");
            }
            else 
            {
                $_SESSION['message'] = 'Erro ao cadastrar o curso no banco de dados!';
                header("location: error.php");
            }   
//}

   