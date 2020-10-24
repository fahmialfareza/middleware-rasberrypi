
$(document).ready(function () {

	let lv = new LoginValidator();

	// main login form //
	$('#login').ajaxForm({
		beforeSubmit: function (formData, jqForm, options) {
			if (lv.validateForm() == false) {
				return false;
			} else {
				return true;
			}
		},
		success: function (responseText, status, xhr, $form) {
			if (status == 'success') window.location.href = '/dashboard';
		},
		error: function (e) {
			console.log(e.responseText)
			if (e.responseText == 'not-approved') {
				lv.showInvalidApproved();
			} else if (e.responseText == 'user-not-found') {
				lv.showInvalidUser();
			} else{
				lv.showLoginError('Login Failure', 'Please check your username and/or password');
			}
			
		}
	});

	$("input:text:visible:first").focus();

	var ev = new EmailValidator();
});
