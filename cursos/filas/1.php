<!DOCTYPE html>
<html>
<head>
<title>Template 2</title>
<!--[if IE]><script src="http://html5shiv.googlecode.com/svn/trunk/html5.js"></script><![endif]-->
<link href="/Sis/css/p.css" rel="stylesheet">
</head>
<?php

session_start();
require '../../db.php';

if ( $_SESSION['logged_in'] != 1 ) {
    $_SESSION['message'] = "You must log in before viewing your profile page!";
    header("location: error.php");    
}
else {    
    $first_name = $_SESSION['first_name'];
    $last_name = $_SESSION['last_name'];
    $email = $_SESSION['email'];
    $active = $_SESSION['active'];   
    $result = $mysqli->query("SELECT * FROM users WHERE email='$email'") or die($mysqli->error());
    $row = $result->fetch_object();
    $_SESSION['id'] = $row->id;
    $tipo = $row->tipo;
}

?>
<script src="/sis/scripts/player_video.js"
<meta charset="utf-8">
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
<script src="//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script>
<link rel="stylesheet" type="text/css" href="//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css">
<script src="flexsimweb/jquery/jQueryUI/jquery-ui.min.js"></script>
<link rel="stylesheet" type="text/css" href="flexsimweb/jquery/jQueryUI/jquery-ui.min.css">
<script src="flexsimweb/bootstrap/js/bootstrap.min.js"></script>
<link rel="stylesheet" type="text/css" href="//cdn.rawgit.com/noelboss/featherlight/1.7.0/release/featherlight.min.css" />
<script src="//cdn.rawgit.com/noelboss/featherlight/1.7.0/release/featherlight.min.js"></script>
<script src="//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script>
<link rel="stylesheet" type="text/css" href="//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" type="text/css" href="flexsimweb/bootstrap/css/bootstrap.min.css">
<link rel="stylesheet" type="text/css" href="flexsimweb/bootstrap/css/bootstrap-theme.min.css">
<link rel="stylesheet" type="text/css" href="flexsimweb/default.css">
<link rel="stylesheet" type="text/css" href="flexsimweb/featherlight/featherlight.min.css" />
<script src="/sis/flexsimweb/featherlight/featherlight.min.js"></script>
<link rel="apple-touch-icon" href="flexsimweb/images/logoSmall.png"/>
<script src="/sis/flexsimweb/jquery/jquery.min.js"></script>
<script src="/sis/scripts/simulation_functions.js"></script>

<body>            
    <div id="wrapper">
        <div id="headerwrap">
        <div id="header">
            <p style="font-size: 20px"><b>Curso básico sobre Teoria das filas</b> - Primeiras palavras</p>                        
        </div>                     
            <div id="profile">
                <div id="progresso">
                    Progresso: x%
                </div>
                <div id="foto">
                    <div class="col-xs-4 col-sm-8 top-panel-right">
                            <ul class="nav navbar-nav pull-right panel-menu">                   
                                <li class="dropdown">
                                    <a href="#" class="dropdown-toggle account" data-toggle="dropdown">
                                        <div class="avatar" width="100" height="39">
                                            <img src="../images/profile_pic" class="img-rounded" alt="avatar" style="width:100; height:39px;"/><b class="caret"></b>
                                        </div>
                                        <i class="fa fa-angle-down pull-right"></i>
                                        <div class="user-mini pull-right">
                                            <span class="welcome"></span>
                                            <span>Vitor Costa</span>
                                        </div>
                                    </a>
                                    <ul class="dropdown-menu" style="padding-right: 100px">
                                        <li>
                                            <a href="#">
                                            <i class="fa fa-user"></i>
                                            <span>Profile</span>
                                            </a>
                                        </li>
                                        <li>
                                            <a href="ajax/page_messages.html" class="ajax-link">
                                            <i class="fa fa-envelope"></i>
                                            <span>Mensagens</span>
                                        </a>
                                        </li>
                                            <li>
                                                <a href="ajax/gallery_simple.html" class="ajax-link">
                                                        <i class="fa fa-picture-o"></i>
                                                        <span>Albums</span>
                                                </a>
                                            </li>
                                            
                                            <li>
                                                <a href="#">
                                                        <i class="fa fa-cog"></i>
                                                        <span>Ajustes</span>
                                                </a>
                                            </li>
                                            <li>
                                                <a href="#">
                                                        <i class="fa fa-power-off"></i>
                                                        <span>Sair</span>
                                                </a>
                                            </li>
                                        </ul>
                                </li>
                                    </ul>
                    </div>
                </div>
            </div>
                
        </div>
 
        
        <div id="fullcontentwrap">
        <div id="fullcontent">
            <div id="p_col">
                <t1>Curso básico sobre teoria das filas</t1></br>
                <t2>Seja bem vindo(a)!</t2></br>

	<p> É com muita alegria que estamos iniciando nosso primeiro trabalho do projeto de pesquisa “Desenvolvimento de ferramentas de ensino de operações e produção com utilização de técnicas de simulação” coordenado pelos professores doutores Cristiano Henrique Antonelli da Veiga, Jean Carlos Domingos e Vérica Marconi Freitas de Paula. Também conta a participação do acadêmico Vitor Hugo Souza da Costa, bolsista do Programa Institucional de Iniciação Científica  PIBIC/FAPEMIG/UFU 2017.</p>                                               					                                    
            </div>
            <div id="s_col">
                <p>Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. Coluna da direita. </p>
       
            </div>
           </div>
        </div>
        <div id="footerwrap">
        <div id="footer">
            <div id="seta_esquerda">
                <img src="../images/setaesquerda2" alt="seta_esquerda" style="width:100; height:25px;"/>
            </div>
            <div id="seta_direita">
                <img src="../images/setadireita2" alt="seta_direita" style="width:100; height:25px;"/>
            </div>
        </div>
        </div>
    </div>
</body>
</html>
