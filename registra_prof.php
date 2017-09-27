<?php
/* Registra professor da solicitação solicita_prof*/
require 'db.php';
function validaCPF($cpf = null) {
        echo $cpf;
	// Verifica se um número foi informado
	if(empty($cpf)) {
		return false;
	}

	// Elimina possivel mascara
	$cpf = ereg_replace('[^0-9]', '', $cpf);
	$cpf = str_pad($cpf, 11, '0', STR_PAD_LEFT);
	
	// Verifica se o numero de digitos informados é igual a 11 
	if (strlen($cpf) != 11) {
		return false;
	}
	// Verifica se nenhuma das sequências invalidas abaixo 
	// foi digitada. Caso afirmativo, retorna falso
	else if ($cpf == '00000000000' || 
		$cpf == '11111111111' || 
		$cpf == '22222222222' || 
		$cpf == '33333333333' || 
		$cpf == '44444444444' || 
		$cpf == '55555555555' || 
		$cpf == '66666666666' || 
		$cpf == '77777777777' || 
		$cpf == '88888888888' || 
		$cpf == '99999999999') {
		return false;
	 // Calcula os digitos verificadores para verificar se o
	 // CPF é válido
	 } else {   
		
		for ($t = 9; $t < 11; $t++) {
			
			for ($d = 0, $c = 0; $c < $t; $c++) {
				$d += $cpf{$c} * (($t + 1) - $c);
			}
			$d = ((10 * $d) % 11) % 10;
			if ($cpf{$c} != $d) {
				return false;
			}
		}

		return true;
	}
}

function verifica_imagem()
{
    if(isset($_FILES['comprovante_prof']))
    {
        $allowed=array('image/png');
        if(in_array($_FILES['comprovante_prof']['type'],$allowed))
        {
            print "uploading";
            if(move_uploaded_file($_FILES['comprovante_prof']['tmp_name'], "images/{$_FILES['upload']['name']}"))
            {
                echo "Arquivo enviado!";
            }
            
            $image="{$_FILES['upload']['name']}";
        }
    }
    else
        print "falha";
    return $image;
}
$_SESSION['email_institucional'] = $_POST['email_institucional'];
$_SESSION['nome_completo'] = $_POST['nome_completo'];

// Escape all $_POST variables to protect against SQL injections
$nome_completo = $mysqli->escape_string($_POST['nome_completo']);
$email_institucional = $mysqli->escape_string($_POST['email_institucional']);
$cpf = $mysqli->escape_string($_POST['cpf']);
#$arquivo = $_POST['comprovante_prof'];
#$avatar_path = $mysqli->real_escape_string('images/'.$_FILES[$arquivo]['name']);

#$allowed =  array('pdf','png' ,'jpg');
#$ext = pathinfo($arquivo, PATHINFO_EXTENSION);
#$email = $_SESSION['email'];
// Check if user with that email already exists
$result = $mysqli->query("SELECT * FROM professores WHERE email_institucional='$email_institucional'") or die($mysqli->error());
$result_cpf = $mysqli->query("SELECT * FROM professores WHERE cpf='$cpf'") or die($mysqli->error());
// We know user email exists if the rows returned are more than 0
if ( $result->num_rows > 0 ) {
    
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
{ // Email doesn't already exist in a database, proceed...
    
            #$arquivo = verifica_imagem();
            $res2 = $mysqli->query("SELECT id FROM users WHERE email='$email'") or die($mysqli->error());
            $row = $res2->fetch_object();
            $id_us = $row->id;

            $sql_prof = "INSERT INTO professores (email_institucional, id_usuario, nome_completo, cpf)" 
                    . "VALUES ('$email_institucional', '$id_us', '$nome_completo', '$cpf')";  

            // Add user to the database
            if ( $mysqli->query($sql_prof)) 
            {
                $_SESSION['message'] = "Sua solicitação foi enviada com sucesso. Aguarde o contato!";
                header("location: profile.php");
            }
            else 
            {
                $_SESSION['message'] = 'Erro ao cadastrar no banco de dados!';
                header("location: error.php");
            }    
}
