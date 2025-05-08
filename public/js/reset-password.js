// public/js/reset-password.js
document.addEventListener('DOMContentLoaded', function() {
    // Get configurations from the window object
    const backendUrl = window.appConfig.backendUrl;
    const frontendUrl = window.appConfig.frontendUrl;
    const urlParams = window.appConfig.urlParams;
    const isSetup = window.appConfig.setupMode === 'true';
    
    // Get token from URL
    const token = urlParams.get('token');
    console.log('Token from URL:', token);
    
    // Update page title based on setup flag
    const pageTitle = document.getElementById('pageTitle');
    const submitButton = document.getElementById('submitButton');
    const successMessage = document.getElementById('successMessage');
    
    if (isSetup) {
      pageTitle.textContent = 'Set Your Password';
      submitButton.textContent = 'Set Password';
      successMessage.textContent = 'Your password has been set successfully. You can now login with your new password.';
    }
    
    if (!token) {
      document.getElementById('errorMessage').textContent = 'Invalid or missing reset token. Please request a new password reset link.';
      document.getElementById('errorMessage').style.display = 'block';
      document.getElementById('resetPasswordForm').style.display = 'none';
      return;
    }
    
    // Set the token value in the hidden input field
    document.getElementById('token').value = token;
    
    // Password requirements checking
    const passwordInput = document.getElementById('password');
    const strengthMeter = document.getElementById('passwordStrength');
    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');
    
    passwordInput.addEventListener('input', function() {
      const password = passwordInput.value;
      let strength = 0;
      let feedback = '';
      
      // Check requirements
      const hasLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      
      // Update requirement status
      reqLength.className = hasLength ? 'requirement met' : 'requirement';
      reqUppercase.className = hasUppercase ? 'requirement met' : 'requirement';
      reqLowercase.className = hasLowercase ? 'requirement met' : 'requirement';
      reqNumber.className = hasNumber ? 'requirement met' : 'requirement';
      reqSpecial.className = hasSpecial ? 'requirement met' : 'requirement';
      
      // Calculate strength
      if (hasLength) strength += 1;
      if (hasUppercase) strength += 1;
      if (hasLowercase) strength += 1;
      if (hasNumber) strength += 1;
      if (hasSpecial) strength += 1;
      
      // Display strength feedback
      switch(strength) {
        case 0:
        case 1:
          feedback = '<span style="color: #e74c3c;">Very Weak</span>';
          break;
        case 2:
          feedback = '<span style="color: #e67e22;">Weak</span>';
          break;
        case 3:
          feedback = '<span style="color: #f1c40f;">Moderate</span>';
          break;
        case 4:
          feedback = '<span style="color: #2ecc71;">Strong</span>';
          break;
        case 5:
          feedback = '<span style="color: #27ae60;">Very Strong</span>';
          break;
      }
      
      strengthMeter.innerHTML = 'Password strength: ' + feedback;
    });
    
    // Form validation and submission
    document.getElementById('resetPasswordForm').addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Get form values
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const token = document.getElementById('token').value; // Get token from hidden field
      let isValid = true;
      
      // Debug log
      console.log('Submitting form with token:', token);
      
      // Validate token presence
      if (!token) {
        document.getElementById('errorMessage').textContent = 'Missing security token. Please try accessing this page again from your email link.';
        document.getElementById('errorMessage').style.display = 'block';
        isValid = false;
        return;
      }
      
      // Validate password length
      if (password.length < 8) {
        document.getElementById('passwordError').style.display = 'block';
        isValid = false;
      } else {
        document.getElementById('passwordError').style.display = 'none';
      }
      
      // Validate passwords match
      if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').style.display = 'block';
        isValid = false;
      } else {
        document.getElementById('confirmPasswordError').style.display = 'none';
      }
      
      if (isValid) {
        // Disable submit button to prevent multiple submissions
        document.getElementById('submitButton').disabled = true;
        document.getElementById('submitButton').textContent = 'Processing...';
        
        // Submit form
        fetch(backendUrl + '/api/v1/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: token,
            password: password
          })
        })
        .then(response => response.json())
        .then(data => {
          console.log('Response:', data);
          if (data.message && (data.message.includes('successful') || data.message.includes('success'))) {
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('resetPasswordForm').style.display = 'none';
            document.getElementById('loginLink').style.display = 'block';
          } else {
            document.getElementById('errorMessage').textContent = data.message || 'An error occurred. Please try again.';
            document.getElementById('errorMessage').style.display = 'block';
            // Re-enable submit button
            document.getElementById('submitButton').disabled = false;
            document.getElementById('submitButton').textContent = isSetup ? 'Set Password' : 'Reset Password';
          }
        })
        .catch(error => {
          console.error('Error:', error);
          document.getElementById('errorMessage').textContent = 'An error occurred. Please try again.';
          document.getElementById('errorMessage').style.display = 'block';
          // Re-enable submit button
          document.getElementById('submitButton').disabled = false;
          document.getElementById('submitButton').textContent = isSetup ? 'Set Password' : 'Reset Password';
        });
      }
    });
  });