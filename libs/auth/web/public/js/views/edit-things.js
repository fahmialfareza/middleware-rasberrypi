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
        $('.modal-alert button').click(function () { window.location.href = '/things'; })
        setTimeout(function () { window.location.href = '/things'; }, 3000);
    }

    $('#register-form').ajaxForm({
        beforeSubmit: function (formData, jqForm, options) {
            if (rv.validateForm() == false) {
                return false;
            } else {
                // push the disabled username field onto the form data array //
                formData.push({ name: 'things_id', value: $('#id-tf').val() })
                return true;
            }
        },
        success: function (responseText, status, xhr, $form) {
            if (status == 'success') showLockedAlert('Your things has been updated.');
        },
        error: function (err) {
            if (err.responseText == 'things-name-taken') {
                rv.showInvalidName();
            }
        }
    });

    // confirm things deletion //
    $('#register-form-btn3').click(function () { $('.modal-confirm').modal('show') });
    $('#register-form-btn1').click(function () { window.location.href = '/things'; });
    // handle things deletion //
    $('.modal-confirm .submit').click(function () { deleteThings(); });
    
    deleteThings = function () {
        $('.modal-confirm').modal('hide');
        let that = this;
        let id = document.getElementById('id-tf').value
        $.ajax({
            url: '/delete?id=' + id,
            type: 'POST',
            success: function (data) {
                showLockedAlert('Your things has been deleted.<br>Redirecting you back to the things page.');
            },
            error: function (jqXHR) {
                console.log(jqXHR.responseText + ' :: ' + jqXHR.statusText);
            }
        });
    }

    // customize the account settings form //
    $('#register-form h2').text('Things Setting');
    $('#register-form #sub').text('Here are the current settings for your things.');
    $('#id-tf').attr('readonly', true);
    $('#pwd-tf').attr('readonly', true);
    $('#name-tf').attr('readonly', true);
    $('#register-form-btn1').html('Cancel');
    $('#register-form-btn2').html('Update');
    $('#register-form-btn2').addClass('btn-primary');
    $('#register-form-btn3').html('Delete');
    $('#register-form-btn3').removeClass('btn-outline-dark');
    $('#register-form-btn3').addClass('btn-danger');

    // setup the confirm window that displays when the user chooses to delete their account //
    $('.modal-confirm').modal({ show: false, keyboard: true, backdrop: true });
    $('.modal-confirm .modal-header h4').text('Delete Things');
    $('.modal-confirm .modal-body p').html('Are you sure you want to delete your things?');
    $('.modal-confirm .cancel').html('Cancel');
    $('.modal-confirm .submit').html('Delete');
    $('.modal-confirm .submit').addClass('btn-danger');

    $('#btn-print').remove()
    $('#btn-dashboard').remove()
    $('#btn-sysutils').remove()
    $('#btn-print').remove()
})