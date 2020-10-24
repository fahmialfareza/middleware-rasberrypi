
function LoginValidator() {
	// bind a simple alert window to this controller to display any errors //
	this.loginErrors = $('.modal-alert');

	this.showErrors = function (a) {
		$('.modal-alert .modal-header h4').text('Whoops!');
		$('.modal-alert .modal-body').html(a);
		this.loginErrors.modal('show');
	}

	this.showLoginError = function (t, m) {
		$('.modal-alert .modal-header h4').text(t);
		$('.modal-alert .modal-body').html(m);
		this.loginErrors.modal('show');
	}
}

LoginValidator.prototype.showInvalidApproved = function () {
	this.showErrors(['This account has not been approved']);
}

LoginValidator.prototype.showInvalidUser = function () {
	this.showErrors(['This account is not yet registered, Please create account!']);
}

LoginValidator.prototype.validateForm = function () {
	if ($('#user-tf').val() == '') {
		this.showLoginError('Whoops!', 'Please enter a valid username');
		return false;
	} else if ($('#pass-tf').val() == '') {
		this.showLoginError('Whoops!', 'Please enter a valid password');
		return false;
	} else {
		return true;
	}
}