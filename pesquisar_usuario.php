<?php 

require 'db.php';
?>

<html>

<head>
<title>View Records</title>
</head>

<body>

<?php
// Verifica se foi feita alguma busca
// Caso contrario, redireciona o visitante pra home
if (!isset($_GET['consulta'])) {
  header("Location: /");
  exit;
}
// Conecte-se ao MySQL antes desse ponto
// Salva o que foi buscado em uma variável
$busca = mysql_real_escape_string($_GET['consulta']);
// ============================================
// Registros por página
$por_pagina = 20;
// Monta a consulta MySQL para saber quantos registros serão encontrados
$condicoes = "('ativa' = 1) AND (('titulo' LIKE '%{$busca}%') OR ('%{$busca}%'))";
$sql = "SELECT COUNT(*) AS total FROM users WHERE {$condicoes}";
// Executa a consulta
$query = mysql_query($sql);
// Salva o valor da coluna 'total', do primeiro registro encontrado pela consulta
$total = mysql_result($query, 0, 'total');
// Calcula o máximo de paginas
$paginas =  (($total % $por_pagina) > 0) ? (int)($total / $por_pagina) + 1 : ($total / $por_pagina);
// ============================================
if (isset($_GET['pagina'])) {
  $pagina = (int)$_GET['pagina'];
} else {
  $pagina = 1;
}
$pagina = max(min($paginas, $pagina), 1);
$offset = ($pagina - 1) * $por_pagina;
// ============================================
// Monta outra consulta MySQL, agora a que fará a busca com paginação
$sql = "SELECT * FROM users WHERE {$condicoes} ORDER BY id DESC LIMIT {$offset}, {$por_pagina}";
// Executa a consulta
$query = mysql_query($sql);
// ============================================
// Começa a exibição dos resultados
echo "Resultados ".min($total, ($offset + 1))." - ".min($total, ($offset + $por_pagina))." de ".$total." resultados encontrados para '".$_GET['consulta']."'";
echo "<ul>";
while ($resultado = mysql_fetch_assoc($query)) {
  $titulo = $resultado['titulo'];
  $texto = $resultado['texto'];
  $link = '/noticia.php?id=' . $resultado['id'];
  
  echo "<li>";
    echo "<a href='{$link}'>";
      echo "<h3>{$titulo}</h3>"
      echo "<p>{$texto}</p>"
    echo "</a>";
  echo "</li>";
}
echo "</ul>";
// Links de paginação
// Começa a exibição dos paginadores
if ($total > 0) {
  for ($n = 1; $n <= $paginas; $n++) {
    echo "<a href='busca.php?consulta={$_GET['consulta']}&pagina={$n}'>{$n}</a>";
  }
}
</body>

</html>