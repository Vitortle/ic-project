<?php 
    require 'db.php';
        if(isset($_POST['submit'])){ 
            if(isset($_GET['go']))
            { 
                if(preg_match("/^[  a-zA-Z]+/", $_POST['name']))
                { 
                    $name=$_POST['name'];                 
                    //-run  the query against the mysql query function 
                    $result = $mysqli->query("SELECT  idcurso, nome_curso, descricao FROM cursos WHERE nome_curso LIKE '%" . $name .  "%' OR descricao LIKE '%" . $name ."%'") or die($mysqli->error());  

                    //-create  while loop and loop through result set 
                    while($row=mysqli_fetch_array($result))
                    { 
                        $nome_curso=$row['nome_curso']; 
                        $descricao=$row['descricao']; 
                        $id=$row['idcurso']; 
                        //-display the result of the array 
                        echo "<ul>\n"; 
                        echo "<li>" . "<a  href=\"editar_curso.php?id=$id\">"   .$nome_curso . " " . $id .  "</a></li>\n"; 
                        echo "</ul>"; 
                    } 
                } 
            else{ 
            echo  "<p>Please enter a search query</p>"; 
            } 
            } 
        } 
        
?> 