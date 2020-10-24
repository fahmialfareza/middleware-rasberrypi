$(document).ready(function () {

    let av = new AccountValidator();

    $('#account-form').ajaxForm({
        beforeSubmit: function (formData, jqForm, options) {
            if (av.validateForm() == false) {
                return false;
            } else {
                // push the disabled username field onto the form data array //
                return true;
            }
        },
        success: function (responseText, status, xhr, $form) {
            if (status == 'success') onUpdateSuccess();
        },
        error: function (e) {
            if (e.responseText == 'email-taken') {
                av.showInvalidEmail();
            } else if (e.responseText == 'username-taken') {
                av.showInvalidUserName();
            }
        }
    });
    // nav active
    $('#btn-account').addClass('active')

    //remove nav
    if ($('#admin').val() == 1) {
        $('#btn-add-things').remove()
        $('#btn-things').remove()
        $('#btn-dashboard').remove()
        $('#btn-print').click(function () { window.location.href = '/print'; });
        $('#btn-sysutils').click(function () { window.location.href = '/status'; });
    } else {
        $('#btn-print').remove()
        $('#btn-sysutils').remove()
        $('#btn-dashboard').remove()
        $('#btn-things').click(function () { window.location.href = '/things'; });
        $('#btn-add-things').click(function () { window.location.href = '/register'; });
    }

    $('#account-form-btn1').html('Delete');
    $('#account-form-btn1').removeClass('btn-outline-dark');
    $('#account-form-btn1').addClass('btn-danger');
    $('#account-form-btn2').html('Update');

    $('.modal-confirm').modal({ show: false, keyboard: true, backdrop: true });
    $('.modal-confirm .modal-header h4').text('Delete Account');
    $('.modal-confirm .modal-body p').html('Are you sure you want to delete your account?');
    $('.modal-confirm .cancel').html('Cancel');
    $('.modal-confirm .submit').html('Delete');
    $('.modal-confirm .submit').addClass('btn-danger');

    // confirm account deletion //
    $('#account-form-btn1').click(function () { $('.modal-confirm').modal('show') });
    // handle account deletion //
    $('.modal-confirm .submit').click(function () { deleteAccount(); });

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
	    
    deleteAccount = function () {
		$('.modal-confirm').modal('hide');
		$.ajax({
			url: '/delete',
			type: 'POST',
			success: function (data) {
				showLockedAlert('Your account has been deleted.<br>Redirecting you back to the homepage.');
			},
			error: function (jqXHR) {
				console.log(jqXHR.responseText + ' :: ' + jqXHR.statusText);
			}
		});
    }

    showLockedAlert = function (msg) {
		$('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
		$('.modal-alert .modal-header h4').text('Success!');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').click(function () { window.location.href = '/'; })
		setTimeout(function () { window.location.href = '/'; }, 3000);
    }
    
    onUpdateSuccess = function () {
        $('.modal-alert').modal({ show: false, keyboard: true, backdrop: true });
        $('.modal-alert .modal-header h4').text('Success!');
        $('.modal-alert .modal-body p').html('Your account has been updated.');
        $('.modal-alert').modal('show');
        $('.modal-alert button').click(function () { window.location.href = '/account'; })
        setTimeout(function () { window.location.href = '/account'; }, 3000);
    }
})