$(document).ready(function () {

    let a = [];
    let user;
    $.ajax({
        url: '/api/things',
        dataType: 'json',
        error: function (request, error) {
            alert("Can't do because: " + error);
        },
        success: function (data) {
            user = data.user
            for (let i = 0; i < data.thing.length; i++) {
                a.push(data.thing[i])
            }
            handleView()
        }
    })

    function handleView() {
        if (a.length == 0) {
            $('#page-header').html('No Things Registered')
        } else {
            for (let i = 0; i < a.length; i++) {
                let topic
                if (a[i].topic) { topic = a[i].topic }
                else { topic = "Not Available" }
                $('.card-columns').append('<div style="width: 101%" class="card shadow-sm"><h5 class="card-header text-center bg-white"><a style="text-decoration:none" href="/things?id=' + a[i].things_id + '">' + a[i].things_name.toUpperCase() + '</a></h5><form class="card-body"><p> <a class="text-decoration-none dropdown-toggle btn btn-primary" data-toggle="collapse" href="#collapseExample' + i + '" role="button" aria-expanded="false" aria-controls="collapseExample">Security Information </a></p><div class="collapse" id="collapseExample' + i + '"><div class="form-group"> <label>Things ID</label><div class="textarea-container"><textarea id="dvc_id' + i + '" style="resize: none;" class="form-control" readonly>' + a[i].things_id + '</textarea><button onClick="copyText(\'dvc_id' + i + '\')" type="button" class="btn btn-sm btn-secondary">Copy</button></div></div><div class="form-group"> <label>Things Password</label><div class="textarea-container"><textarea id="dvc_pswd' + i + '" style="resize: none;" class="form-control" readonly>' + a[i].things_password + '</textarea><button onClick="copyText(\'dvc_pswd' + i + '\')" type="button" class="btn btn-sm btn-secondary">Copy</button></div></div></div><hr><div class="form-group"> <label>Role</label> <input class="form-control" type="text" value="' + a[i].role + '" readonly /></div><div class="form-group"> <label>Topic</label> <input class="form-control" type="text" value="' + topic + '" readonly /></div><div class="form-group"> <label>Description</label> <input class="form-control" type="text" value="' + a[i].description + '" readonly /></div></form><div class="card-footer text-center"> <small class="text-muted">Added ' + a[i].date + '</small></div></div>')
            }
        }
    }

    // copy text
    copyText = function (target) {
        var copyText = document.getElementById(target);
        copyText.select();
        document.execCommand("copy");
    }

    // remove unneeded nav button
    $('#btn-print').remove()
    $('#btn-sysutils').remove()
    $('#btn-dashboard').remove()

    // active navbar
    $('#btn-things').addClass('active')

    // handle button register things page
    $('#btn-add-things').click(function () { window.location.href = '/register'; });
    $('#btn-account').click(function () { window.location.href = '/account'; });
    $('#btn-things').click(function () { window.location.href = '/things'; });

    $('#btn-logout').click(function () { 
        $.ajax({
			url: '/logout',
			type: 'POST',
			data: { logout: true },
			success: function (data) {
				showLockedAlert('You are now logged out.<br>Redirecting you back to the homepage.');
			},
			error: function (jqXHR) {
				console.log(jqXHR.responseText + ' :: ' + jqXHR.statusText);
			}
		});
    });

    showLockedAlert = function (msg) {
		$('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
		$('.modal-alert .modal-header h4').text('Success!');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').click(function () { window.location.href = '/'; })
		setTimeout(function () { window.location.href = '/'; }, 3000);
	}
})