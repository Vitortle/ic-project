<html>

<head>
<title>View Records</title>
</head>

<body>
	    Entre com nome ou sobrenome
	    <form  method="post" action="search_user.php?go"  id="searchform"> 
	      <input  type="text" name="name" style="color: black; width:200px; height: 35px"> 
	      <input  type="submit" name="submit_users" value="Procurar" style="color: black; width:200px; height: 35px"> 
	    </form> 
<?php
include 'css/css.html';
require 'db.php';
    $result = $mysqli->query("SELECT * FROM users") or die($mysqli->error());
    $result_prof = $mysqli->query("SELECT * FROM professores") or die($mysqli->error());

    echo "<table border='1' cellpadding='10'>";
    echo "<tr> <th>ID</th> <th>Nome</th> <th>Sobrenome</th> <th>Email</th> <th>Conta confirmada</th> <th>Tipo</th> <th></th> <th></th> <th></th></tr>";

    while($row = mysqli_fetch_array( $result )) 
    {
        #$row_prof = mysqli_fetch_array( $result_prof );
        echo "<tr>";
        echo '<td>' . $row['id'] . '</td>';
        echo '<td>' . $row['first_name'] . '</td>';
        echo '<td>' . $row['last_name'] . '</td>';
        echo '<td>' . $row['email'] . '</td>';    
        echo '<td>' . $row['active'] . '</td>';         
        if($row['tipo'] == 1) echo '<td>' . "Administrador" . '</td>';
        if($row['tipo'] == 2) echo '<td>' . "Professor" . '</td>';
        if($row['tipo'] == 3) echo '<td>' . "Aluno" . '</td>';   
        echo '<td><a href="editar_usuarios.php?id=' . $row['id'] . '">Editar</a></td>';
        echo "<td><a href='deletar_usuarios.php?id=" . $row['id'] . "' onclick=\"return confirm('Tem certeza que deseja deletar esse registro?');\">Deletar</a></td>";    
        echo '<td><a href="ver_mais.php?id=' . $row['id'] . '">Mais informações</a></td>';
        echo "</tr>";
    }
    echo "</table>";
    
?>
</body>
</html>