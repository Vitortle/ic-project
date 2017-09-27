<?php

function renderForm($first, $last, $error)
{
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
<head>
<title>New Record</title>
</head>

<body>
<?php
if ($error != '')
{
    echo '<div style="padding:4px; border:1px solid red; color:red;">'.$error.'</div>';
}

?>
<form action="" method="post">
<div>
    <strong>Nome: *</strong> <input type="text" name="first_name" value="<?php echo $first; ?>" /><br/>
    <strong>Sobrenome: *</strong> <input type="text" name="last_name" value="<?php echo $last; ?>" /><br/>
    <strong>Email: *</strong> <input type="text" name="last_name" value="<?php echo $last; ?>" /><br/>
    <strong>Tipo: *     Administrador <input type="radio" name="tipo" value="administrador" />
                        Professor <input type="radio" name="tipo" value="professor" />
                        Aluno <input type="radio" name="tipo" value="aluno" />
                        
    <p>* required</p>
    <input type="submit" name="submit" value="Submit">
</div>
</form>
</body>
</html>

<?php

}
require 'db.php';

if (isset($_POST['submit']))
{
    
    $first_name = $mysqli->real_escape_string(htmlspecialchars($_POST['first_name']));
    $last_name = $mysqli->real_escape_string(htmlspecialchars($_POST['last_name']));
    
    if ($first_name == '' || $last_name == '')
    {
        $error = 'ERROR: Please fill in all required fields!';
        renderForm($first_name, $last_name, $error);
    }
    else
    {
        $mysqli->query("INSERT users SET first_name='$first_name', last_name='$last_name'") or die(mysql_error());
        header("Location: ver_usuarios.php");
    }
}
else
{
renderForm('','','');
}
?>