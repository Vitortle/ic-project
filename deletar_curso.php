<?php
require 'db.php';

if (isset($_GET['id']) && is_numeric($_GET['id']))
{
    $id = $_GET['id'];
    $result = $mysqli->query("DELETE FROM cursos WHERE idcurso=$id") or die(mysql_error());

    header("Location: ver_curso.php");
}
else
{
    header("Location: ver_curso.php");
}
?>