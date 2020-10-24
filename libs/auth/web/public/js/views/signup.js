$(document).ready(function () {

	let av = new AccountValidator();

	$('#account-form').ajaxForm({
		beforeSubmit: function (formData, jqForm, options) {
			return av.validateForm();
		},
		success: function (responseText, status, xhr, $form) {
			if (status == 'success') $('.modal-alert').modal('show');
		},
		error: function (err) {
			if (err.responseText == 'email-taken') {
				av.showInvalidEmail();
			} else if (err.responseText == 'username-taken') {
				av.showInvalidUserName();
			}
		}
	});

	$('#name-tf').focus();

	// customize the account signup form //
	$('#account-form h2').text('Signup');
	$('#account-form #sub').text('Please tell us a little about yourself');
	$('#account-form-btn1').html('Cancel');
	$('#account-form-btn2').html('Submit');
	$('#account-form-btn2').addClass('btn-primary');

	// setup the alert that displays when an account is successfully created //
	$('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
	$('.modal-alert .modal-header h4').text('Account Created!');
	$('.modal-alert .modal-body p').html('Your account has been created.</br>Please wait until the account is approved.');

	// redirect to homepage when cancel button is clicked //
	$('#account-form-btn1').click(function () { window.location.href = '/'; });

	// redirect to homepage on new account creation, add short delay so user can read alert window //
	$('.modal-alert #ok').click(function () { setTimeout(function () { window.location.href = '/'; }, 300) });
});