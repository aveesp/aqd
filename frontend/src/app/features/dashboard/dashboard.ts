import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../core/models/profile.model';
import { NavBar } from '../../shared/components/nav-bar/nav-bar';

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, NavBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);

  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly hasProfile = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editingBio = signal(false);

  readonly createForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dob: ['', Validators.required],
    gender: ['male' as 'male' | 'female', Validators.required],
    bio: [''],
  });

  readonly bioForm = this.fb.nonNullable.group({
    bio: [''],
  });

  ngOnInit(): void {
    this.profileService.getOwn().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.hasProfile.set(true);
        this.bioForm.patchValue({ bio: profile.personal.bio ?? '' });
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.hasProfile.set(false);
        } else {
          this.errorMessage.set('Could not load your profile.');
        }
      },
    });
  }

  createProfile(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.profileService.create({ personal: this.createForm.getRawValue() }).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.hasProfile.set(true);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not create your profile.');
      },
    });
  }

  saveBio(): void {
    this.saving.set(true);
    this.profileService.update({ personal: { bio: this.bioForm.getRawValue().bio } }).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.saving.set(false);
        this.editingBio.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Could not save your bio.');
      },
    });
  }
}
