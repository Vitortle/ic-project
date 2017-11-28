<html>

<head>
<title>View Records</title>
</head>

<body>
	    Entre com nome do curso
	    <form  method="post" action="search_curso.php?go"  id="searchform"> 
	      <input  type="text" name="name" style="color: black; width:200px; height: 35px"> 
	      <input  type="submit" name="submit_curso" value="Procurar" style="color: black; width:200px; height: 35px"> 
	    </form>
<?php
include 'css/css.html';
require 'db.php';

    $result = $mysqli->query("SELECT * FROM cursos") or die($mysqli->error());
    $result_prof = $mysqli->query("SELECT * FROM professores") or die($mysqli->error());

    echo "<table border='1' cellpadding='1' align='center' cellspacing='1' width='4'>";
    echo "<tr> <th>ID</th> <th>Nome</th> <th>Descrição</th> <th>Carga Horária</th> <th>ID do criador</th> <th>ID do Responsável</th> <th></th> <th></th> <th></th></tr>";

    while($row = mysqli_fetch_array( $result )) 
    {        
        echo "<tr>";
        echo '<td>' . $row['idcurso'] . '</td>';
        echo '<td>' . $row['nome_curso'] . '</td>';
        echo '<td>' . $row['descricao'] . '</td>';
        echo '<td>' . $row['carga_horaria'] . '</td>';    
        echo '<td>' . $row['id_criador'] . '</td>';
        echo '<td>' . $row['id_responsavel'] . '</td>';                
        echo '<td><a href="editar_curso.php?id=' . $row['idcurso'] . '">Editar</a></td>';
        echo "<td><a href='deletar_curso.php?id=" . $row['idcurso'] . "' onclick=\"return confirm('Tem certeza que deseja deletar esse registro?');\">Deletar</a></td>";    
        echo '<td><a href="ver_mais.php?id=' . $row['idcurso'] . '">Mais informações</a></td>';
        echo "</tr>";
    }
    echo "</table>";
    
?>               
</body>
</html>