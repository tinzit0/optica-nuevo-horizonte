(function (global) {
    const root = global.OpticaModules = global.OpticaModules || {};
    const ALLOWED_TYPES = Object.freeze(['application/pdf', 'image/jpeg', 'image/png']);
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    function validRut(value) {
        const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase();
        if (clean.length < 8) return false;
        let sum = 0;
        let multiplier = 2;
        for (let index = clean.length - 2; index >= 0; index -= 1) {
            sum += Number(clean[index]) * multiplier;
            multiplier = multiplier === 7 ? 2 : multiplier + 1;
        }
        const expected = 11 - (sum % 11);
        return (expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)) === clean.at(-1);
    }

    function fileError(file) {
        if (!file) return '';
        if (!ALLOWED_TYPES.includes(file.type)) return 'El archivo debe ser PDF, JPG o PNG.';
        if (file.size > MAX_FILE_SIZE) return 'El archivo supera el máximo de 10 MB.';
        return '';
    }

    function createController({ form, cart, onShippingChange }) {
        let currentStep = 1;
        let submitting = false;
        const panels = [...form.querySelectorAll('[data-checkout-step]')];
        const indicators = [...document.querySelectorAll('[data-step-indicator]')];
        const submitButton = form.querySelector('#checkout-submit');
        const status = form.querySelector('#checkout-status');
        const fileInput = form.querySelector('#prescription-file');
        const requiresPrescription = cart.some(item => Object.values(item.crystal_config || {}).some(option => option?.id === 'receta'));

        function showStep(step) {
            currentStep = Math.min(4, Math.max(1, step));
            panels.forEach(panel => { panel.hidden = Number(panel.dataset.checkoutStep) !== currentStep; });
            indicators.forEach(indicator => {
                const number = Number(indicator.dataset.stepIndicator);
                indicator.classList.toggle('active', number === currentStep);
                indicator.classList.toggle('done', number < currentStep);
            });
            panels.find(panel => Number(panel.dataset.checkoutStep) === currentStep)?.querySelector('h2')?.focus({ preventScroll: true });
            global.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function fieldMessage(field) {
            if (field.validity.valueMissing) return 'Este campo es obligatorio.';
            if (field.type === 'email' && field.validity.typeMismatch) return 'Ingresa un correo electrónico válido.';
            if (field.validity.tooShort) return `Ingresa al menos ${field.minLength} caracteres.`;
            if (field.name === 'rut' && !validRut(field.value)) return 'Ingresa un RUT válido.';
            return '';
        }

        function validateField(field) {
            const message = fieldMessage(field);
            const target = document.getElementById(`${field.id}-error`);
            field.setAttribute('aria-invalid', message ? 'true' : 'false');
            if (target) target.textContent = message;
            return !message;
        }

        function fieldsForStep(step) {
            const panel = panels.find(item => Number(item.dataset.checkoutStep) === step);
            return panel ? [...panel.querySelectorAll('input:not([type=radio]):not([type=file]), select')] : [];
        }

        function setFileState(message, error = false) {
            const state = form.querySelector('#prescription-state');
            state.textContent = message;
            state.className = `file-state ${error ? 'error' : 'success'}`;
            fileInput.setAttribute('aria-invalid', error ? 'true' : 'false');
        }

        function showError(message) { status.textContent = message || ''; }

        function validateStep(step = currentStep) {
            if (step === 1 && !cart.length) {
                showError('Tu bolsa está vacía. Agrega un producto antes de continuar.');
                return false;
            }
            if (step === 4) {
                const error = fileError(fileInput.files[0]);
                if (error || (requiresPrescription && !fileInput.files[0])) {
                    setFileState(error || 'Debes adjuntar la receta para los cristales seleccionados.', true);
                    return false;
                }
            }
            const fields = fieldsForStep(step);
            const valid = fields.map(validateField).every(Boolean);
            if (!valid) fields.find(field => field.getAttribute('aria-invalid') === 'true')?.focus();
            return valid;
        }

        function setLoading(loading) {
            submitting = loading;
            submitButton.disabled = loading;
            submitButton.classList.toggle('is-loading', loading);
            submitButton.textContent = loading ? 'Registrando pedido' : 'Confirmar pedido';
        }

        function showConfirmation({ orderId, summaryHTML, whatsappURL }) {
            document.querySelector('#checkout-workspace').hidden = true;
            const confirmation = document.querySelector('#checkout-confirmation');
            confirmation.hidden = false;
            document.querySelector('#confirmation-order-id').textContent = orderId;
            document.querySelector('#confirmation-summary').innerHTML = summaryHTML;
            document.querySelector('#confirmation-whatsapp').href = whatsappURL;
            indicators.forEach(indicator => {
                const number = Number(indicator.dataset.stepIndicator);
                indicator.classList.toggle('active', number === 5);
                indicator.classList.toggle('done', number < 5);
            });
            confirmation.focus();
            global.scrollTo({ top: 0, behavior: 'smooth' });
        }

        form.querySelectorAll('[data-checkout-next]').forEach(button => button.addEventListener('click', () => {
            showError('');
            if (validateStep()) showStep(currentStep + 1);
        }));
        form.querySelectorAll('[data-checkout-prev]').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
        fieldsForStep(2).concat(fieldsForStep(3)).forEach(field => {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
        });
        function selectShipping(card) {
            form.querySelectorAll('.shipping-card').forEach(option => option.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input').checked = true;
            const retiro = card.querySelector('input').value === 'retiro';
            const address = form.querySelector('#address-fields');
            address.hidden = retiro;
            address.querySelectorAll('[name=direccion],[name=region],[name=comuna]').forEach(field => {
                field.required = !retiro;
                if (retiro) {
                    field.setAttribute('aria-invalid', 'false');
                    document.getElementById(`${field.id}-error`).textContent = '';
                }
            });
            onShippingChange(Number(card.dataset.shippingCost), retiro);
        }
        form.querySelectorAll('.shipping-card').forEach(card => card.addEventListener('click', () => selectShipping(card)));
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            const error = fileError(file);
            if (!file) setFileState('Aún no seleccionas un archivo.', requiresPrescription);
            else if (error) { fileInput.value = ''; setFileState(error, true); }
            else {
                form.querySelector('#prescription-label').textContent = 'Reemplazar archivo';
                setFileState(`Archivo cargado: ${file.name}`);
            }
        });
        form.addEventListener('submit', event => { if (submitting || !validateStep(4)) event.preventDefault(); });
        selectShipping(form.querySelector('.shipping-card input:checked').closest('.shipping-card'));
        showStep(1);
        return Object.freeze({ validateStep, showError, setLoading, showConfirmation, isSubmitting: () => submitting });
    }

    root.checkoutFlow = Object.freeze({ createController, fileError, validRut });
})(window);
