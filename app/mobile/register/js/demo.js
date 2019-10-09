var Demo = (function () {

	function demoUpload() {
		var $uploadCrop;
		function readFile(input) {
			$('.filetype-holdr').hide();
			$('.uploadanother').show();
			if (input.files && input.files[0]) {
				var reader = new FileReader();
				reader.onload = function (e) {
					$('.upload-demo').addClass('ready');
					$uploadCrop.croppie('bind', {
						url: e.target.result
					}).then(function () {
						$('#loader').hide();
						$('.cropbtn').show();
						$('.continuebtn').hide();
					});
				}
				reader.readAsDataURL(input.files[0]);
			}
			else {
				swal("Sorry - you're browser doesn't support the FileReader API");
			}
		}

		$uploadCrop = $('#upload-demo').croppie({
			viewport: {
				width: 250,
				height: 250,
				//type: 'circle'
			},
			enableExif: true,
			showZoomer: false,
		});

		$('#upload').on('change', function () { $('#loader').show(); readFile(this); });
		$('.upload-result').on('click', function (ev) {
			$uploadCrop.croppie('result', {
				type: 'base64',
				size: 'viewport'
			}).then(function (resp) {
				$("#myImg").attr('src', resp);
				document.getElementById("image64").value = resp;
				$('.continuebtn').show();
			});
		});

	}


	function init() {
		demoUpload();
	}

	return {
		init: init
	};
})();
