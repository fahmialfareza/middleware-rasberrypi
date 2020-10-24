$(document).ready(function () {

    let rv = new RegisterValidator();

    $('#btn-add-things').click(function () { window.location.href = '/register'; });
    $('#btn-account').click(function () { window.location.href = '/account'; });
    $('#btn-things').click(function () { window.location.href = '/things'; });
    $('#btn-logout').click(function () { attemptLogout(); });

    attemptLogout = function () {
        let that = this;
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
    }

    showLockedAlert = function (msg) {
        $('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
        $('.modal-alert .modal-header h4').text('Success!');
        $('.modal-alert .modal-body p').html(msg);
        $('.modal-alert').modal('show');
        $('.modal-alert button').click(function () { window.location.href = '/dashboard'; })
        setTimeout(function () { window.location.href = '/dashboard'; }, 3000);
    }

    $('#register-form').ajaxForm({
        beforeSubmit: function (formData, jqForm, options) {
            return rv.validateForm();
        },
        success: function (responseText, status, xhr, $form) {
            if (status == 'success') showLockedAlert('Your things has been registered.')
        },
        error: function (err) {
            if (err.responseText == 'things-name-taken') {
                rv.showInvalidName();
            }
        }
    });

    $('#name-tf').focus();

    // customize the account settings form //
    $('#register-form h2').text('Things Registration');
    $('#register-form #sub').text('Register your things.');
    $('#head-collapse').remove();
    $('#id-lb').remove();
    $('#id-tf').remove();
    $('#pwd-lb').remove();
    $('#pwd-tf').remove();
    $('#register-form-btn1').html('Cancel');
    $('#register-form-btn2').html('Submit');
    $('#register-form-btn2').addClass('btn-primary');
    $('#register-form-btn3').hide();

    // setup the alert that displays when an account is successfully created //
    $('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
    $('.modal-alert .modal-header h4').text('Account Created!');
    $('.modal-alert .modal-body p').html('Your thing has been registered.</br>Click OK to return to the things list page.');

    // redirect to homepage when cancel button is clicked //
    $('#register-form-btn1').click(function () { window.location.href = '/things'; });
    // redirect to account
    $('#btn-account').click(function () { window.location.href = '/account'; });
    // redirect to homepage on new account creation, add short delay so user can read alert window //
    $('.modal-alert #ok').click(function () { setTimeout(function () { window.location.href = '/things'; }, 300) });

    // remove unneeded nav button
    $('#btn-print').remove()
    $('#btn-sysutils').remove()
    $('#btn-dashboard').remove()

    // active navbar
    $('#btn-add-things').addClass('active')
})