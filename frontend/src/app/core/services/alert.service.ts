import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  success(title: string, text: string = ''): Promise<any> {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonColor: '#10b981',
      timer: 3000,
      timerProgressBar: true
    });
  }

  error(title: string, text: string = ''): Promise<any> {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#ef4444'
    });
  }

  warning(title: string, text: string = ''): Promise<any> {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#f59e0b'
    });
  }

  info(title: string, text: string = ''): Promise<any> {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#3b82f6'
    });
  }

  async confirm(
    title: string,
    text: string,
    confirmButtonText: string = 'Yes, Proceed',
    confirmButtonColor: string = '#10b981',
    icon: SweetAlertIcon = 'warning'
  ): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancel',
      confirmButtonColor,
      cancelButtonColor: '#6b7280'
    });
    return result.isConfirmed;
  }

  async promptText(
    title: string,
    text: string = '',
    placeholder: string = 'Enter reason...'
  ): Promise<string | null> {
    const result = await Swal.fire({
      title,
      text,
      input: 'textarea',
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Dismiss',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Please provide a valid input';
        }
        return null;
      }
    });

    if (result.isConfirmed && result.value) {
      return result.value;
    }
    return null;
  }

  toastSuccess(title: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }
}
