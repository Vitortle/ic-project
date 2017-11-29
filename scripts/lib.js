		<link rel="stylesheet" type="text/css" href="flexsimweb/dragresize/dragresize.css">	
		<link rel="stylesheet" type="text/css" href="flexsimweb/bootstrap/css/bootstrap.min.css">
		<link rel="stylesheet" href="flexsimweb/jquery/jQWidgets/jqx.base.css" type="text/css" />
		<link rel="stylesheet" href="flexsimweb/jquery/jQWidgets/jqx.bootstrap.css" type="text/css" />
		<link rel="stylesheet" type="text/css" href="flexsimweb/default.css" />
		
		<script type="text/javascript">
			consoleSave = console;
			instanceName = '1';
			instanceNum = 1;
			viewIndices = [];
		</script>
		<script src="flexsimweb/jquery/jquery.min.js"></script>
		<script type="text/javascript" src="flexsimweb/bootstrap/js/bootstrap.min.js"></script>	
		<script type="text/javascript" src="flexsimweb/common.js"></script>
		<script type="text/javascript" src="flexsimweb/dragresize/dragresize.js"></script>
		<script type="text/javascript" src="flexsimweb/dragresize/dragresizepage.js"></script>
		
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxcore.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxribbon.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxwindow.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxlayout.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxmenu.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxdockinglayout.js"></script>  <!--WINDOWING-->
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxdata.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxscrollbar.js"></script>
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxbuttons.js"></script> <!--GLOBAL TABLES-->
		<script type="text/javascript" src="flexsimweb/jquery/jQWidgets/jqxdatatable.js"></script> <!--GLOBAL TABLES-->
		<script type="text/javascript" src="flexsimweb/server/YUVCanvas.js"></script>
		<script type="text/javascript" src="flexsimweb/server/Decoder.js"></script>
		<script type="text/javascript" src="flexsimweb/server/Player.js"></script>
		<script type="text/javascript" src="flexsimweb/server/socket.io.js"></script>
		
		
		<script type="text/javascript">
			//flexscript inserts something like this here:
			//var baseQuery="webserver.dll?queryinstance=my%20model&instancenum=1&id=1";
			var baseQuery="?queryinstance=1&instancenum=1&id=2";

		</script>
		
		<script type="text/javascript">
			//Construct the window layout
			var layout = [ { type: 'layoutGroup', orientation: 'horizontal', width: '100%', height: '100%', items: [{ type: 'layoutGroup', orientation: 'horizontal', width: '100%', height: '100%', items: [{ type: 'layoutGroup', orientation: 'vertical', width: '16%', height: '-129%', items: [{ type: 'documentGroup', height: '100%', width: '16%', items: [ ]}  ]}, { type: 'layoutGroup', orientation: 'vertical', width: '85%', height: '-458%', items: [{ type: 'layoutGroup', orientation: 'horizontal', width: '84%', height: '100%', items: [{ type: 'documentGroup', height: '100%', width: '55%', items: [{ type: 'documentPanel', title: '3D View - model', allowClose: true, contentContainer: '3DPanel1', selected: true } ]} , { type: 'documentGroup', height: '100%', width: '45%', items: [{ type: 'documentPanel', title: 'User Manual', allowClose: true, contentContainer: 'HelpManualPanel2', selected: true } ]}  ]} ]} ]} ]}];
			$(document).ready(function () {
				//Create jqWidgets docking layout
				var height = $(window).height() - $('#dockingLayout').offset().top;
				$('#dockingLayout').jqxDockingLayout({ width: '100%', height: height, theme: 'bootstrap', layout: layout, contextMenu: true });
				
				//Events
				$('#dockingLayout').on('resize', function (event) {
					// console.log("resize");
					resizeViews();
				});
				$('#dockingLayout').on('dock', function (event) {
					// console.log("dock");
					resizeViews();
				});
				
				var contextMenu = $("#3DMenu").jqxMenu({ width: '180px', height: '110px', autoOpenPopup: false, mode: 'popup', theme: 'bootstrap'}); 
				$('.menuButton').on("click", function(event) {
					event.preventDefault();
					var scrollTop = $(window).scrollTop();
                    var scrollLeft = $(window).scrollLeft();
                    contextMenu.data("screenshot", $(this).data("screenshot"));
                    contextMenu.jqxMenu('open', parseInt(event.clientX) + 5 + scrollLeft, parseInt(event.clientY) + 5 + scrollTop);
                    return false;
				});
				
				
			});
		</script>