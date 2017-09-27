<?php 
    require 'db.php';
        if(isset($_POST['submit'])){ 
            if(isset($_GET['go']))
            { 
                if(preg_match("/^[  a-zA-Z]+/", $_POST['name']))
                { 
                    $name=$_POST['name'];                 
                    //-run  the query against the mysql query function 
                    $result = $mysqli->query("SELECT  id, first_name, last_name FROM users WHERE first_name LIKE '%" . $name .  "%' OR last_name LIKE '%" . $name ."%'") or die($mysqli->error());  

                    //-create  while loop and loop through result set 
                    while($row=mysqli_fetch_array($result))
                    { 
                        $FirstName=$row['first_name']; 
                        $LastName=$row['last_name']; 
                        $ID=$row['id']; 
                        //-display the result of the array 
                        echo "<ul>\n"; 
                        echo "<li>" . "<a  href=\"editar_usuarios.php?id=$ID\">"   .$FirstName . " " . $LastName .  "</a></li>\n"; 
                        echo "</ul>"; 
                    } 
                } 
            else{ 
            echo  "<p>Please enter a search query</p>"; 
            } 
            } 
        } 
        
?> 