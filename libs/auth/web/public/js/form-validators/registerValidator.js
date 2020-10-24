
function RegisterValidator() {
    // build array maps of the form inputs & control groups //

    this.formFields = [$('#name-tf'), $('#role-tf'), $('#desc-tf')];
    this.controlGroups = [$('#name-cg'), $('#role-cg'), $('#desc-cg')];

    // bind the form-error modal window to this controller to display any errors //

    this.alert = $('.modal-form-errors');
    this.alert.modal({ show: false, keyboard: true, backdrop: true });

    this.validateThingsName = function (s) {
        return s.length >= 5;
    }

    this.validateRole = function (s) {
        if (s != null) {
            return true;
        } else {
            return false;
        }
    }

    this.validateDescription = function (e) {
        return e.length >= 6;
    }

    this.showErrors = function (a) {
        $('.modal-form-errors .modal-body p').text('Please correct the following problems :');
        let ul = $('.modal-form-errors .modal-body ul');
        ul.empty();
        for (let i = 0; i < a.length; i++) ul.append('<li>' + a[i] + '</li>');
        this.alert.modal('show');
    }
}

RegisterValidator.prototype.showInvalidName = function () {
    this.controlGroups[0].addClass('error');
    this.showErrors(['That things name is already in use.']);
}

RegisterValidator.prototype.validateForm = function () {
    let e = [];
    for (let i = 0; i < this.controlGroups.length; i++) this.controlGroups[i].removeClass('error');
    if (this.validateThingsName(this.formFields[0].val()) == false) {
        this.controlGroups[0].addClass('error'); e.push('Please Enter Your Things Name');
    }
    if (this.validateRole(this.formFields[1].val()) == false) {
        this.controlGroups[1].addClass('error'); e.push('Please Enter A Valid Role');
    }
    if (this.validateDescription(this.formFields[2].val()) == false) {
        this.controlGroups[2].addClass('error'); e.push('Please Enter A Description Of Your Things');
    }
    if (e.length) this.showErrors(e);
    return e.length === 0;
}
