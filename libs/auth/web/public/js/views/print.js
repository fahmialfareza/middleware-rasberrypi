$(document).ready(function () {

    // modal show errors
    let showErrors = function (a) {
		$('.modal-form-errors .modal-body p').text('Please correct the following problems :');
		let ul = $('.modal-form-errors .modal-body ul');
		ul.empty();
		for (let i = 0; i < a.length; i++) ul.append('<li>' + a[i] + '</li>');
		this.$('.modal-form-errors').modal('show');
	}

    //submit form from modal add account
    $('#modal-account-form').ajaxForm({
        success: function (responseText, status, xhr, $form) {
			if (status == 'success') $(location).attr('href', '/print')
		},
		error: function (err) {
			if (err.responseText == 'email-taken') {
				showErrors(['That email address is already in use.'])
			} else if (err.responseText == 'username-taken') {
                showErrors(['That username is already in use.'])
			}
		}
    })

    // modal show edit account
    $('#account-table').on('click', '.edit', function () {
        var username = $(this).data('username');
        var email = $(this).data('email');
        var name = $(this).data('name');
        var password = $(this).data('password');
        $('#EditModal').modal('show');
        $('.username').val(username);
        $('.email').val(email);
        $('.name').val(name);
    });

    // modal show delete account
    $('#account-table').on('click', '.delete', function () {
        var username = $(this).data('username');
        $('#DeleteModal').modal('show');
        $('#textDelete').html(' Are you sure want to DELETE ' + username + '?')
        $('.username').val(username);
    });

    // modal show approve account
    $('#account-table').on('click', '.approve', function () {
        var username = $(this).data('username');
        $('#ApproveModal').modal('show');
        $('#textApproved').html('Are you sure want to APPROVE ' + username + '?')
        $('.username').val(username);
    });

    // modal show decline account
    $('#account-table').on('click', '.decline', function () {
        var username = $(this).data('username');
        $('#DeclineModal').modal('show');
        $('#textDecline').html('Are you sure want to DECLINE ' + username + '?')
        $('.username').val(username);
    });
    
    // show entries number datatable
    $('#account-table').DataTable({
        "lengthMenu": [[5, 15, 25, 50, -1], [5, 15, 25, 50, "All"]]
    });
    $('#things-table').DataTable({
        "lengthMenu": [[5, 15, 25, 50, -1], [5, 15, 25, 50, "All"]]
    });

    // delete unnecessary buttons 
    $('#btn-things').remove()
    $('#btn-add-things').remove()
    $('#btn-dashboard').remove()
    
    $('#btn-print').addClass('active')

    // actions button
    $('#btn-account').click(function () { window.location.href = '/account'; });
    $('#btn-print').click(function () { window.location.href = '/print'; });
    $('#btn-sysutils').click(function () { window.location.href = '/status'; });
    $('#btn-logout').click(function () { 
		$.ajax({
			url: '/logout',
			type: 'POST',
			data: { logout: true },
			success: function (data) {
                $('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
                $('.modal-alert .modal-header h4').text('Success!');
                $('.modal-alert .modal-body p').html('You are now logged out.<br>Redirecting you back to the homepage.');
                $('.modal-alert').modal('show');
                $('.modal-alert button').click(function () { window.location.href = '/'; })
                setTimeout(function () { window.location.href = '/'; }, 3000);
			},
			error: function (jqXHR) {
				console.log(jqXHR.responseText + ' :: ' + jqXHR.statusText);
			}
		});
    });

});